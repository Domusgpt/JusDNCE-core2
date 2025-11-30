/**
 * batchGeneration.ts
 *
 * Intelligent batch generation system for creating multi-scene cartoons.
 * Generates 120+ unique frames and smartly reuses them with camera motions,
 * crops, pans, zooms, and holds to create extended animations efficiently.
 *
 * Key Features:
 * - Batch generation (10 sheets × 12 frames = 120 unique frames)
 * - Smart frame recycling for repeated movements
 * - Camera motion generation (pan, zoom, crop, rotate)
 * - Scene-based storyboarding
 * - Efficiency optimization (minimize AI calls, maximize output)
 */

import { GoogleGenAI } from "@google/genai";
import { GeneratedFrame, EnergyLevel, SubjectCategory } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface CartoonProject {
  id: string;
  name: string;
  sourceImage: string;
  style: string;
  scenes: Scene[];
  frameLibrary: FrameLibrary;
  timeline: TimelineTrack[];
  settings: ProjectSettings;
  status: ProjectStatus;
}

export interface ProjectSettings {
  totalDurationSeconds: number;
  fps: number;
  resolution: { width: number; height: number };
  batchSize: number;           // Frames per generation batch (120)
  parallelBatches: number;     // Concurrent API calls (3)
  reuseThreshold: number;      // How similar frames can be before reuse (0.8)
}

export type ProjectStatus = 'planning' | 'generating' | 'composing' | 'ready' | 'error';

// ============================================================================
// SCENE SYSTEM
// ============================================================================

export interface Scene {
  id: string;
  name: string;
  description: string;
  durationFrames: number;
  shots: Shot[];
  transitions: {
    in: TransitionType;
    out: TransitionType;
  };
}

export interface Shot {
  id: string;
  type: ShotType;
  frameRef: string;            // Reference to frame in library
  duration: number;            // Duration in frames
  camera: CameraMotion;
  audio?: AudioCue;
}

export type ShotType =
  | 'action'                   // Unique generated frame
  | 'hold'                     // Static frame held
  | 'loop'                     // Repeating frames
  | 'pan'                      // Single frame with pan motion
  | 'zoom'                     // Single frame with zoom
  | 'crop-motion'              // Crop moving across frame
  | 'shake'                    // Frame with shake effect
  | 'transition';              // Between scenes

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe-left'
  | 'wipe-right'
  | 'zoom-in'
  | 'zoom-out';

// ============================================================================
// CAMERA MOTION SYSTEM
// ============================================================================

export interface CameraMotion {
  type: CameraMotionType;
  startPos: CameraState;
  endPos: CameraState;
  easing: EasingType;
  duration: number;            // Frames
}

export interface CameraState {
  x: number;                   // Pan X (0 = center, -1 to 1)
  y: number;                   // Pan Y
  zoom: number;                // 1.0 = normal, 2.0 = 2x zoom
  rotation: number;            // Degrees
  cropRect?: CropRect;         // Optional crop for focus
}

export interface CropRect {
  x: number;                   // 0-1 normalized
  y: number;
  width: number;
  height: number;
}

export type CameraMotionType =
  | 'static'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-push'                // Slow zoom in for drama
  | 'ken-burns'                // Pan + zoom combo
  | 'shake'
  | 'rotate'
  | 'crop-slide';              // Slide crop across frame

export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic';

// ============================================================================
// FRAME LIBRARY
// ============================================================================

export interface FrameLibrary {
  uniqueFrames: UniqueFrame[];
  categories: FrameCategory[];
  totalGenerated: number;
  reusableCount: number;       // Frames marked for reuse
}

export interface UniqueFrame {
  id: string;
  url: string;
  category: string;            // 'action', 'idle', 'emotion', etc.
  tags: string[];              // ['happy', 'running', 'facing-left']
  usageCount: number;          // How many times used in timeline
  generationPrompt: string;
  metadata: {
    sheetIndex: number;
    frameIndex: number;
    energy: EnergyLevel;
  };
}

export interface FrameCategory {
  id: string;
  name: string;
  description: string;
  frameIds: string[];
}

// ============================================================================
// TIMELINE SYSTEM
// ============================================================================

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'effects';
  clips: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  startFrame: number;
  endFrame: number;
  source: ClipSource;
  effects: ClipEffect[];
}

export interface ClipSource {
  type: 'frame' | 'loop' | 'transition';
  frameRef?: string;
  loopFrames?: string[];
  transitionType?: TransitionType;
}

export interface ClipEffect {
  type: EffectType;
  params: Record<string, number | string>;
}

export type EffectType =
  | 'pan'
  | 'zoom'
  | 'rotate'
  | 'shake'
  | 'blur'
  | 'grain'
  | 'vignette'
  | 'chromatic-aberration';

// ============================================================================
// AUDIO CUES
// ============================================================================

export interface AudioCue {
  type: 'sfx' | 'music' | 'dialogue';
  startFrame: number;
  duration: number;
  intensity?: number;
}

// ============================================================================
// SMART GENERATION PLANNER
// ============================================================================

export interface GenerationPlan {
  batches: GenerationBatch[];
  totalUniqueFrames: number;
  estimatedCost: number;
  estimatedTime: number;
  reuseStrategy: ReuseStrategy;
}

export interface GenerationBatch {
  id: string;
  index: number;
  frames: PlannedFrame[];
  status: 'pending' | 'generating' | 'complete' | 'error';
  priority: number;            // Higher = generate first
}

export interface PlannedFrame {
  id: string;
  prompt: string;
  category: string;
  tags: string[];
  isReusable: boolean;         // Can this be recycled?
  reuseFor: string[];          // What scenes/shots can reuse this
}

export interface ReuseStrategy {
  idleFrames: number;          // Generic idle poses to reuse
  walkCycleFrames: number;     // Walk cycle to loop
  emotionFrames: number;       // Expressions to mix in
  transitionFrames: number;    // Generic transitions
  uniqueActionFrames: number;  // Story-specific unique frames
}

// ============================================================================
// SMART GENERATION PLANNER CLASS
// ============================================================================

export class CartoonPlanner {
  private project: CartoonProject;

  constructor(project: CartoonProject) {
    this.project = project;
  }

  /**
   * Analyze scenes and create an efficient generation plan
   */
  createGenerationPlan(): GenerationPlan {
    const scenes = this.project.scenes;
    const settings = this.project.settings;

    // 1. Identify reusable frame types
    const reuseStrategy = this.analyzeReuseOpportunities(scenes);

    // 2. Plan unique frames needed
    const uniqueFramesNeeded = this.calculateUniqueFrames(scenes, reuseStrategy);

    // 3. Organize into batches of 120
    const batches = this.organizeBatches(uniqueFramesNeeded, settings.batchSize);

    // 4. Calculate estimates
    const estimatedCost = batches.length * settings.batchSize * 0.002; // ~$0.002 per frame
    const estimatedTime = (batches.length / settings.parallelBatches) * 30; // ~30s per batch

    return {
      batches,
      totalUniqueFrames: uniqueFramesNeeded.length,
      estimatedCost,
      estimatedTime,
      reuseStrategy,
    };
  }

  private analyzeReuseOpportunities(scenes: Scene[]): ReuseStrategy {
    // Count how many times we need similar frame types
    let idleNeeded = 0;
    let walkNeeded = 0;
    let emotionNeeded = 0;
    let transitionNeeded = 0;
    let uniqueNeeded = 0;

    for (const scene of scenes) {
      for (const shot of scene.shots) {
        switch (shot.type) {
          case 'hold':
            idleNeeded++;
            break;
          case 'loop':
            walkNeeded += 8; // Walk cycle needs ~8 frames
            break;
          case 'action':
            uniqueNeeded++;
            break;
          case 'transition':
            transitionNeeded++;
            break;
          default:
            // Pans, zooms, etc. can reuse existing frames
            break;
        }
      }
    }

    return {
      idleFrames: Math.min(idleNeeded, 12),        // Cap reusable idle frames
      walkCycleFrames: Math.min(walkNeeded, 16),   // Two walk cycles
      emotionFrames: 8,                             // Happy, sad, angry, etc.
      transitionFrames: Math.min(transitionNeeded, 6),
      uniqueActionFrames: uniqueNeeded,
    };
  }

  private calculateUniqueFrames(scenes: Scene[], strategy: ReuseStrategy): PlannedFrame[] {
    const frames: PlannedFrame[] = [];
    let frameId = 0;

    // 1. Generate reusable frame library first (these get reused)
    // Idle poses
    for (let i = 0; i < strategy.idleFrames; i++) {
      frames.push({
        id: `idle-${frameId++}`,
        prompt: `Character in relaxed idle pose, variation ${i + 1}`,
        category: 'idle',
        tags: ['idle', 'reusable', 'static'],
        isReusable: true,
        reuseFor: ['holds', 'backgrounds', 'reactions'],
      });
    }

    // Walk cycle
    const walkPhases = ['contact-left', 'passing-left', 'contact-right', 'passing-right'];
    for (let cycle = 0; cycle < Math.ceil(strategy.walkCycleFrames / 4); cycle++) {
      for (const phase of walkPhases) {
        frames.push({
          id: `walk-${frameId++}`,
          prompt: `Character walking, ${phase} phase, cycle ${cycle + 1}`,
          category: 'walk',
          tags: ['walk', 'loop', 'reusable', phase],
          isReusable: true,
          reuseFor: ['walk-scenes', 'movement'],
        });
      }
    }

    // Emotions
    const emotions = ['happy', 'sad', 'angry', 'surprised', 'thinking', 'laughing', 'worried', 'determined'];
    for (let i = 0; i < Math.min(strategy.emotionFrames, emotions.length); i++) {
      frames.push({
        id: `emotion-${frameId++}`,
        prompt: `Character expressing ${emotions[i]} emotion, clear facial expression`,
        category: 'emotion',
        tags: ['emotion', 'reusable', emotions[i]],
        isReusable: true,
        reuseFor: ['reactions', 'dialogue', 'cutaways'],
      });
    }

    // 2. Generate unique action frames for story
    for (const scene of scenes) {
      for (const shot of scene.shots) {
        if (shot.type === 'action') {
          frames.push({
            id: `action-${frameId++}`,
            prompt: `Scene: ${scene.description}. Action: ${shot.frameRef}`,
            category: 'action',
            tags: ['action', 'unique', scene.id],
            isReusable: false,
            reuseFor: [],
          });
        }
      }
    }

    return frames;
  }

  private organizeBatches(frames: PlannedFrame[], batchSize: number): GenerationBatch[] {
    const batches: GenerationBatch[] = [];

    // Prioritize reusable frames (generate first)
    const reusableFrames = frames.filter(f => f.isReusable);
    const uniqueFrames = frames.filter(f => !f.isReusable);

    // Sort by priority
    const sortedFrames = [...reusableFrames, ...uniqueFrames];

    // Chunk into batches
    for (let i = 0; i < sortedFrames.length; i += batchSize) {
      batches.push({
        id: `batch-${batches.length}`,
        index: batches.length,
        frames: sortedFrames.slice(i, i + batchSize),
        status: 'pending',
        priority: i < reusableFrames.length ? 10 : 5, // Reusables first
      });
    }

    return batches;
  }
}

// ============================================================================
// CAMERA MOTION GENERATOR
// ============================================================================

export class CameraMotionGenerator {
  /**
   * Generate camera motion that creates movement from a static frame
   */
  static createPanMotion(
    duration: number,
    direction: 'left' | 'right' | 'up' | 'down',
    intensity: number = 0.2
  ): CameraMotion {
    const start: CameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };
    const end: CameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };

    switch (direction) {
      case 'left':
        start.x = intensity;
        end.x = -intensity;
        break;
      case 'right':
        start.x = -intensity;
        end.x = intensity;
        break;
      case 'up':
        start.y = intensity;
        end.y = -intensity;
        break;
      case 'down':
        start.y = -intensity;
        end.y = intensity;
        break;
    }

    return {
      type: `pan-${direction}` as CameraMotionType,
      startPos: start,
      endPos: end,
      easing: 'ease-in-out',
      duration,
    };
  }

  /**
   * Ken Burns effect - slow zoom with pan for dramatic effect
   */
  static createKenBurns(
    duration: number,
    zoomIn: boolean = true,
    panDirection: 'left' | 'right' = 'right'
  ): CameraMotion {
    const zoomStart = zoomIn ? 1.0 : 1.3;
    const zoomEnd = zoomIn ? 1.3 : 1.0;
    const panAmount = 0.15;

    return {
      type: 'ken-burns',
      startPos: {
        x: panDirection === 'right' ? -panAmount : panAmount,
        y: 0,
        zoom: zoomStart,
        rotation: 0,
      },
      endPos: {
        x: panDirection === 'right' ? panAmount : -panAmount,
        y: 0,
        zoom: zoomEnd,
        rotation: 0,
      },
      easing: 'ease-in-out',
      duration,
    };
  }

  /**
   * Create zoom push for dramatic moments
   */
  static createZoomPush(duration: number, intensity: number = 0.3): CameraMotion {
    return {
      type: 'zoom-push',
      startPos: { x: 0, y: 0, zoom: 1.0, rotation: 0 },
      endPos: { x: 0, y: 0, zoom: 1.0 + intensity, rotation: 0 },
      easing: 'ease-out',
      duration,
    };
  }

  /**
   * Create camera shake for impact
   */
  static createShake(duration: number, intensity: number = 0.05): CameraMotion {
    return {
      type: 'shake',
      startPos: { x: 0, y: 0, zoom: 1, rotation: 0 },
      endPos: { x: intensity, y: intensity, zoom: 1, rotation: intensity * 10 },
      easing: 'linear',
      duration,
    };
  }

  /**
   * Create crop slide - moves a crop window across the frame
   * Great for creating motion from a wide establishing shot
   */
  static createCropSlide(
    duration: number,
    startCrop: CropRect,
    endCrop: CropRect
  ): CameraMotion {
    return {
      type: 'crop-slide',
      startPos: { x: 0, y: 0, zoom: 1, rotation: 0, cropRect: startCrop },
      endPos: { x: 0, y: 0, zoom: 1, rotation: 0, cropRect: endCrop },
      easing: 'ease-in-out',
      duration,
    };
  }

  /**
   * Interpolate camera state for a given progress (0-1)
   */
  static interpolate(motion: CameraMotion, progress: number): CameraState {
    const t = this.applyEasing(progress, motion.easing);

    const lerp = (a: number, b: number) => a + (b - a) * t;

    const result: CameraState = {
      x: lerp(motion.startPos.x, motion.endPos.x),
      y: lerp(motion.startPos.y, motion.endPos.y),
      zoom: lerp(motion.startPos.zoom, motion.endPos.zoom),
      rotation: lerp(motion.startPos.rotation, motion.endPos.rotation),
    };

    // Interpolate crop if present
    if (motion.startPos.cropRect && motion.endPos.cropRect) {
      result.cropRect = {
        x: lerp(motion.startPos.cropRect.x, motion.endPos.cropRect.x),
        y: lerp(motion.startPos.cropRect.y, motion.endPos.cropRect.y),
        width: lerp(motion.startPos.cropRect.width, motion.endPos.cropRect.width),
        height: lerp(motion.startPos.cropRect.height, motion.endPos.cropRect.height),
      };
    }

    return result;
  }

  private static applyEasing(t: number, easing: EasingType): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'bounce':
        if (t < 0.5) return 4 * t * t * t;
        return 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'elastic':
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
      default:
        return t;
    }
  }
}

// ============================================================================
// TIMELINE COMPOSER
// ============================================================================

export class TimelineComposer {
  private project: CartoonProject;
  private timeline: TimelineTrack[] = [];

  constructor(project: CartoonProject) {
    this.project = project;
    this.timeline = [
      { id: 'video', type: 'video', clips: [] },
      { id: 'audio', type: 'audio', clips: [] },
      { id: 'effects', type: 'effects', clips: [] },
    ];
  }

  /**
   * Convert scenes into a playable timeline
   */
  compose(): TimelineTrack[] {
    let currentFrame = 0;

    for (const scene of this.project.scenes) {
      // Add transition in
      if (scene.transitions.in !== 'cut') {
        currentFrame = this.addTransition(currentFrame, scene.transitions.in, 24);
      }

      // Add shots
      for (const shot of scene.shots) {
        currentFrame = this.addShot(currentFrame, shot);
      }

      // Add transition out
      if (scene.transitions.out !== 'cut') {
        currentFrame = this.addTransition(currentFrame, scene.transitions.out, 24);
      }
    }

    return this.timeline;
  }

  private addShot(startFrame: number, shot: Shot): number {
    const videoTrack = this.timeline.find(t => t.type === 'video')!;
    const effectsTrack = this.timeline.find(t => t.type === 'effects')!;

    const endFrame = startFrame + shot.duration;

    // Main video clip
    const clip: TimelineClip = {
      id: `clip-${videoTrack.clips.length}`,
      startFrame,
      endFrame,
      source: this.createClipSource(shot),
      effects: [],
    };

    // Add camera motion as effect
    if (shot.camera.type !== 'static') {
      clip.effects.push({
        type: this.cameraMotionToEffect(shot.camera.type),
        params: {
          startX: shot.camera.startPos.x,
          startY: shot.camera.startPos.y,
          startZoom: shot.camera.startPos.zoom,
          endX: shot.camera.endPos.x,
          endY: shot.camera.endPos.y,
          endZoom: shot.camera.endPos.zoom,
          easing: shot.camera.easing,
        },
      });
    }

    videoTrack.clips.push(clip);

    return endFrame;
  }

  private createClipSource(shot: Shot): ClipSource {
    switch (shot.type) {
      case 'hold':
      case 'pan':
      case 'zoom':
      case 'crop-motion':
      case 'shake':
        return { type: 'frame', frameRef: shot.frameRef };

      case 'loop':
        // Find frame and adjacent frames for loop
        return {
          type: 'loop',
          loopFrames: [shot.frameRef], // Would expand to cycle
        };

      case 'transition':
        return { type: 'transition', transitionType: 'fade' };

      default:
        return { type: 'frame', frameRef: shot.frameRef };
    }
  }

  private cameraMotionToEffect(motionType: CameraMotionType): EffectType {
    switch (motionType) {
      case 'pan-left':
      case 'pan-right':
      case 'pan-up':
      case 'pan-down':
      case 'ken-burns':
        return 'pan';
      case 'zoom-in':
      case 'zoom-out':
      case 'zoom-push':
        return 'zoom';
      case 'shake':
        return 'shake';
      case 'rotate':
        return 'rotate';
      default:
        return 'pan';
    }
  }

  private addTransition(startFrame: number, type: TransitionType, duration: number): number {
    const effectsTrack = this.timeline.find(t => t.type === 'effects')!;

    effectsTrack.clips.push({
      id: `transition-${effectsTrack.clips.length}`,
      startFrame,
      endFrame: startFrame + duration,
      source: { type: 'transition', transitionType: type },
      effects: [],
    });

    return startFrame + duration;
  }

  /**
   * Get the total duration in frames
   */
  getTotalFrames(): number {
    const videoTrack = this.timeline.find(t => t.type === 'video');
    if (!videoTrack || videoTrack.clips.length === 0) return 0;
    return Math.max(...videoTrack.clips.map(c => c.endFrame));
  }
}

// ============================================================================
// BATCH GENERATION SERVICE
// ============================================================================

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

export class BatchGenerationService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: API_KEY });
    }
  }

  /**
   * Generate a batch of frames with parallel processing
   */
  async generateBatch(
    batch: GenerationBatch,
    sourceImage: string,
    style: string,
    onProgress: (completed: number, total: number) => void
  ): Promise<UniqueFrame[]> {
    const results: UniqueFrame[] = [];
    const parallelLimit = 4; // Max concurrent API calls

    // Process in chunks
    for (let i = 0; i < batch.frames.length; i += parallelLimit) {
      const chunk = batch.frames.slice(i, i + parallelLimit);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (plannedFrame, chunkIndex) => {
          const frameIndex = i + chunkIndex;
          const result = await this.generateSingleFrame(
            plannedFrame,
            sourceImage,
            style,
            batch.index,
            frameIndex
          );
          onProgress(i + chunkIndex + 1, batch.frames.length);
          return result;
        })
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }

      // Rate limiting pause between chunks
      if (i + parallelLimit < batch.frames.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return results;
  }

  private async generateSingleFrame(
    planned: PlannedFrame,
    sourceImage: string,
    style: string,
    sheetIndex: number,
    frameIndex: number
  ): Promise<UniqueFrame> {
    // For now, return mock data
    // In production, this calls Gemini image generation

    const mockUrl = `data:image/svg+xml,${encodeURIComponent(
      this.createPlaceholderSVG(planned.prompt, frameIndex)
    )}`;

    return {
      id: planned.id,
      url: mockUrl,
      category: planned.category,
      tags: planned.tags,
      usageCount: 0,
      generationPrompt: planned.prompt,
      metadata: {
        sheetIndex,
        frameIndex,
        energy: 'mid' as EnergyLevel,
      },
    };
  }

  private createPlaceholderSVG(prompt: string, index: number): string {
    const hue = (index * 30) % 360;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384">
      <rect width="100%" height="100%" fill="hsl(${hue}, 70%, 20%)"/>
      <circle cx="192" cy="150" r="60" fill="hsl(${hue}, 70%, 60%)"/>
      <rect x="152" y="220" width="80" height="120" fill="hsl(${hue}, 70%, 50%)"/>
      <text x="192" y="370" text-anchor="middle" fill="white" font-size="12">Frame ${index + 1}</text>
    </svg>`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  CartoonPlanner,
  CameraMotionGenerator,
  TimelineComposer,
  BatchGenerationService,
};
