/**
 * virtual-frame-utils.ts
 *
 * Pure TypeScript utilities for virtual frame synthesis.
 * These functions handle frame interpolation, sprite sheet parsing,
 * and animation state management.
 *
 * Works alongside VirtualFrameStitcher.ts (WebGL) for rendering.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Frame {
  id: string;
  url: string;
  energy: 'low' | 'mid' | 'high';
  pose?: string;
  index: number;
}

export interface SpriteSheetConfig {
  url: string;
  cols: number;           // Typically 4
  rows: number;           // Typically 3
  cellWidth: number;      // Pixels per cell
  cellHeight: number;
  totalFrames: number;    // May be less than cols * rows
}

export interface AnimationState {
  currentAngle: number;   // 0-360 degrees
  targetAngle: number;
  velocity: number;       // degrees per second
  zoom: number;           // 1.0 = no zoom
  pan: { x: number; y: number };  // Normalized -1 to 1
  pitch: number;          // For vertical motion (-90 to 90)
}

export interface InterpolationResult {
  frameA: Frame;
  frameB: Frame;
  t: number;              // Blend factor 0-1
  seamAngle: number;      // Radians
  motionDir: number;      // -1 to 1 (direction indicator)
}

export interface PhaseConfig {
  framesPerRevolution: number;  // Typically 12
  warpMultiplier: number;
  seamFeatherPx: number;
  motionShear: number;
}

// ============================================================================
// SPRITE SHEET UTILITIES
// ============================================================================

/**
 * Parse a sprite sheet image into individual frame canvases
 */
export function parseSpriteSheet(
  image: HTMLImageElement,
  config: SpriteSheetConfig
): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];

  for (let i = 0; i < config.totalFrames; i++) {
    const col = i % config.cols;
    const row = Math.floor(i / config.cols);

    const canvas = document.createElement('canvas');
    canvas.width = config.cellWidth;
    canvas.height = config.cellHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      col * config.cellWidth,
      row * config.cellHeight,
      config.cellWidth,
      config.cellHeight,
      0,
      0,
      config.cellWidth,
      config.cellHeight
    );

    frames.push(canvas);
  }

  return frames;
}

/**
 * Create a sprite sheet from individual frames
 */
export function createSpriteSheet(
  frames: HTMLCanvasElement[],
  cols: number = 4
): HTMLCanvasElement {
  if (frames.length === 0) {
    throw new Error('No frames provided');
  }

  const cellWidth = frames[0].width;
  const cellHeight = frames[0].height;
  const rows = Math.ceil(frames.length / cols);

  const canvas = document.createElement('canvas');
  canvas.width = cols * cellWidth;
  canvas.height = rows * cellHeight;

  const ctx = canvas.getContext('2d')!;

  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(frame, col * cellWidth, row * cellHeight);
  });

  return canvas;
}

/**
 * Interleave multiple sprite sheets for smoother animation
 * Given sheets A, B, C: returns [A0, B0, C0, A1, B1, C1, ...]
 */
export function interleaveSheets(sheets: Frame[][]): Frame[] {
  if (sheets.length === 0) return [];

  const result: Frame[] = [];
  const framesPerSheet = sheets[0].length;

  for (let i = 0; i < framesPerSheet; i++) {
    for (const sheet of sheets) {
      if (sheet[i]) {
        result.push({
          ...sheet[i],
          index: result.length,
        });
      }
    }
  }

  return result;
}

// ============================================================================
// PHASE SYNTHESIS
// ============================================================================

/**
 * Calculate which frames to blend and the interpolation factor
 * for smooth rotation synthesis.
 */
export function calculatePhase(
  angle: number,
  frames: Frame[],
  config: PhaseConfig
): InterpolationResult {
  const n = frames.length;
  const stepDeg = 360 / n;

  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;

  // Find adjacent frame indices
  const exactIndex = normalizedAngle / stepDeg;
  const indexA = Math.floor(exactIndex) % n;
  const indexB = (indexA + 1) % n;

  // Blend factor 0-1
  const t = exactIndex - Math.floor(exactIndex);

  return {
    frameA: frames[indexA],
    frameB: frames[indexB],
    t,
    seamAngle: 0, // Horizontal by default
    motionDir: t > 0.5 ? 1 : -1,
  };
}

/**
 * Calculate phase for diagonal/vertical motion
 * Uses both yaw (horizontal) and pitch (vertical)
 */
export function calculatePhase2D(
  yaw: number,
  pitch: number,
  prevYaw: number,
  prevPitch: number,
  frames: Frame[],
  config: PhaseConfig
): InterpolationResult {
  const result = calculatePhase(yaw, frames, config);

  // Calculate motion direction for seam angle
  const deltaYaw = yaw - prevYaw;
  const deltaPitch = pitch - prevPitch;

  // Seam perpendicular to motion direction
  result.seamAngle = Math.atan2(deltaPitch, deltaYaw);

  // Motion direction indicator (-1 to 1)
  result.motionDir = Math.sign(deltaYaw) || Math.sign(deltaPitch);

  return result;
}

/**
 * Easing function for smooth interpolation
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Apply motion-aware easing to blend factor
 */
export function applyMotionEasing(
  t: number,
  velocity: number,
  maxVelocity: number = 360 // degrees per second
): number {
  // Faster motion = less easing (more linear)
  const velocityFactor = Math.min(Math.abs(velocity) / maxVelocity, 1);
  const easedT = easeInOutCubic(t);
  return t * velocityFactor + easedT * (1 - velocityFactor);
}

// ============================================================================
// ZOOM & PAN
// ============================================================================

export interface CropRect {
  x: number;  // 0-1 normalized
  y: number;
  w: number;
  h: number;
}

/**
 * Calculate crop rectangle for zoom/pan effect
 */
export function calculateCropRect(
  zoom: number,
  pan: { x: number; y: number },
  aspectRatio: number = 1
): CropRect {
  // Clamp zoom
  zoom = Math.max(1, Math.min(zoom, 4));

  const w = 1 / zoom;
  const h = w * aspectRatio;

  // Pan is normalized -1 to 1, convert to UV space
  // At zoom 1, no pan possible; at higher zoom, more pan range
  const maxPan = (1 - w) / 2;
  const x = 0.5 - w / 2 + pan.x * maxPan;
  const y = 0.5 - h / 2 + pan.y * maxPan;

  return {
    x: Math.max(0, Math.min(x, 1 - w)),
    y: Math.max(0, Math.min(y, 1 - h)),
    w,
    h,
  };
}

/**
 * Animate zoom with spring physics
 */
export function springZoom(
  current: number,
  target: number,
  velocity: number,
  stiffness: number = 100,
  damping: number = 10,
  dt: number = 1 / 60
): { value: number; velocity: number } {
  const displacement = target - current;
  const springForce = displacement * stiffness;
  const dampingForce = velocity * damping;
  const acceleration = springForce - dampingForce;

  const newVelocity = velocity + acceleration * dt;
  const newValue = current + newVelocity * dt;

  return { value: newValue, velocity: newVelocity };
}

// ============================================================================
// PARALLAX UTILITIES
// ============================================================================

export interface ParallaxLayer {
  name: string;
  threshold: number;    // SDF distance in pixels
  factor: number;       // 0-1 parallax strength
}

export const DEFAULT_PARALLAX_LAYERS: ParallaxLayer[] = [
  { name: 'core', threshold: 24, factor: 0.0 },
  { name: 'mid', threshold: 12, factor: 0.4 },
  { name: 'rim', threshold: 4, factor: 0.8 },
];

/**
 * Calculate parallax offset for a layer based on rotation
 */
export function calculateParallaxOffset(
  layer: ParallaxLayer,
  deltaAngle: number,
  pxPerDegree: number = 0.8
): { x: number; y: number } {
  return {
    x: deltaAngle * pxPerDegree * layer.factor,
    y: 0,
  };
}

// ============================================================================
// MIPMAP UTILITIES
// ============================================================================

/**
 * Generate mipmap levels for a canvas
 */
export function generateMipmaps(
  source: HTMLCanvasElement,
  levels: number = 4
): HTMLCanvasElement[] {
  const mipmaps: HTMLCanvasElement[] = [source];

  let currentWidth = source.width;
  let currentHeight = source.height;
  let currentSource = source;

  for (let i = 1; i < levels; i++) {
    currentWidth = Math.max(1, Math.floor(currentWidth / 2));
    currentHeight = Math.max(1, Math.floor(currentHeight / 2));

    const canvas = document.createElement('canvas');
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(currentSource, 0, 0, currentWidth, currentHeight);

    mipmaps.push(canvas);
    currentSource = canvas;
  }

  return mipmaps;
}

/**
 * Select appropriate mipmap level based on output size
 */
export function selectMipmapLevel(
  outputSize: number,
  sourceSize: number,
  mipmapCount: number
): number {
  const ratio = sourceSize / outputSize;
  const level = Math.floor(Math.log2(ratio));
  return Math.max(0, Math.min(level, mipmapCount - 1));
}

// ============================================================================
// ANIMATION CONTROLLER
// ============================================================================

export class VirtualFrameAnimator {
  private frames: Frame[] = [];
  private state: AnimationState = {
    currentAngle: 0,
    targetAngle: 0,
    velocity: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    pitch: 0,
  };
  private prevAngle: number = 0;
  private prevPitch: number = 0;

  private config: PhaseConfig = {
    framesPerRevolution: 12,
    warpMultiplier: 1.0,
    seamFeatherPx: 10,
    motionShear: 0.08,
  };

  constructor(frames: Frame[], config?: Partial<PhaseConfig>) {
    this.frames = frames;
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Set rotation target (e.g., from user input)
   */
  setTarget(angle: number, immediate: boolean = false): void {
    this.state.targetAngle = angle;
    if (immediate) {
      this.state.currentAngle = angle;
      this.state.velocity = 0;
    }
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.state.zoom = Math.max(1, Math.min(zoom, 4));
  }

  /**
   * Set pan offset
   */
  setPan(x: number, y: number): void {
    this.state.pan = { x, y };
  }

  /**
   * Set pitch (vertical angle)
   */
  setPitch(pitch: number): void {
    this.state.pitch = Math.max(-90, Math.min(pitch, 90));
  }

  /**
   * Update animation state (call every frame)
   */
  update(dt: number = 1 / 60): InterpolationResult {
    // Spring physics for smooth rotation
    const spring = springZoom(
      this.state.currentAngle,
      this.state.targetAngle,
      this.state.velocity,
      120,  // stiffness
      15,   // damping
      dt
    );

    this.state.velocity = spring.velocity;
    this.state.currentAngle = spring.value;

    // Calculate interpolation
    const result = calculatePhase2D(
      this.state.currentAngle,
      this.state.pitch,
      this.prevAngle,
      this.prevPitch,
      this.frames,
      this.config
    );

    // Store for next frame's delta calculation
    this.prevAngle = this.state.currentAngle;
    this.prevPitch = this.state.pitch;

    return result;
  }

  /**
   * Get current state
   */
  getState(): AnimationState {
    return { ...this.state };
  }

  /**
   * Get crop rect for current zoom/pan
   */
  getCropRect(): CropRect {
    return calculateCropRect(this.state.zoom, this.state.pan);
  }
}

// ============================================================================
// MOTION BLUR UTILITIES
// ============================================================================

/**
 * Blend two image data arrays with gamma correction
 */
export function gammaBlend(
  a: ImageData,
  b: ImageData,
  mixFactor: number,
  gamma: number = 2.2
): ImageData {
  const result = new ImageData(a.width, a.height);

  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      // Convert to linear
      const aLinear = Math.pow(a.data[i + c] / 255, gamma);
      const bLinear = Math.pow(b.data[i + c] / 255, gamma);

      // Blend in linear space
      const blended = aLinear * (1 - mixFactor) + bLinear * mixFactor;

      // Convert back to gamma
      result.data[i + c] = Math.pow(blended, 1 / gamma) * 255;
    }

    // Alpha (no gamma correction needed)
    result.data[i + 3] = a.data[i + 3] * (1 - mixFactor) + b.data[i + 3] * mixFactor;
  }

  return result;
}

// ============================================================================
// SWEETENER UTILITIES
// ============================================================================

/**
 * Apply film grain to an ImageData
 */
export function applyFilmGrain(
  imageData: ImageData,
  intensity: number,
  frameIndex: number
): void {
  // Seeded random for consistent grain per frame
  const seed = frameIndex * 0.317;
  let rand = seed;

  for (let i = 0; i < imageData.data.length; i += 4) {
    // Simple LCG random
    rand = (rand * 1103515245 + 12345) % 2147483648;
    const noise = (rand / 2147483648 - 0.5) * intensity * 255;

    imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
    imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
    imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
  }
}

/**
 * Apply vignette to an ImageData
 */
export function applyVignette(
  imageData: ImageData,
  intensity: number
): void {
  const cx = imageData.width / 2;
  const cy = imageData.height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;

      const vignette = 1 - dist * dist * intensity;

      imageData.data[i] *= vignette;
      imageData.data[i + 1] *= vignette;
      imageData.data[i + 2] *= vignette;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  parseSpriteSheet,
  createSpriteSheet,
  interleaveSheets,
  calculatePhase,
  calculatePhase2D,
  calculateCropRect,
  calculateParallaxOffset,
  generateMipmaps,
  selectMipmapLevel,
  VirtualFrameAnimator,
  gammaBlend,
  applyFilmGrain,
  applyVignette,
};
