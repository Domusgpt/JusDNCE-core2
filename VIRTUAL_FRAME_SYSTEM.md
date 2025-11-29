# Virtual Frame Animation System

> **Zero-AI Motion & Detail Tricks** — Maximum smoothness and features without extra generation time or cost.

This system expands jusDNCE beyond audio-reactive dancing into a complete animation toolkit that works with any sprite sheet (4×3, 6×4, etc.) and enables smooth, professional motion from minimal generated frames.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [System Architecture](#system-architecture)
3. [Virtual Frame Techniques](#virtual-frame-techniques)
4. [Shader API Reference](#shader-api-reference)
5. [Runtime Configuration](#runtime-configuration)
6. [Integration Guide](#integration-guide)

---

## Core Philosophy

### The Problem
AI generates discrete frames (12, 24, 36). Smooth animation requires continuous motion. Traditional interpolation looks robotic.

### The Solution
**Virtual Frames** — Synthesized intermediate frames using geometric warping, perceptual blending, and depth simulation. Zero additional AI calls.

### Design Principles
1. **Batch First**: All frames in sprite sheet format (4×3 grid = 12 frames)
2. **Parallel Process**: Independent operations run concurrently (WebGL, WASM)
3. **Perceptual Over Physical**: Tricks that "feel right" > mathematically accurate
4. **Progressive Enhancement**: Graceful degradation on low-end devices

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VIRTUAL FRAME PIPELINE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Sprite Sheet │───▶│ Frame Atlas  │───▶│ Mipmap Pyramid       │  │
│  │ (4×3 grid)   │    │ (Individual) │    │ (Multi-resolution)   │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│         │                   │                      │                │
│         ▼                   ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WASM PREPROCESSING                        │   │
│  │  • SDF Generation (Signed Distance Field from alpha)         │   │
│  │  • Centroid Calculation (for stable anchoring)               │   │
│  │  • Matte Normalization (consistent alpha edges)              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WebGL/WebGPU STITCHER                     │   │
│  │  • Cylindrical Warp (rotation synthesis)                     │   │
│  │  • Feathered Seam (smooth blend)                             │   │
│  │  • Motion Shear (velocity-based distortion)                  │   │
│  │  • Parallax Layers (SDF-based depth)                         │   │
│  │  • Shadow Projection (ground plane)                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    POST-PROCESSING                           │   │
│  │  • Temporal Micro-Dither (anti-aliasing)                     │   │
│  │  • Perceptual Motion Blur (ghosting)                         │   │
│  │  • Film Grain (detail enhancement)                           │   │
│  │  • Chromatic Aberration (style)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│                      [ RENDERED FRAME ]                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Virtual Frame Techniques

### 1. Phase Synthesis (Between-Angles)

Generates smooth rotation between discrete sprite frames using cylindrical warping.

**Concept**: Given frames at 0°, 30°, 60°... we can synthesize any intermediate angle (e.g., 17°) by warping and blending adjacent frames.

```typescript
// Input: theta (0-360), sprite frames array
const step = 360 / N;              // N = 12 for 4×3 sheet
const i = Math.floor(theta / step);
const t = (theta / step) - i;      // Fractional position 0..1

// Output: virtual frame at exact angle
const V = stitch(frames[i], frames[(i + 1) % N], t, {
  feather: 10,
  warpDeg: t * step,
  motionShear: 0.08
});
```

**Parameters**:
| Name | Type | Range | Description |
|------|------|-------|-------------|
| `feather` | px | 8-16 | Seam blend width |
| `warpDeg` | deg | 0-30 | Cylindrical warp amount |
| `motionShear` | float | 0-0.15 | Velocity distortion |

---

### 2. Zoom-Layer (Mipmap Crop)

Enables smooth zoom/pan on sprite cells without pixelation.

**Concept**: Pre-generate mipmap pyramid; animate crop rectangle; sample appropriate level.

```typescript
interface CropRect {
  x: number;      // 0..1 normalized
  y: number;      // 0..1 normalized
  w: number;      // Width (1.0 = full frame)
  h: number;      // Height
}

function renderZoom(tex: WebGLTexture[], cropRect: CropRect, outputSize: Vec2) {
  const zoom = 1.0 / cropRect.w;
  const level = pickMipLevel(outputSize, cropRect.w);

  drawSubImage(tex[level], cropRect, outputRect);

  // Sharpen when zoomed beyond 1.25x
  if (zoom > 1.25) {
    applyUnsharpMask(output, { amount: 0.5, radius: 1.5 });
  }
}
```

**Mipmap Strategy**:
- Level 0: Full resolution (584×584 typical)
- Level 1: 50% (292×292)
- Level 2: 25% (146×146)
- Level 3: 12.5% (73×73) — minimum useful

---

### 3. Faux Parallax (SDF Depth Layers)

Creates depth illusion from flat sprites using Signed Distance Fields.

**Concept**: Build SDF from alpha mask → threshold into layers → offset layers on rotation.

```typescript
// WASM: Build SDF once per frame (fast, ~2ms at 584px)
const sdf = buildSignedDistanceField(alphaChannel);

// Layer thresholds (pixels from edge)
const layers = [
  { name: 'rim',  threshold: 4,  parallaxFactor: 0.8 },
  { name: 'mid',  threshold: 12, parallaxFactor: 0.4 },
  { name: 'core', threshold: 24, parallaxFactor: 0.0 }
];

// Shader: Offset each layer based on rotation delta
function getParallaxOffset(layer: Layer, deltaTheta: number): Vec2 {
  const k = 0.8; // px per degree at 584w
  return {
    x: k * deltaTheta * layer.parallaxFactor,
    y: 0
  };
}
```

---

### 4. Rim Extrusion (Contour Parallax)

Simpler alternative to SDF parallax — no preprocessing required.

**Concept**: Duplicate sprite, dilate alpha, darken, offset opposite to motion.

```glsl
// Fragment shader
vec4 rimExtrusion(sampler2D tex, vec2 uv, vec2 motionDir) {
  vec4 core = texture2D(tex, uv);

  // Dilated rim (offset sample + expand)
  vec2 rimOffset = -motionDir * 0.003; // ~2px at 584
  vec4 rim = texture2D(tex, uv + rimOffset);
  rim.rgb *= 0.3; // Darken

  // Composite: rim behind core
  return mix(rim, core, core.a);
}
```

---

### 5. Direction-Aware Seam

Rotates the blend seam to match motion direction (not just horizontal).

**Concept**: Seam normal follows motion vector for diagonal/vertical movement.

```typescript
// Calculate seam angle from motion
const seamAngle = Math.atan2(deltaPitch, deltaYaw);

// Pass to shader
uniform float u_seamAngle;

// In fragment: rotate UV space before blend calculation
vec2 rotatedUV = rotate2D(uv - 0.5, u_seamAngle) + 0.5;
float blendMask = smoothstep(0.5 - feather, 0.5 + feather, rotatedUV.x);
```

---

### 6. Temporal Micro-Dither

Adds sub-pixel noise to hide seams and low-resolution artifacts.

**Concept**: Blue noise jitter on seam position and warp parameters.

```glsl
uniform sampler2D u_blueNoise;
uniform float u_time;

float getMicroDither(vec2 uv) {
  // Sample blue noise, offset by time for temporal variation
  vec2 noiseUV = uv * 4.0 + vec2(u_time * 0.1, 0.0);
  float noise = texture2D(u_blueNoise, noiseUV).r;
  return (noise - 0.5) * 0.002; // ±0.5px at 584w
}

// Apply to seam position
float seamPos = 0.5 + getMicroDither(uv);
```

---

### 7. Perceptual Motion Blur

Cheap motion blur using multi-sample blend.

**Concept**: Sample stitch at `t ± ε`, blend with gamma correction.

```typescript
function renderWithMotionBlur(frames: Frame[], t: number): ImageData {
  const epsilon = 0.12;
  const primary = stitch(frames, t);
  const secondary = stitch(frames, clamp(t + epsilon, 0, 1));

  // Gamma-correct blend (perceptually uniform)
  return gammaBlend(primary, secondary, 0.3, 2.2);
}

function gammaBlend(a: ImageData, b: ImageData, mixFactor: number, gamma: number): ImageData {
  // Convert to linear, blend, convert back
  const aLinear = toLinear(a, gamma);
  const bLinear = toLinear(b, gamma);
  const blended = lerp(aLinear, bLinear, mixFactor);
  return toGamma(blended, gamma);
}
```

---

### 8. Consistent Soft Shadow

Projects alpha to ground plane with perspective-correct blur.

```glsl
vec4 renderShadow(sampler2D tex, vec2 uv, float yaw) {
  // Skew transform for ground projection
  vec2 shadowUV = uv;
  shadowUV.y = 1.0 - (1.0 - uv.y) * 0.4; // Compress vertically
  shadowUV.x += (1.0 - uv.y) * 0.2;       // Skew

  // Lateral shift with yaw (1-2px at 584w)
  shadowUV.x += yaw * 0.003;

  // Sample and blur
  vec4 shadow = blur(tex, shadowUV, 8.0);
  shadow.rgb = vec3(0.0);
  shadow.a *= 0.4; // Consistent intensity

  return shadow;
}
```

---

### 9. Low-Res Sweeteners

Film grain, vignette, and specular highlights to enhance low-resolution sprites.

```glsl
// Film grain (fixed seed per frame index)
float grain(vec2 uv, float frameIndex) {
  float seed = frameIndex * 0.1;
  return fract(sin(dot(uv + seed, vec2(12.9898, 78.233))) * 43758.5453);
}

// Vignette
float vignette(vec2 uv, float intensity) {
  vec2 center = uv - 0.5;
  return 1.0 - dot(center, center) * intensity;
}

// Specular kick (additive highlight)
vec3 specularKick(vec2 uv, vec2 lightDir, float intensity) {
  float spec = max(0.0, dot(normalize(uv - 0.5), lightDir));
  spec = pow(spec, 8.0);
  return vec3(1.0) * spec * intensity;
}
```

---

### 10. Multi-Sheet Interleave

When using 2-3 sprite sheets (24/36 frames), interleave for smoother transitions.

```typescript
// 3 sheets × 12 frames = 36 total
// Interleave: A0, B0, C0, A1, B1, C1, ...
function interleaveFrames(sheets: Frame[][]): Frame[] {
  const result: Frame[] = [];
  const framesPerSheet = sheets[0].length;

  for (let i = 0; i < framesPerSheet; i++) {
    for (const sheet of sheets) {
      result.push(sheet[i]);
    }
  }
  return result;
}

// Weaker warp needed (frame delta is smaller)
const warpStrength = baseWarp / sheets.length;
```

---

## Shader API Reference

### Uniforms

```glsl
// === FRAME DATA ===
uniform sampler2D u_frameA;        // Current frame texture
uniform sampler2D u_frameB;        // Next frame texture
uniform float u_blendT;            // Blend factor 0..1

// === STITCH PARAMETERS ===
uniform float u_featherWidth;      // Seam feather in UV (0.02 = 12px at 584)
uniform float u_warpStrength;      // Cylindrical warp (0..1)
uniform float u_motionShear;       // Velocity shear (0..0.15)
uniform float u_seamAngle;         // Seam rotation in radians

// === PARALLAX ===
uniform float u_parallaxOffset;    // Layer offset (px)
uniform sampler2D u_sdfTexture;    // Signed distance field

// === EFFECTS ===
uniform float u_grainIntensity;    // Film grain (0..0.1)
uniform float u_vignetteStrength;  // Edge darkening (0..1)
uniform float u_ditherAmount;      // Micro-dither (0..0.005)
uniform float u_motionBlurMix;     // Blur blend (0..0.5)

// === SHADOW ===
uniform float u_shadowIntensity;   // Shadow opacity (0..0.5)
uniform float u_shadowBlur;        // Shadow blur radius (0..16)
uniform vec2 u_shadowOffset;       // Shadow position offset

// === META ===
uniform float u_time;              // Animation time
uniform float u_frameIndex;        // Current frame number
uniform vec2 u_resolution;         // Output size
uniform sampler2D u_blueNoise;     // Dither noise texture
```

### Samplers

```glsl
// Required textures
sampler2D u_frameAtlas;     // All frames in grid (4×3)
sampler2D u_sdfAtlas;       // Precomputed SDF per frame
sampler2D u_blueNoise;      // 64×64 blue noise tile

// Optional
sampler2D u_mipmapLevel1;   // 50% resolution
sampler2D u_mipmapLevel2;   // 25% resolution
```

---

## Runtime Configuration

### Constants Block (Add to `constants.ts`)

```typescript
export const VIRTUAL_FRAME_CONFIG = {
  // === PHASE SYNTHESIS ===
  phaseSynthesis: {
    featherPx: 10,           // 8-12 at 584w
    warpMultiplier: 1.0,     // warpDeg = t * stepDeg * this
    motionShear: 0.08,       // 0.06-0.12
    maxWarpDeg: 6,           // Stability clamp
  },

  // === PARALLAX ===
  parallax: {
    enabled: true,
    layers: [
      { name: 'core', threshold: 24, factor: 0.0 },
      { name: 'mid',  threshold: 12, factor: 0.4 },
      { name: 'rim',  threshold: 4,  factor: 0.8 },
    ],
    pxPerDegree: 0.8,        // At 584w
  },

  // === ZOOM ===
  zoom: {
    maxZoom: 3.0,
    sharpenThreshold: 1.25,
    unsharpAmount: 0.5,
    unsharpRadius: 1.5,
  },

  // === MOTION BLUR ===
  motionBlur: {
    enabled: true,
    epsilon: 0.12,
    mixFactor: 0.3,
    gamma: 2.2,
  },

  // === SHADOW ===
  shadow: {
    enabled: true,
    opacity: 0.4,
    blurRadius: 8,
    yawShiftPx: 2,
    verticalCompression: 0.4,
    skewFactor: 0.2,
  },

  // === SWEETENERS ===
  sweeteners: {
    grain: {
      enabled: true,
      intensity: 0.03,
      fixedSeed: true,     // Per frame, not per pixel
    },
    vignette: {
      enabled: true,
      intensity: 0.2,
    },
    specularKick: {
      enabled: false,
      intensity: 0.1,
      lightDir: [0.5, 0.5],
    },
  },

  // === DITHER ===
  microDither: {
    enabled: true,
    amount: 0.002,         // ±0.5px at 584w
    blueNoiseSize: 64,
  },

  // === MULTI-SHEET ===
  multiSheet: {
    warpReductionFactor: 0.5, // Weaker warp when interleaved
  },
} as const;

export type VirtualFrameConfig = typeof VIRTUAL_FRAME_CONFIG;
```

### Manifest Entry (for project files)

```typescript
interface ProjectManifest {
  // ... existing fields ...

  virtualFrameSettings?: {
    phaseSynthesis: {
      featherPx: number;
      motionShear: number;
    };
    parallax: {
      enabled: boolean;
      intensity: number; // 0-1 multiplier
    };
    shadow: {
      enabled: boolean;
      intensity: number;
    };
    sweeteners: {
      grain: number;     // 0-0.1
      vignette: number;  // 0-1
    };
  };
}
```

---

## Integration Guide

### Step 1: Add to Existing Pipeline

```typescript
// In Step4Preview.tsx, replace direct frame rendering with:
import { VirtualFrameRenderer } from './VirtualFrame/VirtualFrameRenderer';

const renderer = useRef<VirtualFrameRenderer>();

useEffect(() => {
  renderer.current = new VirtualFrameRenderer(canvasRef.current, {
    config: VIRTUAL_FRAME_CONFIG,
    frames: generatedFrames,
  });
}, [generatedFrames]);

// In animation loop:
function renderFrame(theta: number, deltaTheta: number) {
  renderer.current.render({
    angle: theta,
    angleDelta: deltaTheta,
    zoom: currentZoom,
    pan: currentPan,
  });
}
```

### Step 2: Enable Interactive Controls

```typescript
// Expose tuning UI
const [config, setConfig] = useState(VIRTUAL_FRAME_CONFIG);

<VirtualFrameControls
  config={config}
  onChange={setConfig}
  onReset={() => setConfig(VIRTUAL_FRAME_CONFIG)}
/>
```

### Step 3: Audio Integration

```typescript
// Map audio features to virtual frame parameters
function updateFromAudio(bass: number, mid: number, high: number) {
  renderer.current.setParams({
    motionShear: 0.06 + high * 0.06,      // More shear on high freq
    grainIntensity: 0.02 + bass * 0.03,   // More grain on bass
    parallaxIntensity: 0.5 + mid * 0.5,   // Parallax on mid
  });
}
```

---

## Audit: Virtual Frame Usage Matrix

| Technique | Audio-Dance | Character Spin | Text/Logo | Product 360° |
|-----------|-------------|----------------|-----------|--------------|
| Phase Synthesis | ✅ | ✅ | ✅ | ✅ |
| Zoom/Pan | ⚡ Impact | ⚡ Emphasis | ✅ | ✅ |
| Parallax | ✅ | ✅ | ❌ (flat) | ⚡ Subtle |
| Rim Extrusion | ✅ | ✅ | ✅ | ✅ |
| Motion Blur | ✅ | ⚡ Fast spin | ❌ | ⚡ Fast spin |
| Shadow | ✅ | ✅ | ❌ | ✅ |
| Grain | ✅ | ⚡ Optional | ❌ | ⚡ Optional |
| Dither | ✅ | ✅ | ✅ | ✅ |

✅ = Always use | ⚡ = Situational | ❌ = Skip

---

## Performance Budget

| Operation | Target Time | Implementation |
|-----------|-------------|----------------|
| SDF Build (584px) | < 3ms | WASM (Rust) |
| Mipmap Gen (4 levels) | < 2ms | WebGL |
| Stitch Render | < 1ms | WebGL Shader |
| Shadow Blur | < 0.5ms | Separable Blur |
| Post-Process | < 0.5ms | Single Pass |
| **Total Frame** | **< 7ms** | **~140 FPS headroom** |

---

## Future Enhancements

1. **WebGPU Compute Shaders**: Parallel SDF generation for all frames
2. **WASM SIMD**: Vectorized image operations
3. **Temporal Coherence**: Frame-to-frame stability analysis
4. **AI-Assisted Depth**: Optional depth map generation for enhanced parallax
5. **Skeleton Tracking**: Pose-aware parallax layers

---

*Document Version: 1.0*
*Last Updated: 2025-01-XX*
*Author: jusDNCE Core Team*
