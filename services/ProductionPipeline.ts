/**
 * ProductionPipeline.ts
 *
 * The master orchestrator that combines:
 * - AI Director (planning & prompting)
 * - Frame Generation (with consistency strategies)
 * - Virtual Frame Effects (stitching, parallax, motion blur)
 * - Camera System (pans, zooms, crops, shakes)
 * - Lighting & Depth Effects
 * - Timeline Composition
 * - Export Pipeline
 *
 * This creates complete animations from a single prompt.
 */

// ============================================================================
// GENERATION STRATEGIES
// ============================================================================

export type GenerationStrategy =
  | 'standard'              // Normal image generation
  | 'sprite-sheet'          // Generate 4x3 sheets for consistency
  | 'low-poly'              // Simpler art for better consistency
  | 'rotoscope'             // Trace over reference
  | 'morph-sequence'        // Generate start/end, morph between
  | 'style-transfer'        // Apply style to frames
  | 'turnaround'            // Character turnaround sheets
  | 'expression-sheet';     // Facial expression variations

export interface GenerationConfig {
  strategy: GenerationStrategy;
  framesPerGeneration: number;   // How many frames per API call
  consistencyTechniques: ConsistencyTechnique[];
  fallbackStrategy?: GenerationStrategy;
}

export type ConsistencyTechnique =
  | 'seed-lock'                // Lock random seed
  | 'reference-injection'      // Include reference in every prompt
  | 'style-anchor'             // Include style image
  | 'character-sheet'          // Generate character sheet first
  | 'color-palette-lock'       // Extract and enforce palette
  | 'silhouette-match'         // Match silhouettes
  | 'low-detail'               // Reduce detail for consistency
  | 'pose-skeleton';           // Use pose estimation

// ============================================================================
// VIRTUAL FRAME EFFECT DEFINITIONS
// ============================================================================

export interface VirtualFrameEffect {
  id: string;
  name: string;
  type: VFEffectType;
  params: Record<string, number | boolean | string>;
}

export type VFEffectType =
  // Transition Effects
  | 'phase-stitch'             // Smooth blend between frames
  | 'motion-warp'              // Cylindrical warp for rotation
  | 'seam-blend'               // Feathered seam between frames
  | 'morph-dissolve'           // AI-guided morph between frames

  // Depth & Parallax
  | 'parallax-layers'          // SDF-based fake 3D
  | 'rim-extrusion'            // Edge depth effect
  | 'depth-blur'               // Fake depth of field
  | 'shadow-projection'        // Ground shadows

  // Motion Effects
  | 'motion-blur'              // Perceptual blur
  | 'ghost-trail'              // After-image effect
  | 'speed-lines'              // Anime speed lines
  | 'smear-frames'             // Cartoon smear

  // Enhancement
  | 'micro-dither'             // Anti-aliasing dither
  | 'film-grain'               // Cinematic grain
  | 'chromatic-aberration'     // RGB split
  | 'vignette'                 // Edge darkening

  // Lighting
  | 'rim-light'                // Edge highlight
  | 'ambient-occlusion'        // Soft shadows
  | 'specular-kick'            // Highlight flash
  | 'color-grade';             // Color correction

// ============================================================================
// CAMERA SYSTEM
// ============================================================================

export interface CameraKeyframe {
  frame: number;
  position: CameraPosition;
  easing: EasingFunction;
}

export interface CameraPosition {
  x: number;                   // -1 to 1 (pan)
  y: number;                   // -1 to 1 (tilt)
  zoom: number;                // 0.5 to 3 (scale)
  rotation: number;            // Degrees
  fov: number;                 // Field of view
  depthOffset: number;         // For parallax layers
  shake: ShakeParams;
  crop: CropParams;
}

export interface ShakeParams {
  intensity: number;           // 0-1
  frequency: number;           // Hz
  decay: number;               // How fast it calms
  seed: number;                // For repeatable shake
}

export interface CropParams {
  enabled: boolean;
  x: number;                   // 0-1 crop position
  y: number;
  width: number;               // 0-1 crop size
  height: number;
  feather: number;             // Edge softness
}

export type EasingFunction =
  | 'linear'
  | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'bounce' | 'elastic' | 'back'
  | 'step' | 'smooth-step';

// ============================================================================
// LIGHTING SYSTEM
// ============================================================================

export interface LightingSetup {
  ambient: AmbientLight;
  keyLight: DirectionalLight;
  fillLight: DirectionalLight;
  rimLight: RimLight;
  colorGrade: ColorGrade;
}

export interface AmbientLight {
  color: string;               // Hex color
  intensity: number;           // 0-1
}

export interface DirectionalLight {
  color: string;
  intensity: number;
  angle: number;               // Degrees
  softness: number;            // Shadow blur
}

export interface RimLight {
  color: string;
  intensity: number;
  width: number;               // Rim thickness
  falloff: number;             // Gradient
}

export interface ColorGrade {
  temperature: number;         // -100 to 100 (cool to warm)
  tint: number;                // -100 to 100 (green to magenta)
  saturation: number;          // 0-2 (0 = grayscale, 1 = normal)
  contrast: number;            // 0-2
  highlights: number;          // -1 to 1
  shadows: number;             // -1 to 1
  vibrance: number;            // 0-2
}

// ============================================================================
// PRODUCTION PLAN
// ============================================================================

export interface FullProductionPlan {
  metadata: PlanMetadata;
  structure: StoryStructure;
  frameGeneration: FrameGenerationPlan;
  virtualFrames: VirtualFramePlan;
  camera: CameraPlan;
  lighting: LightingPlan;
  audio: AudioPlan;
  export: ExportPlan;
}

export interface PlanMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  estimatedDuration: number;   // Seconds
  estimatedCost: number;       // USD
  estimatedRenderTime: number; // Minutes
  qualityLevel: 'draft' | 'preview' | 'production';
}

export interface StoryStructure {
  synopsis: string;
  beats: StoryBeat[];
  scenes: SceneDefinition[];
  characters: CharacterDefinition[];
  locations: LocationDefinition[];
}

export interface StoryBeat {
  id: string;
  frame: number;
  type: 'setup' | 'conflict' | 'climax' | 'resolution' | 'beat';
  description: string;
  emotion: string;
  intensity: number;           // 0-1
}

export interface SceneDefinition {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  location: string;
  characters: string[];
  mood: string;
  lighting: string;            // Lighting preset name
  shots: ShotDefinition[];
}

export interface ShotDefinition {
  id: string;
  type: ShotType;
  startFrame: number;
  endFrame: number;
  description: string;
  frameSource: FrameSource;
  camera: CameraKeyframe[];
  effects: VirtualFrameEffect[];
  transitions: { in: string; out: string };
}

export type ShotType =
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'extreme-close-up'
  | 'over-shoulder'
  | 'pov'
  | 'establishing'
  | 'insert'
  | 'reaction'
  | 'two-shot'
  | 'montage';

export interface FrameSource {
  type: 'generated' | 'library' | 'composite' | 'virtual';
  frameIds?: string[];
  compositeConfig?: CompositeConfig;
  virtualConfig?: VirtualFrameConfig;
}

export interface CompositeConfig {
  layers: CompositeLayer[];
  blendMode: BlendMode;
}

export interface CompositeLayer {
  source: string;              // Frame ID
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  mask?: string;               // Mask frame ID
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'add';

export interface VirtualFrameConfig {
  sourceFrames: string[];      // Frame IDs to interpolate between
  interpolationType: 'blend' | 'warp' | 'morph';
  effects: VFEffectType[];
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  referenceSheet?: string;     // Generated character sheet URL
  expressions: Record<string, string>;  // Expression name -> frame ID
  poses: Record<string, string>;        // Pose name -> frame ID
}

export interface LocationDefinition {
  id: string;
  name: string;
  description: string;
  backgroundLayers: string[];  // Frame IDs for parallax layers
  lighting: LightingSetup;
}

// ============================================================================
// FRAME GENERATION PLAN
// ============================================================================

export interface FrameGenerationPlan {
  strategy: GenerationStrategy;
  consistencyConfig: ConsistencyConfig;
  batches: GenerationBatch[];
  frameLibrary: FrameLibraryPlan;
  reuseMap: ReuseMap;
}

export interface ConsistencyConfig {
  techniques: ConsistencyTechnique[];
  referenceImage?: string;
  styleAnchor?: string;
  characterSheet?: string;
  colorPalette?: string[];
}

export interface GenerationBatch {
  id: string;
  index: number;
  priority: number;            // Higher = generate first
  frames: PlannedFrame[];
  status: 'pending' | 'generating' | 'complete' | 'error';
  startTime?: number;
  endTime?: number;
}

export interface PlannedFrame {
  id: string;
  prompt: string;
  category: FrameCategory;
  tags: string[];
  reuseScore: number;          // 0-1, how reusable this frame is
  dependencies: string[];      // Frame IDs this depends on
  generatedUrl?: string;
  metadata?: FrameMetadata;
}

export type FrameCategory =
  | 'character-idle'
  | 'character-action'
  | 'character-emotion'
  | 'character-walk'
  | 'character-run'
  | 'character-talk'
  | 'background'
  | 'foreground'
  | 'effect'
  | 'transition'
  | 'title'
  | 'unique';

export interface FrameMetadata {
  width: number;
  height: number;
  dominantColors: string[];
  hasTransparency: boolean;
  complexity: number;          // 0-1
  generationTime: number;
}

export interface FrameLibraryPlan {
  totalUnique: number;
  totalReused: number;
  totalVirtual: number;        // Generated via interpolation
  totalOutput: number;
  categories: Record<FrameCategory, number>;
}

export interface ReuseMap {
  // Maps frame IDs to all shots that use them
  frameUsage: Record<string, string[]>;
  // Maps shots to their frame sources
  shotSources: Record<string, string[]>;
  // Estimated savings from reuse
  savingsPercent: number;
}

// ============================================================================
// VIRTUAL FRAME PLAN
// ============================================================================

export interface VirtualFramePlan {
  interpolations: InterpolationPlan[];
  globalEffects: VirtualFrameEffect[];
  perShotEffects: Record<string, VirtualFrameEffect[]>;
}

export interface InterpolationPlan {
  id: string;
  shotId: string;
  startFrame: number;
  endFrame: number;
  sourceFrameA: string;
  sourceFrameB: string;
  type: 'phase' | 'morph' | 'blend';
  params: {
    featherWidth: number;
    warpStrength: number;
    motionShear: number;
    seamAngle: number;
  };
}

// ============================================================================
// CAMERA PLAN
// ============================================================================

export interface CameraPlan {
  globalStyle: CameraStyle;
  keyframes: CameraKeyframe[];
  automations: CameraAutomation[];
}

export type CameraStyle =
  | 'static'
  | 'documentary'
  | 'action'
  | 'cinematic'
  | 'handheld'
  | 'steadicam';

export interface CameraAutomation {
  type: 'track-subject' | 'follow-action' | 'beat-sync' | 'random-drift';
  params: Record<string, number>;
}

// ============================================================================
// LIGHTING PLAN
// ============================================================================

export interface LightingPlan {
  scenes: Record<string, LightingSetup>;
  transitions: LightingTransition[];
  globalColorGrade: ColorGrade;
}

export interface LightingTransition {
  fromScene: string;
  toScene: string;
  frame: number;
  duration: number;
  easing: EasingFunction;
}

// ============================================================================
// AUDIO PLAN
// ============================================================================

export interface AudioPlan {
  source?: AudioSource;
  analysis?: AudioAnalysis;
  syncPoints: AudioSyncPoint[];
  markers: AudioMarker[];
}

export interface AudioSource {
  url: string;
  duration: number;
  bpm?: number;
  key?: string;
}

export interface AudioAnalysis {
  beats: { time: number; strength: number }[];
  sections: { name: string; start: number; end: number; energy: number }[];
  energy: number[];            // Per-frame energy
  spectrum: number[][];        // Per-frame frequency bands
}

export interface AudioSyncPoint {
  audioTime: number;
  frame: number;
  type: 'beat' | 'section' | 'marker';
}

export interface AudioMarker {
  time: number;
  name: string;
  action: 'cut' | 'impact' | 'hold' | 'speed-up' | 'slow-down';
}

// ============================================================================
// EXPORT PLAN
// ============================================================================

export interface ExportPlan {
  format: ExportFormat;
  quality: QualityPreset;
  resolution: { width: number; height: number };
  fps: number;
  codec: string;
  bitrate: number;
  passes: ExportPass[];
}

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-sequence' | 'mov';
export type QualityPreset = 'draft' | 'preview' | 'standard' | 'high' | 'production';

export interface ExportPass {
  name: string;
  operations: ExportOperation[];
}

export type ExportOperation =
  | 'render-frames'
  | 'apply-effects'
  | 'composite-layers'
  | 'apply-camera'
  | 'apply-lighting'
  | 'apply-color-grade'
  | 'encode-video'
  | 'add-audio';

// ============================================================================
// PRODUCTION PIPELINE CLASS
// ============================================================================

export class ProductionPipeline {
  private plan: FullProductionPlan | null = null;
  private generatedFrames: Map<string, string> = new Map();
  private renderCanvas: HTMLCanvasElement | null = null;
  private renderCtx: CanvasRenderingContext2D | null = null;

  private onProgress?: (stage: string, percent: number, message: string) => void;
  private onLog?: (message: string, level: 'info' | 'warn' | 'error') => void;

  constructor() {}

  setCallbacks(callbacks: {
    onProgress?: (stage: string, percent: number, message: string) => void;
    onLog?: (message: string, level: 'info' | 'warn' | 'error') => void;
  }): void {
    this.onProgress = callbacks.onProgress;
    this.onLog = callbacks.onLog;
  }

  // ============================================================================
  // MAIN PRODUCTION FLOW
  // ============================================================================

  /**
   * Run complete production from prompt to video
   */
  async produce(config: {
    prompt: string;
    sourceImage?: string;
    style?: string;
    duration?: number;
    audioFile?: string;
    settings?: Partial<ExportPlan>;
  }): Promise<Blob> {
    this.log('Starting production pipeline...', 'info');

    // 1. Plan
    this.progress('planning', 0, 'Analyzing prompt...');
    this.plan = await this.createPlan(config);
    this.progress('planning', 100, 'Plan complete');

    // 2. Generate frames
    this.progress('generating', 0, 'Starting frame generation...');
    await this.generateAllFrames();
    this.progress('generating', 100, 'All frames generated');

    // 3. Compose
    this.progress('composing', 0, 'Composing timeline...');
    await this.composeTimeline();
    this.progress('composing', 100, 'Timeline composed');

    // 4. Render
    this.progress('rendering', 0, 'Rendering frames...');
    const video = await this.renderAndExport();
    this.progress('rendering', 100, 'Export complete');

    this.log('Production complete!', 'info');
    return video;
  }

  // ============================================================================
  // PLANNING
  // ============================================================================

  private async createPlan(config: {
    prompt: string;
    sourceImage?: string;
    style?: string;
    duration?: number;
    audioFile?: string;
  }): Promise<FullProductionPlan> {
    const duration = config.duration || 30;
    const fps = 24;
    const totalFrames = duration * fps;

    // Analyze what type of animation this should be
    const animationType = this.analyzePrompt(config.prompt);

    // Choose generation strategy based on type
    const strategy = this.chooseStrategy(animationType);

    // Plan frame library
    const frameLibrary = this.planFrameLibrary(totalFrames, strategy, animationType);

    // Plan scenes
    const scenes = this.planScenes(config.prompt, totalFrames, animationType);

    // Plan camera
    const camera = this.planCamera(scenes, animationType);

    // Plan virtual frame effects
    const virtualFrames = this.planVirtualFrames(scenes, frameLibrary);

    // Plan lighting
    const lighting = this.planLighting(scenes, animationType);

    // Plan audio sync
    const audio = await this.planAudio(config.audioFile, totalFrames, fps);

    return {
      metadata: {
        id: `prod-${Date.now()}`,
        title: config.prompt.slice(0, 50),
        description: config.prompt,
        createdAt: new Date(),
        estimatedDuration: duration,
        estimatedCost: frameLibrary.totalUnique * 0.002,
        estimatedRenderTime: Math.ceil(totalFrames / 60),
        qualityLevel: 'preview',
      },
      structure: {
        synopsis: config.prompt,
        beats: this.generateStoryBeats(totalFrames),
        scenes,
        characters: [],
        locations: [],
      },
      frameGeneration: {
        strategy,
        consistencyConfig: {
          techniques: this.chooseConsistencyTechniques(strategy),
          referenceImage: config.sourceImage,
        },
        batches: this.createBatches(frameLibrary, strategy),
        frameLibrary,
        reuseMap: this.createReuseMap(scenes, frameLibrary),
      },
      virtualFrames,
      camera,
      lighting,
      audio,
      export: {
        format: 'mp4',
        quality: 'preview',
        resolution: { width: 1920, height: 1080 },
        fps,
        codec: 'h264',
        bitrate: 8000000,
        passes: [
          { name: 'render', operations: ['render-frames', 'apply-effects'] },
          { name: 'composite', operations: ['composite-layers', 'apply-camera'] },
          { name: 'finalize', operations: ['apply-color-grade', 'encode-video', 'add-audio'] },
        ],
      },
    };
  }

  private analyzePrompt(prompt: string): AnimationType {
    const lower = prompt.toLowerCase();

    if (lower.includes('dance') || lower.includes('music')) return 'music-video';
    if (lower.includes('story') || lower.includes('tale')) return 'narrative';
    if (lower.includes('product') || lower.includes('showcase')) return 'product';
    if (lower.includes('tutorial') || lower.includes('how to')) return 'tutorial';
    if (lower.includes('transform') || lower.includes('morph')) return 'transformation';
    if (lower.includes('loop') || lower.includes('cycle')) return 'loop';

    return 'narrative';
  }

  private chooseStrategy(type: AnimationType): GenerationStrategy {
    const strategies: Record<AnimationType, GenerationStrategy> = {
      'music-video': 'sprite-sheet',
      'narrative': 'standard',
      'product': 'turnaround',
      'tutorial': 'standard',
      'transformation': 'morph-sequence',
      'loop': 'sprite-sheet',
    };
    return strategies[type] || 'standard';
  }

  private chooseConsistencyTechniques(strategy: GenerationStrategy): ConsistencyTechnique[] {
    const techniques: Record<GenerationStrategy, ConsistencyTechnique[]> = {
      'standard': ['reference-injection', 'style-anchor'],
      'sprite-sheet': ['character-sheet', 'seed-lock', 'color-palette-lock'],
      'low-poly': ['low-detail', 'color-palette-lock'],
      'rotoscope': ['reference-injection'],
      'morph-sequence': ['seed-lock', 'reference-injection'],
      'style-transfer': ['style-anchor'],
      'turnaround': ['character-sheet', 'seed-lock'],
      'expression-sheet': ['character-sheet', 'seed-lock'],
    };
    return techniques[strategy] || ['reference-injection'];
  }

  private planFrameLibrary(totalFrames: number, strategy: GenerationStrategy, type: AnimationType): FrameLibraryPlan {
    // Calculate how many unique frames we need
    // Virtual frame interpolation can extend frames significantly

    const reuseRatio = this.getReuseRatio(type);
    const virtualRatio = this.getVirtualRatio(strategy);

    // Base unique frames needed
    const baseUnique = Math.ceil(totalFrames * 0.1); // Start with 10% unique

    // Add category-specific frames
    const categories: Record<FrameCategory, number> = {
      'character-idle': Math.ceil(baseUnique * 0.2),
      'character-action': Math.ceil(baseUnique * 0.3),
      'character-emotion': Math.ceil(baseUnique * 0.1),
      'character-walk': 8,  // Standard walk cycle
      'character-run': 8,   // Standard run cycle
      'character-talk': 4,  // Mouth positions
      'background': Math.ceil(baseUnique * 0.1),
      'foreground': Math.ceil(baseUnique * 0.05),
      'effect': Math.ceil(baseUnique * 0.05),
      'transition': 4,
      'title': 2,
      'unique': Math.ceil(baseUnique * 0.1),
    };

    const totalUnique = Object.values(categories).reduce((a, b) => a + b, 0);
    const totalReused = Math.floor(totalUnique * reuseRatio);
    const totalVirtual = Math.floor(totalFrames * virtualRatio);

    return {
      totalUnique,
      totalReused,
      totalVirtual,
      totalOutput: totalFrames,
      categories,
    };
  }

  private getReuseRatio(type: AnimationType): number {
    const ratios: Record<AnimationType, number> = {
      'music-video': 3.0,      // High reuse for loops
      'narrative': 1.5,
      'product': 0.5,          // Less reuse for unique angles
      'tutorial': 2.0,
      'transformation': 0.3,   // Low reuse, each frame is unique
      'loop': 5.0,             // Very high reuse
    };
    return ratios[type] || 1.5;
  }

  private getVirtualRatio(strategy: GenerationStrategy): number {
    const ratios: Record<GenerationStrategy, number> = {
      'standard': 0.3,
      'sprite-sheet': 0.5,
      'low-poly': 0.4,
      'rotoscope': 0.2,
      'morph-sequence': 0.7,   // Heavy interpolation
      'style-transfer': 0.3,
      'turnaround': 0.6,
      'expression-sheet': 0.5,
    };
    return ratios[strategy] || 0.3;
  }

  private planScenes(prompt: string, totalFrames: number, type: AnimationType): SceneDefinition[] {
    // Generate scene structure based on type
    const sceneCount = this.getSceneCount(type, totalFrames);
    const framesPerScene = Math.floor(totalFrames / sceneCount);
    const scenes: SceneDefinition[] = [];

    for (let i = 0; i < sceneCount; i++) {
      const startFrame = i * framesPerScene;
      const endFrame = i === sceneCount - 1 ? totalFrames : (i + 1) * framesPerScene;

      scenes.push({
        id: `scene-${i}`,
        name: `Scene ${i + 1}`,
        startFrame,
        endFrame,
        location: 'main',
        characters: ['character-1'],
        mood: this.getMoodForScene(i, sceneCount),
        lighting: 'default',
        shots: this.planShots(startFrame, endFrame, type),
      });
    }

    return scenes;
  }

  private getSceneCount(type: AnimationType, totalFrames: number): number {
    const fps = 24;
    const duration = totalFrames / fps;

    const scenesPerMinute: Record<AnimationType, number> = {
      'music-video': 12,
      'narrative': 6,
      'product': 4,
      'tutorial': 8,
      'transformation': 3,
      'loop': 2,
    };

    const rate = scenesPerMinute[type] || 6;
    return Math.max(1, Math.ceil((duration / 60) * rate));
  }

  private getMoodForScene(index: number, total: number): string {
    const position = index / total;
    if (position < 0.2) return 'establishing';
    if (position < 0.5) return 'developing';
    if (position < 0.8) return 'climax';
    return 'resolution';
  }

  private planShots(startFrame: number, endFrame: number, type: AnimationType): ShotDefinition[] {
    const shots: ShotDefinition[] = [];
    const duration = endFrame - startFrame;

    // Default shot structure based on type
    const shotPatterns = this.getShotPatterns(type);
    let currentFrame = startFrame;

    for (const pattern of shotPatterns) {
      const shotDuration = Math.floor(duration * pattern.durationRatio);
      if (currentFrame + shotDuration > endFrame) break;

      shots.push({
        id: `shot-${shots.length}`,
        type: pattern.type,
        startFrame: currentFrame,
        endFrame: currentFrame + shotDuration,
        description: pattern.description,
        frameSource: {
          type: pattern.isVirtual ? 'virtual' : 'generated',
        },
        camera: this.createCameraKeyframes(pattern.camera, currentFrame, shotDuration),
        effects: this.getEffectsForShot(pattern.type),
        transitions: { in: 'cut', out: 'cut' },
      });

      currentFrame += shotDuration;
    }

    return shots;
  }

  private getShotPatterns(type: AnimationType): ShotPattern[] {
    const patterns: Record<AnimationType, ShotPattern[]> = {
      'music-video': [
        { type: 'wide', durationRatio: 0.15, camera: 'ken-burns', description: 'Establishing', isVirtual: false },
        { type: 'medium', durationRatio: 0.25, camera: 'pan', description: 'Action', isVirtual: true },
        { type: 'close-up', durationRatio: 0.2, camera: 'zoom', description: 'Detail', isVirtual: true },
        { type: 'medium', durationRatio: 0.25, camera: 'shake', description: 'Energy', isVirtual: true },
        { type: 'wide', durationRatio: 0.15, camera: 'static', description: 'Release', isVirtual: false },
      ],
      'narrative': [
        { type: 'establishing', durationRatio: 0.2, camera: 'pan', description: 'Scene set', isVirtual: false },
        { type: 'medium', durationRatio: 0.3, camera: 'static', description: 'Main action', isVirtual: true },
        { type: 'close-up', durationRatio: 0.2, camera: 'zoom', description: 'Reaction', isVirtual: true },
        { type: 'two-shot', durationRatio: 0.3, camera: 'pan', description: 'Resolution', isVirtual: true },
      ],
      'product': [
        { type: 'wide', durationRatio: 0.3, camera: 'rotate', description: 'Overview', isVirtual: true },
        { type: 'close-up', durationRatio: 0.4, camera: 'zoom', description: 'Detail', isVirtual: true },
        { type: 'medium', durationRatio: 0.3, camera: 'pan', description: 'Feature', isVirtual: true },
      ],
      'tutorial': [
        { type: 'wide', durationRatio: 0.2, camera: 'static', description: 'Step overview', isVirtual: false },
        { type: 'close-up', durationRatio: 0.4, camera: 'zoom', description: 'Detail view', isVirtual: true },
        { type: 'medium', durationRatio: 0.4, camera: 'static', description: 'Action', isVirtual: true },
      ],
      'transformation': [
        { type: 'medium', durationRatio: 0.2, camera: 'static', description: 'Before', isVirtual: false },
        { type: 'medium', durationRatio: 0.6, camera: 'zoom', description: 'Transform', isVirtual: true },
        { type: 'medium', durationRatio: 0.2, camera: 'static', description: 'After', isVirtual: false },
      ],
      'loop': [
        { type: 'medium', durationRatio: 1.0, camera: 'static', description: 'Loop', isVirtual: true },
      ],
    };

    return patterns[type] || patterns['narrative'];
  }

  private createCameraKeyframes(style: string, startFrame: number, duration: number): CameraKeyframe[] {
    const styles: Record<string, () => CameraKeyframe[]> = {
      'static': () => [
        { frame: startFrame, position: this.defaultCameraPosition(), easing: 'linear' },
      ],
      'pan': () => [
        { frame: startFrame, position: { ...this.defaultCameraPosition(), x: -0.2 }, easing: 'ease-in-out' },
        { frame: startFrame + duration, position: { ...this.defaultCameraPosition(), x: 0.2 }, easing: 'ease-out' },
      ],
      'zoom': () => [
        { frame: startFrame, position: { ...this.defaultCameraPosition(), zoom: 1 }, easing: 'ease-in' },
        { frame: startFrame + duration, position: { ...this.defaultCameraPosition(), zoom: 1.5 }, easing: 'ease-out' },
      ],
      'ken-burns': () => [
        { frame: startFrame, position: { ...this.defaultCameraPosition(), x: -0.1, zoom: 1 }, easing: 'ease-in-out' },
        { frame: startFrame + duration, position: { ...this.defaultCameraPosition(), x: 0.1, zoom: 1.2 }, easing: 'ease-out' },
      ],
      'shake': () => [
        { frame: startFrame, position: { ...this.defaultCameraPosition(), shake: { intensity: 0.03, frequency: 10, decay: 0.95, seed: 1 } }, easing: 'linear' },
      ],
      'rotate': () => [
        { frame: startFrame, position: { ...this.defaultCameraPosition(), rotation: 0 }, easing: 'ease-in-out' },
        { frame: startFrame + duration, position: { ...this.defaultCameraPosition(), rotation: 360 }, easing: 'ease-out' },
      ],
    };

    return (styles[style] || styles['static'])();
  }

  private defaultCameraPosition(): CameraPosition {
    return {
      x: 0,
      y: 0,
      zoom: 1,
      rotation: 0,
      fov: 60,
      depthOffset: 0,
      shake: { intensity: 0, frequency: 0, decay: 1, seed: 0 },
      crop: { enabled: false, x: 0, y: 0, width: 1, height: 1, feather: 0 },
    };
  }

  private getEffectsForShot(shotType: ShotType): VirtualFrameEffect[] {
    const effects: VirtualFrameEffect[] = [];

    // Always add subtle film grain
    effects.push({
      id: 'grain',
      name: 'Film Grain',
      type: 'film-grain',
      params: { intensity: 0.03 },
    });

    // Add vignette for cinematic feel
    effects.push({
      id: 'vignette',
      name: 'Vignette',
      type: 'vignette',
      params: { intensity: 0.2 },
    });

    // Shot-specific effects
    if (shotType === 'close-up' || shotType === 'extreme-close-up') {
      effects.push({
        id: 'depth-blur',
        name: 'Depth Blur',
        type: 'depth-blur',
        params: { amount: 0.3, focalPoint: 0.5 },
      });
    }

    if (shotType === 'establishing') {
      effects.push({
        id: 'parallax',
        name: 'Parallax',
        type: 'parallax-layers',
        params: { layers: 3, intensity: 0.5 },
      });
    }

    return effects;
  }

  private planVirtualFrames(scenes: SceneDefinition[], frameLibrary: FrameLibraryPlan): VirtualFramePlan {
    const interpolations: InterpolationPlan[] = [];

    for (const scene of scenes) {
      for (const shot of scene.shots) {
        if (shot.frameSource.type === 'virtual') {
          interpolations.push({
            id: `interp-${interpolations.length}`,
            shotId: shot.id,
            startFrame: shot.startFrame,
            endFrame: shot.endFrame,
            sourceFrameA: 'frame-a', // Would be actual frame IDs
            sourceFrameB: 'frame-b',
            type: 'phase',
            params: {
              featherWidth: 0.02,
              warpStrength: 0.5,
              motionShear: 0.08,
              seamAngle: 0,
            },
          });
        }
      }
    }

    return {
      interpolations,
      globalEffects: [
        { id: 'global-grain', name: 'Global Grain', type: 'film-grain', params: { intensity: 0.02 } },
      ],
      perShotEffects: {},
    };
  }

  private planCamera(scenes: SceneDefinition[], type: AnimationType): CameraPlan {
    return {
      globalStyle: this.getCameraStyle(type),
      keyframes: scenes.flatMap(s => s.shots.flatMap(shot => shot.camera)),
      automations: type === 'music-video' ? [{ type: 'beat-sync', params: { intensity: 0.5 } }] : [],
    };
  }

  private getCameraStyle(type: AnimationType): CameraStyle {
    const styles: Record<AnimationType, CameraStyle> = {
      'music-video': 'action',
      'narrative': 'cinematic',
      'product': 'steadicam',
      'tutorial': 'static',
      'transformation': 'cinematic',
      'loop': 'static',
    };
    return styles[type] || 'cinematic';
  }

  private planLighting(scenes: SceneDefinition[], type: AnimationType): LightingPlan {
    const defaultSetup: LightingSetup = {
      ambient: { color: '#ffffff', intensity: 0.3 },
      keyLight: { color: '#fff5e6', intensity: 0.7, angle: 45, softness: 0.5 },
      fillLight: { color: '#e6f0ff', intensity: 0.3, angle: -30, softness: 0.8 },
      rimLight: { color: '#ffffff', intensity: 0.2, width: 2, falloff: 0.5 },
      colorGrade: {
        temperature: 0,
        tint: 0,
        saturation: 1,
        contrast: 1.1,
        highlights: 0,
        shadows: 0,
        vibrance: 1.1,
      },
    };

    return {
      scenes: scenes.reduce((acc, s) => ({ ...acc, [s.id]: defaultSetup }), {}),
      transitions: [],
      globalColorGrade: defaultSetup.colorGrade,
    };
  }

  private async planAudio(audioFile: string | undefined, totalFrames: number, fps: number): Promise<AudioPlan> {
    return {
      source: audioFile ? { url: audioFile, duration: totalFrames / fps } : undefined,
      syncPoints: [],
      markers: [],
    };
  }

  private generateStoryBeats(totalFrames: number): StoryBeat[] {
    const beats: StoryBeat[] = [];
    const beatCount = Math.ceil(totalFrames / 120); // One beat every 5 seconds

    for (let i = 0; i < beatCount; i++) {
      beats.push({
        id: `beat-${i}`,
        frame: Math.floor(i * (totalFrames / beatCount)),
        type: i === 0 ? 'setup' : i === beatCount - 1 ? 'resolution' : 'beat',
        description: `Beat ${i + 1}`,
        emotion: 'neutral',
        intensity: 0.5 + Math.sin(i * 0.5) * 0.3,
      });
    }

    return beats;
  }

  private createBatches(frameLibrary: FrameLibraryPlan, strategy: GenerationStrategy): GenerationBatch[] {
    const batches: GenerationBatch[] = [];
    const batchSize = strategy === 'sprite-sheet' ? 12 : 20;
    let frameCount = 0;

    // Create frames for each category
    for (const [category, count] of Object.entries(frameLibrary.categories)) {
      for (let i = 0; i < count; i++) {
        const batchIndex = Math.floor(frameCount / batchSize);

        if (!batches[batchIndex]) {
          batches.push({
            id: `batch-${batchIndex}`,
            index: batchIndex,
            priority: category.includes('idle') || category.includes('walk') ? 10 : 5,
            frames: [],
            status: 'pending',
          });
        }

        batches[batchIndex].frames.push({
          id: `frame-${category}-${i}`,
          prompt: `${category} frame ${i + 1}`,
          category: category as FrameCategory,
          tags: [category],
          reuseScore: category.includes('idle') || category.includes('walk') ? 0.9 : 0.3,
          dependencies: [],
        });

        frameCount++;
      }
    }

    return batches;
  }

  private createReuseMap(scenes: SceneDefinition[], frameLibrary: FrameLibraryPlan): ReuseMap {
    const frameUsage: Record<string, string[]> = {};
    const shotSources: Record<string, string[]> = {};

    // Would map frames to shots in full implementation
    return {
      frameUsage,
      shotSources,
      savingsPercent: (frameLibrary.totalReused / (frameLibrary.totalUnique + frameLibrary.totalReused)) * 100,
    };
  }

  // ============================================================================
  // GENERATION
  // ============================================================================

  private async generateAllFrames(): Promise<void> {
    if (!this.plan) return;

    const batches = this.plan.frameGeneration.batches;
    let completed = 0;
    const total = batches.reduce((sum, b) => sum + b.frames.length, 0);

    for (const batch of batches) {
      for (const frame of batch.frames) {
        // Generate frame (placeholder for now)
        const url = await this.generateFrame(frame);
        this.generatedFrames.set(frame.id, url);
        frame.generatedUrl = url;

        completed++;
        this.progress('generating', (completed / total) * 100, `Generated ${completed}/${total} frames`);
      }
    }
  }

  private async generateFrame(frame: PlannedFrame): Promise<string> {
    // Placeholder - would call Gemini here
    const hue = Math.random() * 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <rect width="100%" height="100%" fill="hsl(${hue}, 50%, 20%)"/>
      <text x="256" y="256" text-anchor="middle" fill="white" font-size="16">${frame.category}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  // ============================================================================
  // COMPOSITION & RENDERING
  // ============================================================================

  private async composeTimeline(): Promise<void> {
    // Timeline composition logic
    this.log('Composing timeline...', 'info');
  }

  private async renderAndExport(): Promise<Blob> {
    if (!this.plan) throw new Error('No plan available');

    const { resolution, fps } = this.plan.export;

    // Create canvas
    this.renderCanvas = document.createElement('canvas');
    this.renderCanvas.width = resolution.width;
    this.renderCanvas.height = resolution.height;
    this.renderCtx = this.renderCanvas.getContext('2d')!;

    // Render all frames
    const totalFrames = this.plan.metadata.estimatedDuration * fps;
    const renderedFrames: ImageData[] = [];

    for (let i = 0; i < totalFrames; i++) {
      await this.renderFrame(i);
      renderedFrames.push(this.renderCtx.getImageData(0, 0, resolution.width, resolution.height));

      if (i % fps === 0) {
        this.progress('rendering', (i / totalFrames) * 100, `Rendering frame ${i}/${totalFrames}`);
      }
    }

    // Encode to video
    return this.encodeVideo(renderedFrames, fps);
  }

  private async renderFrame(frameNum: number): Promise<void> {
    if (!this.renderCtx || !this.renderCanvas || !this.plan) return;

    const { width, height } = this.plan.export.resolution;

    // Clear
    this.renderCtx.fillStyle = '#000';
    this.renderCtx.fillRect(0, 0, width, height);

    // Find current shot
    const shot = this.plan.structure.scenes
      .flatMap(s => s.shots)
      .find(s => s.startFrame <= frameNum && s.endFrame > frameNum);

    if (!shot) return;

    // Get frame image
    const frameId = shot.frameSource.frameIds?.[0];
    const imageUrl = frameId ? this.generatedFrames.get(frameId) : null;

    if (imageUrl) {
      const img = await this.loadImage(imageUrl);

      // Apply camera
      const camera = this.interpolateCamera(shot.camera, frameNum);
      this.applyCameraTransform(camera);

      // Draw image
      this.renderCtx.drawImage(img, 0, 0, width, height);

      // Reset transform
      this.renderCtx.setTransform(1, 0, 0, 1, 0, 0);

      // Apply effects
      for (const effect of shot.effects) {
        this.applyEffect(effect);
      }
    }
  }

  private interpolateCamera(keyframes: CameraKeyframe[], frameNum: number): CameraPosition {
    if (keyframes.length === 0) return this.defaultCameraPosition();
    if (keyframes.length === 1) return keyframes[0].position;

    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].frame <= frameNum && keyframes[i + 1].frame >= frameNum) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }

    // Interpolate
    const t = (frameNum - prev.frame) / (next.frame - prev.frame || 1);
    const lerp = (a: number, b: number) => a + (b - a) * t;

    return {
      x: lerp(prev.position.x, next.position.x),
      y: lerp(prev.position.y, next.position.y),
      zoom: lerp(prev.position.zoom, next.position.zoom),
      rotation: lerp(prev.position.rotation, next.position.rotation),
      fov: lerp(prev.position.fov, next.position.fov),
      depthOffset: lerp(prev.position.depthOffset, next.position.depthOffset),
      shake: prev.position.shake,
      crop: prev.position.crop,
    };
  }

  private applyCameraTransform(camera: CameraPosition): void {
    if (!this.renderCtx || !this.renderCanvas) return;

    const { width, height } = this.renderCanvas;
    const cx = width / 2;
    const cy = height / 2;

    this.renderCtx.translate(cx, cy);
    this.renderCtx.rotate((camera.rotation * Math.PI) / 180);
    this.renderCtx.scale(camera.zoom, camera.zoom);
    this.renderCtx.translate(-cx + camera.x * width, -cy + camera.y * height);
  }

  private applyEffect(effect: VirtualFrameEffect): void {
    // Effect application logic
    // Would implement each effect type
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private async encodeVideo(frames: ImageData[], fps: number): Promise<Blob> {
    if (!this.renderCanvas) throw new Error('No render canvas');

    return new Promise((resolve, reject) => {
      const stream = this.renderCanvas!.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      recorder.onerror = (e) => reject(e);

      recorder.start();

      // Play frames
      let i = 0;
      const playFrame = () => {
        if (i < frames.length) {
          this.renderCtx!.putImageData(frames[i], 0, 0);
          i++;
          setTimeout(playFrame, 1000 / fps);
        } else {
          recorder.stop();
        }
      };

      playFrame();
    });
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    this.onLog?.(message, level);
    console[level](`[Pipeline] ${message}`);
  }

  private progress(stage: string, percent: number, message: string): void {
    this.onProgress?.(stage, percent, message);
  }
}

// ============================================================================
// TYPES
// ============================================================================

type AnimationType = 'music-video' | 'narrative' | 'product' | 'tutorial' | 'transformation' | 'loop';

interface ShotPattern {
  type: ShotType;
  durationRatio: number;
  camera: string;
  description: string;
  isVirtual: boolean;
}

// ============================================================================
// EXPORT
// ============================================================================

export default ProductionPipeline;
