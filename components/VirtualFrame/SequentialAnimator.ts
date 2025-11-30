/**
 * SequentialAnimator.ts
 *
 * System for generating and playing sequential story-based animations.
 * Supports multiple sprite sheets with unique frames for narratives,
 * transformations, tutorials, and any sequential content.
 *
 * Unlike dance mode (looping poses), this creates linear progressions
 * where each frame advances the story/sequence.
 */

// ============================================================================
// TYPES
// ============================================================================

export type AnimationMode = 'dance' | 'story' | 'product-360' | 'transformation' | 'tutorial' | 'custom';

export interface AnimationProject {
  id: string;
  name: string;
  mode: AnimationMode;
  description?: string;

  // Source
  sourceImage: string;         // Base64 or URL
  sourcePrompt?: string;       // User's description of what to animate

  // Generation config
  sheetsCount: number;         // Number of sprite sheets (e.g., 10)
  framesPerSheet: number;      // Frames per sheet (e.g., 12)
  totalFrames: number;         // Total unique frames (e.g., 120)

  // Story/Sequence config
  storyBeats?: StoryBeat[];    // Key moments in the sequence
  style: string;               // Visual style preset ID

  // Generated content
  sheets: SpriteSheet[];
  status: 'draft' | 'generating' | 'ready' | 'error';
  progress: GenerationProgress;
}

export interface StoryBeat {
  frameIndex: number;          // Which frame this beat occurs at
  description: string;         // What happens at this moment
  emotion?: string;            // Character emotion
  action?: string;             // Physical action
  cameraHint?: 'wide' | 'medium' | 'close' | 'extreme-close';
}

export interface SpriteSheet {
  id: string;
  index: number;               // 0-9 for 10 sheets
  url?: string;                // Generated sheet URL
  frames: SequentialFrame[];
  status: 'pending' | 'generating' | 'ready' | 'error';
}

export interface SequentialFrame {
  id: string;
  globalIndex: number;         // 0-119 for 120 frames
  sheetIndex: number;          // Which sheet (0-9)
  localIndex: number;          // Position in sheet (0-11)
  url?: string;
  prompt?: string;             // What was requested for this frame
  storyBeat?: StoryBeat;       // Associated story beat if any
}

export interface GenerationProgress {
  totalSheets: number;
  completedSheets: number;
  currentSheet: number;
  totalFrames: number;
  completedFrames: number;
  estimatedTimeRemaining?: number;
  errors: string[];
}

// ============================================================================
// ANIMATION MODE PRESETS
// ============================================================================

export const ANIMATION_MODE_CONFIGS: Record<AnimationMode, AnimationModeConfig> = {
  'dance': {
    name: 'Dance / Music Video',
    description: 'Looping poses synced to audio beats',
    defaultSheets: 1,
    defaultFramesPerSheet: 12,
    supportsAudio: true,
    isLooping: true,
    promptStrategy: 'pose-variation',
    icon: 'Music',
  },
  'story': {
    name: 'Sequential Story',
    description: 'Linear narrative with unique frames',
    defaultSheets: 10,
    defaultFramesPerSheet: 12,
    supportsAudio: true,
    isLooping: false,
    promptStrategy: 'story-progression',
    icon: 'BookOpen',
  },
  'product-360': {
    name: 'Product 360°',
    description: 'Smooth rotation around a product',
    defaultSheets: 3,
    defaultFramesPerSheet: 12,
    supportsAudio: false,
    isLooping: true,
    promptStrategy: 'rotation-angles',
    icon: 'Box',
  },
  'transformation': {
    name: 'Transformation',
    description: 'Morph from one state to another',
    defaultSheets: 5,
    defaultFramesPerSheet: 12,
    supportsAudio: true,
    isLooping: false,
    promptStrategy: 'morph-stages',
    icon: 'Sparkles',
  },
  'tutorial': {
    name: 'Tutorial / How-To',
    description: 'Step-by-step instruction sequence',
    defaultSheets: 8,
    defaultFramesPerSheet: 12,
    supportsAudio: true,
    isLooping: false,
    promptStrategy: 'instruction-steps',
    icon: 'GraduationCap',
  },
  'custom': {
    name: 'Custom Sequence',
    description: 'Define your own frame-by-frame animation',
    defaultSheets: 5,
    defaultFramesPerSheet: 12,
    supportsAudio: true,
    isLooping: false,
    promptStrategy: 'custom',
    icon: 'Wand2',
  },
};

export interface AnimationModeConfig {
  name: string;
  description: string;
  defaultSheets: number;
  defaultFramesPerSheet: number;
  supportsAudio: boolean;
  isLooping: boolean;
  promptStrategy: PromptStrategy;
  icon: string;
}

type PromptStrategy =
  | 'pose-variation'      // Dance: different poses of same character
  | 'story-progression'   // Story: narrative advancement
  | 'rotation-angles'     // Product: camera angles around object
  | 'morph-stages'        // Transform: gradual change between states
  | 'instruction-steps'   // Tutorial: step-by-step actions
  | 'custom';             // User defines each frame

// ============================================================================
// STORY BEAT GENERATOR
// ============================================================================

/**
 * Generate story beats from a user's description
 * These define key moments in the animation
 */
export function generateStoryBeats(
  description: string,
  totalFrames: number,
  mode: AnimationMode
): StoryBeat[] {
  const beats: StoryBeat[] = [];

  // For now, distribute beats evenly
  // In production, use AI to parse the description
  const beatCount = Math.min(Math.floor(totalFrames / 10), 12);
  const interval = Math.floor(totalFrames / beatCount);

  for (let i = 0; i < beatCount; i++) {
    beats.push({
      frameIndex: i * interval,
      description: `Beat ${i + 1}`,
      emotion: 'neutral',
      action: 'continue',
      cameraHint: i % 3 === 0 ? 'wide' : i % 3 === 1 ? 'medium' : 'close',
    });
  }

  return beats;
}

// ============================================================================
// PROMPT GENERATORS BY STRATEGY
// ============================================================================

export function generateFramePrompt(
  frame: SequentialFrame,
  project: AnimationProject,
  previousFrame?: SequentialFrame
): string {
  const strategy = ANIMATION_MODE_CONFIGS[project.mode].promptStrategy;
  const totalFrames = project.totalFrames;
  const progress = frame.globalIndex / totalFrames; // 0 to 1

  switch (strategy) {
    case 'story-progression':
      return generateStoryPrompt(frame, project, progress);

    case 'rotation-angles':
      return generateRotationPrompt(frame, totalFrames);

    case 'morph-stages':
      return generateMorphPrompt(frame, project, progress);

    case 'instruction-steps':
      return generateTutorialPrompt(frame, project, progress);

    case 'pose-variation':
      return generateDancePrompt(frame, project);

    case 'custom':
      return frame.prompt || project.sourcePrompt || '';

    default:
      return project.sourcePrompt || '';
  }
}

function generateStoryPrompt(
  frame: SequentialFrame,
  project: AnimationProject,
  progress: number
): string {
  const beat = frame.storyBeat;
  const basePrompt = project.sourcePrompt || '';

  let prompt = `Frame ${frame.globalIndex + 1} of ${project.totalFrames}. `;
  prompt += `Story progress: ${Math.round(progress * 100)}%. `;

  if (beat) {
    prompt += `Key moment: ${beat.description}. `;
    if (beat.emotion) prompt += `Emotion: ${beat.emotion}. `;
    if (beat.action) prompt += `Action: ${beat.action}. `;
    if (beat.cameraHint) prompt += `Camera: ${beat.cameraHint} shot. `;
  } else {
    // Interpolate between beats
    prompt += `Transitional frame, smooth continuation. `;
  }

  prompt += basePrompt;
  return prompt;
}

function generateRotationPrompt(frame: SequentialFrame, totalFrames: number): string {
  const angle = (frame.globalIndex / totalFrames) * 360;
  return `Product shot at ${Math.round(angle)}° rotation. Clean background, professional lighting, consistent scale.`;
}

function generateMorphPrompt(
  frame: SequentialFrame,
  project: AnimationProject,
  progress: number
): string {
  const stage = Math.round(progress * 100);
  return `Transformation ${stage}% complete. Smooth morph transition. ${project.sourcePrompt || ''}`;
}

function generateTutorialPrompt(
  frame: SequentialFrame,
  project: AnimationProject,
  progress: number
): string {
  const step = Math.floor(progress * 10) + 1;
  return `Tutorial step ${step}. Clear demonstration pose. ${project.sourcePrompt || ''}`;
}

function generateDancePrompt(frame: SequentialFrame, project: AnimationProject): string {
  const poses = ['idle', 'left-step', 'right-step', 'arms-up', 'lean-left', 'lean-right'];
  const pose = poses[frame.localIndex % poses.length];
  return `Dance pose: ${pose}. Dynamic, energetic. ${project.sourcePrompt || ''}`;
}

// ============================================================================
// BATCH GENERATION ORCHESTRATOR
// ============================================================================

export interface BatchGenerationConfig {
  project: AnimationProject;
  parallelSheets: number;      // How many sheets to generate simultaneously (e.g., 3)
  onSheetComplete: (sheet: SpriteSheet) => void;
  onFrameComplete: (frame: SequentialFrame) => void;
  onProgress: (progress: GenerationProgress) => void;
  onError: (error: string, sheetIndex: number) => void;
}

/**
 * Orchestrates parallel generation of multiple sprite sheets
 */
export class BatchGenerator {
  private config: BatchGenerationConfig;
  private abortController: AbortController | null = null;
  private progress: GenerationProgress;

  constructor(config: BatchGenerationConfig) {
    this.config = config;
    this.progress = {
      totalSheets: config.project.sheetsCount,
      completedSheets: 0,
      currentSheet: 0,
      totalFrames: config.project.totalFrames,
      completedFrames: 0,
      errors: [],
    };
  }

  /**
   * Start batch generation with parallel processing
   */
  async generate(
    generateSheetFn: (sheet: SpriteSheet, project: AnimationProject) => Promise<SpriteSheet>
  ): Promise<SpriteSheet[]> {
    this.abortController = new AbortController();
    const { project, parallelSheets } = this.config;
    const results: SpriteSheet[] = [];

    // Process sheets in parallel batches
    for (let batchStart = 0; batchStart < project.sheetsCount; batchStart += parallelSheets) {
      if (this.abortController.signal.aborted) break;

      const batchEnd = Math.min(batchStart + parallelSheets, project.sheetsCount);
      const batchSheets = project.sheets.slice(batchStart, batchEnd);

      // Generate this batch in parallel
      const batchPromises = batchSheets.map(async (sheet) => {
        try {
          this.progress.currentSheet = sheet.index;
          this.config.onProgress({ ...this.progress });

          const completedSheet = await generateSheetFn(sheet, project);

          this.progress.completedSheets++;
          this.progress.completedFrames += project.framesPerSheet;
          this.config.onSheetComplete(completedSheet);
          this.config.onProgress({ ...this.progress });

          return completedSheet;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          this.progress.errors.push(`Sheet ${sheet.index}: ${errorMsg}`);
          this.config.onError(errorMsg, sheet.index);
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  /**
   * Abort generation
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * Get current progress
   */
  getProgress(): GenerationProgress {
    return { ...this.progress };
  }
}

// ============================================================================
// PROJECT FACTORY
// ============================================================================

/**
 * Create a new animation project with default configuration
 */
export function createAnimationProject(
  mode: AnimationMode,
  sourceImage: string,
  options: Partial<AnimationProject> = {}
): AnimationProject {
  const config = ANIMATION_MODE_CONFIGS[mode];
  const sheetsCount = options.sheetsCount ?? config.defaultSheets;
  const framesPerSheet = options.framesPerSheet ?? config.defaultFramesPerSheet;
  const totalFrames = sheetsCount * framesPerSheet;

  // Create empty sheets structure
  const sheets: SpriteSheet[] = [];
  let globalFrameIndex = 0;

  for (let sheetIndex = 0; sheetIndex < sheetsCount; sheetIndex++) {
    const frames: SequentialFrame[] = [];

    for (let localIndex = 0; localIndex < framesPerSheet; localIndex++) {
      frames.push({
        id: `frame-${sheetIndex}-${localIndex}`,
        globalIndex: globalFrameIndex,
        sheetIndex,
        localIndex,
      });
      globalFrameIndex++;
    }

    sheets.push({
      id: `sheet-${sheetIndex}`,
      index: sheetIndex,
      frames,
      status: 'pending',
    });
  }

  // Generate story beats if needed
  const storyBeats = mode !== 'dance' && mode !== 'product-360'
    ? generateStoryBeats(options.sourcePrompt || '', totalFrames, mode)
    : undefined;

  // Assign beats to frames
  if (storyBeats) {
    for (const beat of storyBeats) {
      const sheetIndex = Math.floor(beat.frameIndex / framesPerSheet);
      const localIndex = beat.frameIndex % framesPerSheet;
      if (sheets[sheetIndex]?.frames[localIndex]) {
        sheets[sheetIndex].frames[localIndex].storyBeat = beat;
      }
    }
  }

  return {
    id: `project-${Date.now()}`,
    name: options.name || `${config.name} Project`,
    mode,
    description: options.description,
    sourceImage,
    sourcePrompt: options.sourcePrompt,
    sheetsCount,
    framesPerSheet,
    totalFrames,
    storyBeats,
    style: options.style || 'natural',
    sheets,
    status: 'draft',
    progress: {
      totalSheets: sheetsCount,
      completedSheets: 0,
      currentSheet: 0,
      totalFrames,
      completedFrames: 0,
      errors: [],
    },
  };
}

// ============================================================================
// SEQUENTIAL PLAYBACK CONTROLLER
// ============================================================================

export interface PlaybackState {
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;       // 1.0 = normal, 0.5 = half speed, 2.0 = double
  loopMode: 'none' | 'loop' | 'ping-pong';
  direction: 1 | -1;           // For ping-pong
}

export class SequentialPlayer {
  private project: AnimationProject;
  private state: PlaybackState;
  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 24; // 24 FPS default
  private onFrameChange?: (frame: SequentialFrame) => void;

  constructor(project: AnimationProject) {
    this.project = project;

    const config = ANIMATION_MODE_CONFIGS[project.mode];
    this.state = {
      currentFrame: 0,
      isPlaying: false,
      playbackSpeed: 1.0,
      loopMode: config.isLooping ? 'loop' : 'none',
      direction: 1,
    };
  }

  setFPS(fps: number): void {
    this.frameInterval = 1000 / fps;
  }

  setSpeed(speed: number): void {
    this.state.playbackSpeed = Math.max(0.1, Math.min(4.0, speed));
  }

  setLoopMode(mode: 'none' | 'loop' | 'ping-pong'): void {
    this.state.loopMode = mode;
  }

  play(): void {
    this.state.isPlaying = true;
  }

  pause(): void {
    this.state.isPlaying = false;
  }

  stop(): void {
    this.state.isPlaying = false;
    this.state.currentFrame = 0;
    this.state.direction = 1;
  }

  seekTo(frame: number): void {
    this.state.currentFrame = Math.max(0, Math.min(frame, this.project.totalFrames - 1));
  }

  seekToPercent(percent: number): void {
    const frame = Math.floor((percent / 100) * this.project.totalFrames);
    this.seekTo(frame);
  }

  onFrame(callback: (frame: SequentialFrame) => void): void {
    this.onFrameChange = callback;
  }

  /**
   * Call this in your animation loop
   */
  update(timestamp: number): SequentialFrame | null {
    if (!this.state.isPlaying) {
      return this.getCurrentFrame();
    }

    const elapsed = timestamp - this.lastFrameTime;
    const adjustedInterval = this.frameInterval / this.state.playbackSpeed;

    if (elapsed >= adjustedInterval) {
      this.lastFrameTime = timestamp;
      this.advanceFrame();
    }

    return this.getCurrentFrame();
  }

  private advanceFrame(): void {
    const { totalFrames } = this.project;
    let nextFrame = this.state.currentFrame + this.state.direction;

    switch (this.state.loopMode) {
      case 'none':
        if (nextFrame >= totalFrames) {
          this.state.isPlaying = false;
          nextFrame = totalFrames - 1;
        } else if (nextFrame < 0) {
          this.state.isPlaying = false;
          nextFrame = 0;
        }
        break;

      case 'loop':
        if (nextFrame >= totalFrames) {
          nextFrame = 0;
        } else if (nextFrame < 0) {
          nextFrame = totalFrames - 1;
        }
        break;

      case 'ping-pong':
        if (nextFrame >= totalFrames) {
          this.state.direction = -1;
          nextFrame = totalFrames - 2;
        } else if (nextFrame < 0) {
          this.state.direction = 1;
          nextFrame = 1;
        }
        break;
    }

    this.state.currentFrame = nextFrame;

    const frame = this.getCurrentFrame();
    if (frame && this.onFrameChange) {
      this.onFrameChange(frame);
    }
  }

  getCurrentFrame(): SequentialFrame | null {
    const sheetIndex = Math.floor(this.state.currentFrame / this.project.framesPerSheet);
    const localIndex = this.state.currentFrame % this.project.framesPerSheet;
    return this.project.sheets[sheetIndex]?.frames[localIndex] || null;
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  getProgress(): number {
    return (this.state.currentFrame / this.project.totalFrames) * 100;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createAnimationProject,
  generateStoryBeats,
  generateFramePrompt,
  BatchGenerator,
  SequentialPlayer,
  ANIMATION_MODE_CONFIGS,
};
