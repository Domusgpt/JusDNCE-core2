/**
 * VirtualFrameStitcher.ts
 *
 * WebGL-based virtual frame synthesis engine.
 * Generates smooth intermediate frames from discrete sprite sheets
 * using geometric warping, depth simulation, and perceptual blending.
 *
 * Zero AI calls required — all effects computed on GPU.
 */

// ============================================================================
// GLSL SHADERS
// ============================================================================

const VERTEX_SHADER = `
  precision highp float;

  attribute vec2 a_position;
  attribute vec2 a_texCoord;

  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const STITCH_FRAGMENT_SHADER = `
  precision highp float;

  // === FRAME TEXTURES ===
  uniform sampler2D u_frameA;
  uniform sampler2D u_frameB;
  uniform float u_blendT;

  // === STITCH PARAMETERS ===
  uniform float u_featherWidth;
  uniform float u_warpStrength;
  uniform float u_motionShear;
  uniform float u_seamAngle;

  // === PARALLAX ===
  uniform sampler2D u_sdfTexture;
  uniform float u_parallaxOffset;
  uniform bool u_parallaxEnabled;

  // === EFFECTS ===
  uniform float u_grainIntensity;
  uniform float u_vignetteStrength;
  uniform float u_ditherAmount;
  uniform bool u_motionBlurEnabled;
  uniform float u_motionBlurMix;

  // === SHADOW ===
  uniform bool u_shadowEnabled;
  uniform float u_shadowIntensity;
  uniform vec2 u_shadowOffset;

  // === META ===
  uniform float u_time;
  uniform float u_frameIndex;
  uniform vec2 u_resolution;
  uniform sampler2D u_blueNoise;

  varying vec2 v_texCoord;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // 2D Rotation matrix
  mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  // Cylindrical warp - bends UV as if on a cylinder
  vec2 cylindricalWarp(vec2 uv, float strength, float blend) {
    // Center UV
    vec2 centered = uv - 0.5;

    // Apply cylindrical distortion based on blend position
    float warpAmount = strength * (blend - 0.5) * 2.0;
    float xScale = 1.0 + abs(warpAmount) * 0.1;

    // Perspective-like compression at edges
    float edgeFactor = 1.0 - pow(abs(centered.x) * 2.0, 2.0) * 0.15;
    centered.y *= edgeFactor;

    // Horizontal stretch for rotation illusion
    centered.x *= xScale;
    centered.x += warpAmount * 0.05;

    return centered + 0.5;
  }

  // Motion shear - velocity-based distortion
  vec2 motionShear(vec2 uv, float shearAmount, float direction) {
    float shearOffset = (uv.y - 0.5) * shearAmount * direction;
    return vec2(uv.x + shearOffset, uv.y);
  }

  // Blue noise sampling for micro-dither
  float getBlueNoise(vec2 uv) {
    vec2 noiseUV = fract(uv * 4.0 + vec2(u_time * 0.1, u_frameIndex * 0.01));
    return texture2D(u_blueNoise, noiseUV).r;
  }

  // Film grain (fixed seed per frame)
  float filmGrain(vec2 uv) {
    float seed = u_frameIndex * 0.317;
    vec2 p = uv + vec2(seed);
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Vignette effect
  float vignette(vec2 uv) {
    vec2 center = uv - 0.5;
    return 1.0 - dot(center, center) * u_vignetteStrength * 2.0;
  }

  // ============================================================================
  // PARALLAX LAYERS (SDF-based)
  // ============================================================================

  vec4 sampleWithParallax(sampler2D tex, vec2 uv, float depthOffset) {
    if (!u_parallaxEnabled) {
      return texture2D(tex, uv);
    }

    // Sample SDF to determine depth layer
    float sdf = texture2D(u_sdfTexture, uv).r;

    // Three layers: core (0.0), mid (0.4), rim (0.8)
    float layerFactor = 0.0;
    if (sdf < 0.1) {
      layerFactor = 0.8;  // Rim
    } else if (sdf < 0.3) {
      layerFactor = 0.4;  // Mid
    }

    // Apply parallax offset
    vec2 parallaxUV = uv;
    parallaxUV.x += depthOffset * layerFactor * 0.003;

    return texture2D(tex, parallaxUV);
  }

  // ============================================================================
  // RIM EXTRUSION
  // ============================================================================

  vec4 rimExtrusion(sampler2D tex, vec2 uv, float motionDir) {
    vec4 core = texture2D(tex, uv);

    // Sample offset for rim
    vec2 rimOffset = vec2(-motionDir * 0.003, 0.0);
    vec4 rim = texture2D(tex, uv + rimOffset);
    rim.rgb *= 0.3; // Darken rim

    // Composite: rim behind core
    vec4 result = rim;
    result = mix(rim, core, core.a);
    result.a = max(core.a, rim.a * 0.5);

    return result;
  }

  // ============================================================================
  // SHADOW PROJECTION
  // ============================================================================

  vec4 getShadow(sampler2D tex, vec2 uv) {
    if (!u_shadowEnabled) {
      return vec4(0.0);
    }

    // Skew transform for ground projection
    vec2 shadowUV = uv;
    shadowUV.y = 1.0 - (1.0 - uv.y) * 0.4;  // Compress vertically
    shadowUV.x += (1.0 - uv.y) * 0.2;        // Skew

    // Apply offset
    shadowUV += u_shadowOffset;

    // Blur approximation (5-tap)
    vec4 shadow = vec4(0.0);
    float blurSize = 0.01;
    shadow += texture2D(tex, shadowUV) * 0.3;
    shadow += texture2D(tex, shadowUV + vec2(blurSize, 0.0)) * 0.175;
    shadow += texture2D(tex, shadowUV - vec2(blurSize, 0.0)) * 0.175;
    shadow += texture2D(tex, shadowUV + vec2(0.0, blurSize)) * 0.175;
    shadow += texture2D(tex, shadowUV - vec2(0.0, blurSize)) * 0.175;

    // Convert to shadow
    shadow.rgb = vec3(0.0);
    shadow.a *= u_shadowIntensity;

    return shadow;
  }

  // ============================================================================
  // MAIN STITCH FUNCTION
  // ============================================================================

  void main() {
    vec2 uv = v_texCoord;

    // === MICRO-DITHER ===
    float dither = (getBlueNoise(uv) - 0.5) * u_ditherAmount;

    // === SEAM ROTATION ===
    vec2 seamUV = uv;
    if (u_seamAngle != 0.0) {
      seamUV = (rotate2D(u_seamAngle) * (uv - 0.5)) + 0.5;
    }

    // === FEATHERED BLEND MASK ===
    float seamPos = 0.5 + dither;
    float blendMask = smoothstep(
      seamPos - u_featherWidth,
      seamPos + u_featherWidth,
      seamUV.x
    );

    // Adjust mask based on blend factor
    blendMask = mix(0.0, blendMask, u_blendT * 2.0);
    if (u_blendT > 0.5) {
      blendMask = mix(blendMask, 1.0, (u_blendT - 0.5) * 2.0);
    }

    // === CYLINDRICAL WARP ===
    vec2 uvA = cylindricalWarp(uv, u_warpStrength, 0.0);
    vec2 uvB = cylindricalWarp(uv, u_warpStrength, 1.0);

    // === MOTION SHEAR ===
    float shearDir = u_blendT * 2.0 - 1.0; // -1 to 1
    uvA = motionShear(uvA, u_motionShear * (1.0 - u_blendT), shearDir);
    uvB = motionShear(uvB, u_motionShear * u_blendT, shearDir);

    // === SAMPLE FRAMES ===
    vec4 colorA = sampleWithParallax(u_frameA, uvA, -u_parallaxOffset);
    vec4 colorB = sampleWithParallax(u_frameB, uvB, u_parallaxOffset);

    // === RIM EXTRUSION ===
    colorA = rimExtrusion(u_frameA, uvA, -shearDir);
    colorB = rimExtrusion(u_frameB, uvB, shearDir);

    // === BLEND FRAMES ===
    vec4 stitched = mix(colorA, colorB, blendMask);

    // === MOTION BLUR (optional second sample) ===
    if (u_motionBlurEnabled) {
      float blurT = clamp(u_blendT + 0.12, 0.0, 1.0);
      float blurMask = smoothstep(
        seamPos - u_featherWidth,
        seamPos + u_featherWidth,
        seamUV.x
      );
      blurMask = mix(0.0, blurMask, blurT * 2.0);
      if (blurT > 0.5) {
        blurMask = mix(blurMask, 1.0, (blurT - 0.5) * 2.0);
      }

      vec4 blurColorA = texture2D(u_frameA, uvA);
      vec4 blurColorB = texture2D(u_frameB, uvB);
      vec4 blurFrame = mix(blurColorA, blurColorB, blurMask);

      // Gamma-correct blend
      stitched.rgb = pow(stitched.rgb, vec3(2.2));
      blurFrame.rgb = pow(blurFrame.rgb, vec3(2.2));
      stitched.rgb = mix(stitched.rgb, blurFrame.rgb, u_motionBlurMix);
      stitched.rgb = pow(stitched.rgb, vec3(1.0 / 2.2));
    }

    // === SHADOW ===
    vec4 shadow = getShadow(u_frameA, uv);

    // === FILM GRAIN ===
    float grain = (filmGrain(uv) - 0.5) * u_grainIntensity;
    stitched.rgb += grain;

    // === VIGNETTE ===
    stitched.rgb *= vignette(uv);

    // === COMPOSITE ===
    // Shadow behind character
    vec4 final = shadow;
    final = mix(final, stitched, stitched.a);
    final.a = max(stitched.a, shadow.a);

    gl_FragColor = final;
  }
`;

// ============================================================================
// ZOOM SHADER (Mipmap sampling with unsharp mask)
// ============================================================================

const ZOOM_FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D u_texture;
  uniform vec4 u_cropRect;      // x, y, w, h in UV space
  uniform float u_zoom;
  uniform bool u_sharpenEnabled;
  uniform float u_sharpenAmount;
  uniform float u_sharpenRadius;
  uniform vec2 u_resolution;

  varying vec2 v_texCoord;

  void main() {
    // Map output UV to crop rect
    vec2 uv = u_cropRect.xy + v_texCoord * u_cropRect.zw;

    vec4 color = texture2D(u_texture, uv);

    // Unsharp mask when zoomed > 1.25x
    if (u_sharpenEnabled && u_zoom > 1.25) {
      vec2 texelSize = u_sharpenRadius / u_resolution;

      vec4 blur = vec4(0.0);
      blur += texture2D(u_texture, uv + vec2(-texelSize.x, -texelSize.y)) * 0.0625;
      blur += texture2D(u_texture, uv + vec2(0.0, -texelSize.y)) * 0.125;
      blur += texture2D(u_texture, uv + vec2(texelSize.x, -texelSize.y)) * 0.0625;
      blur += texture2D(u_texture, uv + vec2(-texelSize.x, 0.0)) * 0.125;
      blur += texture2D(u_texture, uv) * 0.25;
      blur += texture2D(u_texture, uv + vec2(texelSize.x, 0.0)) * 0.125;
      blur += texture2D(u_texture, uv + vec2(-texelSize.x, texelSize.y)) * 0.0625;
      blur += texture2D(u_texture, uv + vec2(0.0, texelSize.y)) * 0.125;
      blur += texture2D(u_texture, uv + vec2(texelSize.x, texelSize.y)) * 0.0625;

      // Unsharp: original + (original - blur) * amount
      color.rgb = color.rgb + (color.rgb - blur.rgb) * u_sharpenAmount;
    }

    gl_FragColor = color;
  }
`;

// ============================================================================
// SDF GENERATION SHADER (for parallax preprocessing)
// ============================================================================

const SDF_FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D u_alphaTexture;
  uniform vec2 u_resolution;
  uniform float u_maxDistance;

  varying vec2 v_texCoord;

  void main() {
    float minDist = u_maxDistance;
    float alpha = texture2D(u_alphaTexture, v_texCoord).a;

    // If inside shape, find distance to edge
    // If outside shape, find distance to nearest opaque pixel
    float sign = alpha > 0.5 ? 1.0 : -1.0;

    // Brute force search (for GPU, this is actually fast)
    // In production, use jump flooding algorithm
    for (float dy = -32.0; dy <= 32.0; dy += 1.0) {
      for (float dx = -32.0; dx <= 32.0; dx += 1.0) {
        vec2 offset = vec2(dx, dy) / u_resolution;
        vec2 sampleUV = v_texCoord + offset;

        if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 &&
            sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
          float sampleAlpha = texture2D(u_alphaTexture, sampleUV).a;

          // Found edge transition
          if ((alpha > 0.5) != (sampleAlpha > 0.5)) {
            float dist = length(vec2(dx, dy));
            minDist = min(minDist, dist);
          }
        }
      }
    }

    // Normalize to 0-1 range
    float normalizedDist = minDist / u_maxDistance;

    // Store signed distance (inside positive, outside negative)
    float sdf = normalizedDist * sign * 0.5 + 0.5;

    gl_FragColor = vec4(sdf, sdf, sdf, 1.0);
  }
`;

// ============================================================================
// TYPES
// ============================================================================

export interface StitchParams {
  blendT: number;             // 0-1 blend factor
  featherWidth: number;       // UV units (0.02 ≈ 12px at 584)
  warpStrength: number;       // 0-1
  motionShear: number;        // 0-0.15
  seamAngle: number;          // radians

  parallaxEnabled: boolean;
  parallaxOffset: number;     // degrees of rotation delta

  grainIntensity: number;     // 0-0.1
  vignetteStrength: number;   // 0-1
  ditherAmount: number;       // 0-0.005

  motionBlurEnabled: boolean;
  motionBlurMix: number;      // 0-0.5

  shadowEnabled: boolean;
  shadowIntensity: number;    // 0-0.5
  shadowOffset: [number, number];
}

export interface ZoomParams {
  cropRect: { x: number; y: number; w: number; h: number };
  sharpenEnabled: boolean;
  sharpenAmount: number;      // 0.3-0.7
  sharpenRadius: number;      // 1-3 pixels
}

export interface VirtualFrameStitcherConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

// ============================================================================
// VIRTUAL FRAME STITCHER CLASS
// ============================================================================

export class VirtualFrameStitcher {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;

  // Shader programs
  private stitchProgram: WebGLProgram | null = null;
  private zoomProgram: WebGLProgram | null = null;
  private sdfProgram: WebGLProgram | null = null;

  // Buffers
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  // Textures
  private frameTextures: Map<string, WebGLTexture> = new Map();
  private sdfTextures: Map<string, WebGLTexture> = new Map();
  private blueNoiseTexture: WebGLTexture | null = null;

  // Framebuffers for multi-pass
  private tempFramebuffer: WebGLFramebuffer | null = null;
  private tempTexture: WebGLTexture | null = null;

  // State
  private width: number;
  private height: number;
  private time: number = 0;
  private frameIndex: number = 0;

  constructor(config: VirtualFrameStitcherConfig) {
    this.canvas = config.canvas;
    this.width = config.width;
    this.height = config.height;

    const gl = config.canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initialize(): void {
    const gl = this.gl;

    // Compile shaders
    this.stitchProgram = this.createProgram(VERTEX_SHADER, STITCH_FRAGMENT_SHADER);
    this.zoomProgram = this.createProgram(VERTEX_SHADER, ZOOM_FRAGMENT_SHADER);
    this.sdfProgram = this.createProgram(VERTEX_SHADER, SDF_FRAGMENT_SHADER);

    // Create geometry (fullscreen quad)
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1, 1,   1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]), gl.STATIC_DRAW);

    // Create blue noise texture
    this.blueNoiseTexture = this.createBlueNoiseTexture();

    // Create temp framebuffer for multi-pass
    this.createTempFramebuffer();

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;

    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, vertSrc);
    gl.compileShader(vertShader);

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Vertex shader error: ' + gl.getShaderInfoLog(vertShader));
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, fragSrc);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Fragment shader error: ' + gl.getShaderInfoLog(fragShader));
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }

    return program;
  }

  private createBlueNoiseTexture(): WebGLTexture {
    const gl = this.gl;
    const size = 64;
    const data = new Uint8Array(size * size * 4);

    // Generate blue noise pattern (simplified - use real blue noise in production)
    for (let i = 0; i < size * size; i++) {
      const x = i % size;
      const y = Math.floor(i / size);
      // Approximate blue noise using golden ratio hash
      const phi = 1.618033988749895;
      const noise = ((x * phi + y * phi * phi) % 1) * 255;
      data[i * 4] = noise;
      data[i * 4 + 1] = noise;
      data[i * 4 + 2] = noise;
      data[i * 4 + 3] = 255;
    }

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }

  private createTempFramebuffer(): void {
    const gl = this.gl;

    this.tempFramebuffer = gl.createFramebuffer()!;
    this.tempTexture = gl.createTexture()!;

    gl.bindTexture(gl.TEXTURE_2D, this.tempTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tempFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tempTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ============================================================================
  // TEXTURE MANAGEMENT
  // ============================================================================

  /**
   * Load a frame image into a WebGL texture
   */
  loadFrame(id: string, image: HTMLImageElement | HTMLCanvasElement): void {
    const gl = this.gl;
    const texture = gl.createTexture()!;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Generate mipmaps for zoom
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.frameTextures.set(id, texture);
  }

  /**
   * Generate SDF texture for a frame (for parallax)
   */
  generateSDF(frameId: string): void {
    const gl = this.gl;
    const frameTexture = this.frameTextures.get(frameId);
    if (!frameTexture) return;

    // Render SDF to temp framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tempFramebuffer);
    gl.viewport(0, 0, this.width, this.height);

    gl.useProgram(this.sdfProgram);

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(this.sdfProgram!, 'u_alphaTexture'), 0);
    gl.uniform2f(gl.getUniformLocation(this.sdfProgram!, 'u_resolution'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.sdfProgram!, 'u_maxDistance'), 32.0);

    // Bind frame texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    // Draw
    this.drawQuad(this.sdfProgram!);

    // Read back and store as SDF texture
    const sdfTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, sdfTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.width, this.height, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.sdfTextures.set(frameId, sdfTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Unload a frame texture to free memory
   */
  unloadFrame(id: string): void {
    const gl = this.gl;
    const texture = this.frameTextures.get(id);
    if (texture) {
      gl.deleteTexture(texture);
      this.frameTextures.delete(id);
    }
    const sdfTexture = this.sdfTextures.get(id);
    if (sdfTexture) {
      gl.deleteTexture(sdfTexture);
      this.sdfTextures.delete(id);
    }
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  /**
   * Stitch two frames together with all virtual frame effects
   */
  stitch(frameIdA: string, frameIdB: string, params: StitchParams): void {
    const gl = this.gl;
    const program = this.stitchProgram!;

    const textureA = this.frameTextures.get(frameIdA);
    const textureB = this.frameTextures.get(frameIdB);

    if (!textureA || !textureB) {
      console.warn('Missing textures for stitch:', frameIdA, frameIdB);
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // === SET UNIFORMS ===

    // Frame textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureA);
    gl.uniform1i(gl.getUniformLocation(program, 'u_frameA'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureB);
    gl.uniform1i(gl.getUniformLocation(program, 'u_frameB'), 1);

    // Blue noise
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.blueNoiseTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_blueNoise'), 2);

    // SDF texture (use A's if available)
    const sdfTexture = this.sdfTextures.get(frameIdA);
    if (sdfTexture && params.parallaxEnabled) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, sdfTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'u_sdfTexture'), 3);
    }

    // Stitch parameters
    gl.uniform1f(gl.getUniformLocation(program, 'u_blendT'), params.blendT);
    gl.uniform1f(gl.getUniformLocation(program, 'u_featherWidth'), params.featherWidth);
    gl.uniform1f(gl.getUniformLocation(program, 'u_warpStrength'), params.warpStrength);
    gl.uniform1f(gl.getUniformLocation(program, 'u_motionShear'), params.motionShear);
    gl.uniform1f(gl.getUniformLocation(program, 'u_seamAngle'), params.seamAngle);

    // Parallax
    gl.uniform1i(gl.getUniformLocation(program, 'u_parallaxEnabled'), params.parallaxEnabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_parallaxOffset'), params.parallaxOffset);

    // Effects
    gl.uniform1f(gl.getUniformLocation(program, 'u_grainIntensity'), params.grainIntensity);
    gl.uniform1f(gl.getUniformLocation(program, 'u_vignetteStrength'), params.vignetteStrength);
    gl.uniform1f(gl.getUniformLocation(program, 'u_ditherAmount'), params.ditherAmount);
    gl.uniform1i(gl.getUniformLocation(program, 'u_motionBlurEnabled'), params.motionBlurEnabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_motionBlurMix'), params.motionBlurMix);

    // Shadow
    gl.uniform1i(gl.getUniformLocation(program, 'u_shadowEnabled'), params.shadowEnabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shadowIntensity'), params.shadowIntensity);
    gl.uniform2f(gl.getUniformLocation(program, 'u_shadowOffset'), params.shadowOffset[0], params.shadowOffset[1]);

    // Meta
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), this.time);
    gl.uniform1f(gl.getUniformLocation(program, 'u_frameIndex'), this.frameIndex);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

    // Draw
    this.drawQuad(program);

    this.time += 0.016; // ~60fps increment
    this.frameIndex++;
  }

  /**
   * Render with zoom (crop and sharpen)
   */
  renderZoom(frameId: string, params: ZoomParams): void {
    const gl = this.gl;
    const program = this.zoomProgram!;

    const texture = this.frameTextures.get(frameId);
    if (!texture) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

    // Zoom params
    gl.uniform4f(
      gl.getUniformLocation(program, 'u_cropRect'),
      params.cropRect.x,
      params.cropRect.y,
      params.cropRect.w,
      params.cropRect.h
    );
    gl.uniform1f(gl.getUniformLocation(program, 'u_zoom'), 1.0 / params.cropRect.w);
    gl.uniform1i(gl.getUniformLocation(program, 'u_sharpenEnabled'), params.sharpenEnabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_sharpenAmount'), params.sharpenAmount);
    gl.uniform1f(gl.getUniformLocation(program, 'u_sharpenRadius'), params.sharpenRadius);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

    this.drawQuad(program);
  }

  private drawQuad(program: WebGLProgram): void {
    const gl = this.gl;

    // Position attribute
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // TexCoord attribute
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get default stitch parameters
   */
  static getDefaultParams(): StitchParams {
    return {
      blendT: 0.5,
      featherWidth: 0.02,      // ~12px at 584
      warpStrength: 0.5,
      motionShear: 0.08,
      seamAngle: 0,

      parallaxEnabled: true,
      parallaxOffset: 0,

      grainIntensity: 0.03,
      vignetteStrength: 0.2,
      ditherAmount: 0.002,

      motionBlurEnabled: true,
      motionBlurMix: 0.3,

      shadowEnabled: true,
      shadowIntensity: 0.4,
      shadowOffset: [0.003, -0.05],
    };
  }

  /**
   * Get default zoom parameters
   */
  static getDefaultZoomParams(): ZoomParams {
    return {
      cropRect: { x: 0, y: 0, w: 1, h: 1 },
      sharpenEnabled: true,
      sharpenAmount: 0.5,
      sharpenRadius: 1.5,
    };
  }

  /**
   * Resize the output canvas
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    // Recreate temp framebuffer at new size
    if (this.tempTexture) {
      this.gl.deleteTexture(this.tempTexture);
    }
    if (this.tempFramebuffer) {
      this.gl.deleteFramebuffer(this.tempFramebuffer);
    }
    this.createTempFramebuffer();
  }

  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this.gl;

    // Delete textures
    this.frameTextures.forEach(tex => gl.deleteTexture(tex));
    this.sdfTextures.forEach(tex => gl.deleteTexture(tex));
    if (this.blueNoiseTexture) gl.deleteTexture(this.blueNoiseTexture);
    if (this.tempTexture) gl.deleteTexture(this.tempTexture);

    // Delete buffers
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);

    // Delete framebuffers
    if (this.tempFramebuffer) gl.deleteFramebuffer(this.tempFramebuffer);

    // Delete programs
    if (this.stitchProgram) gl.deleteProgram(this.stitchProgram);
    if (this.zoomProgram) gl.deleteProgram(this.zoomProgram);
    if (this.sdfProgram) gl.deleteProgram(this.sdfProgram);
  }
}

export default VirtualFrameStitcher;
