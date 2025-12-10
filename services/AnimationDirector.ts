/**
 * AnimationDirector.ts
 *
 * AI-powered autonomous animation production system.
 * Takes a prompt → Plans scenes → Generates frames → Exports MP4
 *
 * The "Director" uses an LLM to:
 * 1. Understand the creative brief
 * 2. Plan scenes, shots, and camera work
 * 3. Determine which frames to generate vs reuse
 * 4. Write prompts for each unique frame
 * 5. Orchestrate batch generation
 * 6. Compose timeline with effects
 * 7. Export final video
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface DirectorConfig {
  // Style presets
  style: StylePreset;
  cinematography: CinematographyStyle;

  // Technical settings
  resolution: Resolution;
  fps: number;
  targetDuration: number;      // Seconds

  // Audio sync
  audioFile?: string;          // Base64 or URL
  audioBPM?: number;           // Beats per minute for sync
  audioBeats?: number[];       // Beat timestamps in seconds

  // Generation limits
  maxUniqueFrames: number;     // Budget for unique frames (e.g., 120)
  parallelGenerations: number; // Concurrent API calls
  reuseAggression: number;     // 0-1, how aggressively to reuse frames
}

export type StylePreset =
  | 'anime'
  | 'pixar'
  | 'comic-book'
  | 'watercolor'
  | 'oil-painting'
  | 'cyberpunk'
  | 'noir'
  | 'retro-cartoon'
  | 'realistic'
  | 'minimalist'
  | 'custom';

export type CinematographyStyle =
  | 'documentary'      // Lots of pans, zooms, Ken Burns
  | 'action'           // Fast cuts, shakes, dynamic
  | 'dramatic'         // Slow zooms, long holds
  | 'comedy'           // Quick timing, reaction shots
  | 'music-video'      // Beat-synced, stylized
  | 'storybook'        // Page-turn transitions, gentle
  | 'experimental';    // AI decides

export type Resolution =
  | '720p'
  | '1080p'
  | '4k'
  | 'portrait-1080'
  | 'square-1080';

// ============================================================================
// DIRECTOR PLANNING TYPES
// ============================================================================

export interface AnimationBrief {
  prompt: string;
  followUpAnswers?: Record<string, string>;
  sourceImages?: string[];     // Reference images
  config: DirectorConfig;
}

export interface ProductionPlan {
  id: string;
  title: string;
  synopsis: string;
  totalDuration: number;       // Frames
  estimatedCost: number;
  estimatedTime: number;       // Minutes

  // Structure
  acts: Act[];
  scenes: PlannedScene[];
  shots: PlannedShot[];

  // Frame planning
  frameManifest: FrameManifest;

  // Audio sync
  audioSync?: AudioSyncPlan;

  // Status
  status: PlanStatus;
  warnings: string[];
}

export type PlanStatus = 'draft' | 'approved' | 'generating' | 'composing' | 'exporting' | 'complete' | 'error';

export interface Act {
  id: string;
  name: string;
  description: string;
  startFrame: number;
  endFrame: number;
  mood: string;
  pacing: 'slow' | 'medium' | 'fast';
}

export interface PlannedScene {
  id: string;
  actId: string;
  name: string;
  description: string;
  location?: string;
  timeOfDay?: string;
  mood: string;
  startFrame: number;
  endFrame: number;
  shotIds: string[];
}

export interface PlannedShot {
  id: string;
  sceneId: string;
  type: ShotType;
  description: string;
  startFrame: number;
  endFrame: number;
  frameRequirements: FrameRequirement[];
  cameraWork: CameraWork;
  transitions: {
    in: TransitionType;
    out: TransitionType;
  };
}

export type ShotType =
  | 'establishing'             // Wide shot, sets scene
  | 'action'                   // Character doing something
  | 'reaction'                 // Character reacting
  | 'dialogue'                 // Talking (reusable mouth cycles)
  | 'montage'                  // Quick cuts
  | 'hold'                     // Static moment
  | 'transition'               // Between scenes
  | 'title-card';              // Text overlay

export interface FrameRequirement {
  id: string;
  prompt: string;
  isReusable: boolean;
  reuseCategory?: string;      // 'idle', 'walk', 'emotion', etc.
  priority: number;            // Generation order
}

export interface CameraWork {
  movement: CameraMovement;
  startState: CameraState;
  endState: CameraState;
  easing: string;
}

export type CameraMovement =
  | 'static'
  | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down'
  | 'zoom-in' | 'zoom-out'
  | 'dolly-in' | 'dolly-out'
  | 'ken-burns'
  | 'shake'
  | 'rotate'
  | 'crane-up' | 'crane-down'
  | 'tracking';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  focalPoint?: { x: number; y: number };
}

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe-left' | 'wipe-right'
  | 'zoom-blur'
  | 'flash'
  | 'iris';

// ============================================================================
// FRAME MANIFEST
// ============================================================================

export interface FrameManifest {
  totalUnique: number;
  totalReused: number;
  totalWithCamera: number;     // Frames extended via camera motion
  totalOutput: number;         // Final frame count

  categories: FrameCategory[];
  generationOrder: string[];   // Frame IDs in order to generate
}

export interface FrameCategory {
  id: string;
  name: string;
  count: number;
  isReusable: boolean;
  frames: ManifestFrame[];
}

export interface ManifestFrame {
  id: string;
  prompt: string;
  category: string;
  usedInShots: string[];
  generationBatch: number;
  status: 'pending' | 'generating' | 'complete' | 'error';
  url?: string;
}

// ============================================================================
// AUDIO SYNC
// ============================================================================

export interface AudioSyncPlan {
  duration: number;            // Total audio duration in seconds
  bpm?: number;
  beats: BeatMarker[];
  sections: AudioSection[];
}

export interface BeatMarker {
  time: number;                // Seconds
  frame: number;               // Corresponding frame
  type: 'beat' | 'downbeat' | 'accent';
  intensity: number;           // 0-1
}

export interface AudioSection {
  name: string;
  startTime: number;
  endTime: number;
  energy: 'low' | 'medium' | 'high';
  suggestedPacing: 'slow' | 'medium' | 'fast';
}

// ============================================================================
// FOLLOW-UP QUESTIONS
// ============================================================================

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'slider' | 'toggle';
  options?: string[];
  default?: string | number | boolean;
  required: boolean;
  category: 'story' | 'style' | 'technical' | 'audio';
}

// ============================================================================
// ANIMATION DIRECTOR CLASS
// ============================================================================

export class AnimationDirector {
  private ai: GoogleGenAI | null = null;
  private config: DirectorConfig;
  private plan: ProductionPlan | null = null;
  private onProgress?: (stage: string, progress: number) => void;
  private onLog?: (message: string) => void;

  constructor(config: Partial<DirectorConfig> = {}) {
    this.config = {
      style: 'anime',
      cinematography: 'dramatic',
      resolution: '1080p',
      fps: 24,
      targetDuration: 30,
      maxUniqueFrames: 120,
      parallelGenerations: 4,
      reuseAggression: 0.7,
      ...config,
    };

    if (API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: API_KEY });
    }
  }

  setProgressCallback(callback: (stage: string, progress: number) => void): void {
    this.onProgress = callback;
  }

  setLogCallback(callback: (message: string) => void): void {
    this.onLog = callback;
  }

  private log(message: string): void {
    this.onLog?.(message);
    console.log(`[Director] ${message}`);
  }

  private progress(stage: string, value: number): void {
    this.onProgress?.(stage, value);
  }

  // ============================================================================
  // PHASE 1: UNDERSTAND BRIEF & ASK QUESTIONS
  // ============================================================================

  /**
   * Analyze the prompt and generate follow-up questions
   */
  async analyzePrompt(prompt: string): Promise<FollowUpQuestion[]> {
    this.log('Analyzing creative brief...');

    // Use LLM to understand the prompt and identify gaps
    const analysisPrompt = `You are an animation director. Analyze this animation request and identify what additional information would help create a better animation.

User Request: "${prompt}"

Generate 3-5 follow-up questions to clarify:
1. Story details (characters, setting, plot points)
2. Visual style preferences
3. Pacing and mood
4. Any specific scenes or moments they want

Return as JSON array:
[
  {
    "id": "q1",
    "question": "Question text",
    "type": "choice|text|slider",
    "options": ["opt1", "opt2"] // for choice type
    "category": "story|style|technical",
    "required": true/false
  }
]`;

    try {
      if (!this.ai) {
        return this.getDefaultQuestions();
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: analysisPrompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.log(`Analysis error: ${error}`);
    }

    return this.getDefaultQuestions();
  }

  private getDefaultQuestions(): FollowUpQuestion[] {
    return [
      {
        id: 'characters',
        question: 'Describe the main character(s) in detail',
        type: 'text',
        category: 'story',
        required: true,
      },
      {
        id: 'mood',
        question: 'What mood should the animation convey?',
        type: 'choice',
        options: ['Happy/Upbeat', 'Dramatic/Intense', 'Peaceful/Calm', 'Mysterious', 'Comedic', 'Emotional'],
        category: 'style',
        required: true,
      },
      {
        id: 'keyMoments',
        question: 'Describe 2-3 key moments you want to see',
        type: 'text',
        category: 'story',
        required: false,
      },
      {
        id: 'pacing',
        question: 'Preferred pacing',
        type: 'choice',
        options: ['Fast & Energetic', 'Medium & Balanced', 'Slow & Contemplative'],
        category: 'technical',
        required: true,
      },
    ];
  }

  // ============================================================================
  // PHASE 2: CREATE PRODUCTION PLAN
  // ============================================================================

  /**
   * Generate complete production plan from brief
   */
  async createProductionPlan(brief: AnimationBrief): Promise<ProductionPlan> {
    this.log('Creating production plan...');
    this.progress('planning', 0);

    const totalFrames = this.config.targetDuration * this.config.fps;

    // 1. Generate story structure
    this.progress('planning', 10);
    const structure = await this.generateStoryStructure(brief, totalFrames);

    // 2. Plan scenes and shots
    this.progress('planning', 30);
    const { scenes, shots } = await this.planScenesAndShots(brief, structure, totalFrames);

    // 3. Create frame manifest (what to generate)
    this.progress('planning', 60);
    const frameManifest = await this.createFrameManifest(shots, brief);

    // 4. Plan audio sync if provided
    this.progress('planning', 80);
    const audioSync = brief.config.audioFile
      ? await this.createAudioSyncPlan(brief.config)
      : undefined;

    // 5. Compile final plan
    this.progress('planning', 100);

    this.plan = {
      id: `plan-${Date.now()}`,
      title: structure.title,
      synopsis: structure.synopsis,
      totalDuration: totalFrames,
      estimatedCost: frameManifest.totalUnique * 0.002,
      estimatedTime: Math.ceil(frameManifest.totalUnique / this.config.parallelGenerations) * 0.5,
      acts: structure.acts,
      scenes,
      shots,
      frameManifest,
      audioSync,
      status: 'draft',
      warnings: this.validatePlan(frameManifest),
    };

    this.log(`Plan created: ${frameManifest.totalUnique} unique frames, ${frameManifest.totalOutput} output frames`);
    return this.plan;
  }

  private async generateStoryStructure(brief: AnimationBrief, totalFrames: number): Promise<{
    title: string;
    synopsis: string;
    acts: Act[];
  }> {
    const structurePrompt = `You are a story director. Create a story structure for this animation:

Request: "${brief.prompt}"
Additional Info: ${JSON.stringify(brief.followUpAnswers || {})}
Duration: ${totalFrames} frames at ${this.config.fps} fps (${this.config.targetDuration} seconds)
Style: ${this.config.style}
Cinematography: ${this.config.cinematography}

Create a 3-act structure with title and synopsis. Return as JSON:
{
  "title": "Animation Title",
  "synopsis": "Brief description",
  "acts": [
    {
      "name": "Act 1 - Setup",
      "description": "What happens",
      "mood": "curious",
      "pacing": "medium",
      "durationPercent": 25
    },
    ...
  ]
}`;

    try {
      if (this.ai) {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: structurePrompt,
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const structure = JSON.parse(jsonMatch[0]);

          // Convert duration percentages to frames
          let currentFrame = 0;
          const acts: Act[] = structure.acts.map((act: any, i: number) => {
            const duration = Math.floor(totalFrames * (act.durationPercent / 100));
            const result: Act = {
              id: `act-${i}`,
              name: act.name,
              description: act.description,
              mood: act.mood,
              pacing: act.pacing,
              startFrame: currentFrame,
              endFrame: currentFrame + duration,
            };
            currentFrame += duration;
            return result;
          });

          return { title: structure.title, synopsis: structure.synopsis, acts };
        }
      }
    } catch (error) {
      this.log(`Structure generation error: ${error}`);
    }

    // Fallback structure
    return {
      title: 'Animated Story',
      synopsis: brief.prompt,
      acts: [
        { id: 'act-1', name: 'Beginning', description: 'Setup', mood: 'neutral', pacing: 'medium', startFrame: 0, endFrame: Math.floor(totalFrames * 0.25) },
        { id: 'act-2', name: 'Middle', description: 'Development', mood: 'rising', pacing: 'medium', startFrame: Math.floor(totalFrames * 0.25), endFrame: Math.floor(totalFrames * 0.75) },
        { id: 'act-3', name: 'End', description: 'Resolution', mood: 'resolved', pacing: 'slow', startFrame: Math.floor(totalFrames * 0.75), endFrame: totalFrames },
      ],
    };
  }

  private async planScenesAndShots(
    brief: AnimationBrief,
    structure: { acts: Act[] },
    totalFrames: number
  ): Promise<{ scenes: PlannedScene[]; shots: PlannedShot[] }> {
    const scenes: PlannedScene[] = [];
    const shots: PlannedShot[] = [];

    const shotPrompt = `You are a cinematographer. Plan specific shots for this animation act:

Act: "${structure.acts[0]?.description}"
Style: ${this.config.style}
Cinematography Style: ${this.config.cinematography}
Duration: ${structure.acts[0]?.endFrame - structure.acts[0]?.startFrame} frames

For each shot, specify:
- Type: establishing, action, reaction, dialogue, hold, montage
- Camera: static, pan-left/right/up/down, zoom-in/out, ken-burns, shake
- Duration in frames (24 frames = 1 second)
- Whether the frame can be reused elsewhere

Return JSON array of shots:
[
  {
    "type": "establishing",
    "description": "Wide shot of location",
    "camera": "ken-burns",
    "duration": 48,
    "isReusable": true,
    "reuseCategory": "backgrounds"
  }
]`;

    // For each act, generate scenes and shots
    for (const act of structure.acts) {
      try {
        if (this.ai) {
          const response = await this.ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: shotPrompt.replace('${structure.acts[0]', act.description),
          });

          const text = response.text || '';
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const actShots = JSON.parse(jsonMatch[0]);

            // Create scene for this act
            const scene: PlannedScene = {
              id: `scene-${scenes.length}`,
              actId: act.id,
              name: act.name,
              description: act.description,
              mood: act.mood,
              startFrame: act.startFrame,
              endFrame: act.endFrame,
              shotIds: [],
            };

            // Convert shot data
            let currentFrame = act.startFrame;
            for (const shotData of actShots) {
              const shot: PlannedShot = {
                id: `shot-${shots.length}`,
                sceneId: scene.id,
                type: shotData.type,
                description: shotData.description,
                startFrame: currentFrame,
                endFrame: currentFrame + shotData.duration,
                frameRequirements: [{
                  id: `frame-${shots.length}`,
                  prompt: shotData.description,
                  isReusable: shotData.isReusable,
                  reuseCategory: shotData.reuseCategory,
                  priority: shotData.isReusable ? 10 : 5,
                }],
                cameraWork: this.createCameraWork(shotData.camera, shotData.duration),
                transitions: { in: 'cut', out: 'cut' },
              };

              scene.shotIds.push(shot.id);
              shots.push(shot);
              currentFrame += shotData.duration;
            }

            scenes.push(scene);
          }
        }
      } catch (error) {
        this.log(`Shot planning error: ${error}`);
      }
    }

    // Fallback if no shots generated
    if (shots.length === 0) {
      shots.push(...this.generateFallbackShots(totalFrames));
      scenes.push({
        id: 'scene-0',
        actId: 'act-1',
        name: 'Main Scene',
        description: brief.prompt,
        mood: 'neutral',
        startFrame: 0,
        endFrame: totalFrames,
        shotIds: shots.map(s => s.id),
      });
    }

    return { scenes, shots };
  }

  private createCameraWork(movement: string, duration: number): CameraWork {
    const defaultState: CameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };

    const movements: Record<string, Partial<CameraState>> = {
      'pan-left': { x: 0.3 },
      'pan-right': { x: -0.3 },
      'pan-up': { y: 0.2 },
      'pan-down': { y: -0.2 },
      'zoom-in': { zoom: 1.5 },
      'zoom-out': { zoom: 0.7 },
      'ken-burns': { x: 0.2, zoom: 1.3 },
      'shake': { x: 0.05, y: 0.05, rotation: 2 },
    };

    const endState = { ...defaultState, ...(movements[movement] || {}) };

    return {
      movement: (movement as CameraMovement) || 'static',
      startState: defaultState,
      endState,
      easing: 'ease-in-out',
    };
  }

  private generateFallbackShots(totalFrames: number): PlannedShot[] {
    const shots: PlannedShot[] = [];
    const shotDuration = Math.floor(totalFrames / 10);

    for (let i = 0; i < 10; i++) {
      shots.push({
        id: `shot-${i}`,
        sceneId: 'scene-0',
        type: i % 3 === 0 ? 'establishing' : 'action',
        description: `Shot ${i + 1}`,
        startFrame: i * shotDuration,
        endFrame: (i + 1) * shotDuration,
        frameRequirements: [{
          id: `frame-${i}`,
          prompt: `Frame ${i + 1}`,
          isReusable: i < 3,
          reuseCategory: i < 3 ? 'general' : undefined,
          priority: 5,
        }],
        cameraWork: this.createCameraWork('static', shotDuration),
        transitions: { in: 'cut', out: 'cut' },
      });
    }

    return shots;
  }

  private async createFrameManifest(shots: PlannedShot[], brief: AnimationBrief): Promise<FrameManifest> {
    const categories: FrameCategory[] = [];
    const categoryMap: Record<string, ManifestFrame[]> = {};

    // Collect all frame requirements
    for (const shot of shots) {
      for (const req of shot.frameRequirements) {
        const category = req.reuseCategory || 'unique';

        if (!categoryMap[category]) {
          categoryMap[category] = [];
        }

        // Check if we can reuse an existing frame
        const existingFrame = req.isReusable
          ? categoryMap[category].find(f => this.isSimilarPrompt(f.prompt, req.prompt))
          : null;

        if (existingFrame) {
          existingFrame.usedInShots.push(shot.id);
        } else {
          categoryMap[category].push({
            id: req.id,
            prompt: req.prompt,
            category,
            usedInShots: [shot.id],
            generationBatch: 0,
            status: 'pending',
          });
        }
      }
    }

    // Convert to categories
    let totalUnique = 0;
    let totalReused = 0;

    for (const [categoryId, frames] of Object.entries(categoryMap)) {
      const isReusable = categoryId !== 'unique';

      categories.push({
        id: categoryId,
        name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
        count: frames.length,
        isReusable,
        frames,
      });

      totalUnique += frames.length;
      totalReused += frames.reduce((sum, f) => sum + Math.max(0, f.usedInShots.length - 1), 0);
    }

    // Assign to batches
    let batchIndex = 0;
    const batchSize = 12; // Frames per batch
    const generationOrder: string[] = [];

    // Reusable frames first
    for (const cat of categories.filter(c => c.isReusable)) {
      for (const frame of cat.frames) {
        frame.generationBatch = Math.floor(generationOrder.length / batchSize);
        generationOrder.push(frame.id);
      }
    }

    // Then unique frames
    for (const cat of categories.filter(c => !c.isReusable)) {
      for (const frame of cat.frames) {
        frame.generationBatch = Math.floor(generationOrder.length / batchSize);
        generationOrder.push(frame.id);
      }
    }

    // Calculate total output frames (including camera motion extensions)
    const totalWithCamera = shots.reduce((sum, shot) => {
      return sum + (shot.endFrame - shot.startFrame);
    }, 0);

    return {
      totalUnique,
      totalReused,
      totalWithCamera,
      totalOutput: totalWithCamera,
      categories,
      generationOrder,
    };
  }

  private isSimilarPrompt(a: string, b: string): boolean {
    // Simple similarity check - in production use embeddings
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const jaccard = intersection.length / union.size;
    return jaccard > this.config.reuseAggression;
  }

  private async createAudioSyncPlan(config: DirectorConfig): Promise<AudioSyncPlan> {
    const beats: BeatMarker[] = [];

    if (config.audioBPM) {
      const beatInterval = 60 / config.audioBPM;
      const duration = config.targetDuration;

      for (let time = 0; time < duration; time += beatInterval) {
        const beatInMeasure = Math.floor(time / beatInterval) % 4;
        beats.push({
          time,
          frame: Math.floor(time * config.fps),
          type: beatInMeasure === 0 ? 'downbeat' : 'beat',
          intensity: beatInMeasure === 0 ? 1 : 0.7,
        });
      }
    }

    return {
      duration: config.targetDuration,
      bpm: config.audioBPM,
      beats,
      sections: [
        { name: 'Intro', startTime: 0, endTime: config.targetDuration * 0.25, energy: 'low', suggestedPacing: 'slow' },
        { name: 'Main', startTime: config.targetDuration * 0.25, endTime: config.targetDuration * 0.75, energy: 'high', suggestedPacing: 'fast' },
        { name: 'Outro', startTime: config.targetDuration * 0.75, endTime: config.targetDuration, energy: 'medium', suggestedPacing: 'medium' },
      ],
    };
  }

  private validatePlan(manifest: FrameManifest): string[] {
    const warnings: string[] = [];

    if (manifest.totalUnique > this.config.maxUniqueFrames) {
      warnings.push(`Plan requires ${manifest.totalUnique} unique frames, but budget is ${this.config.maxUniqueFrames}`);
    }

    if (manifest.totalUnique < 10) {
      warnings.push('Very few unique frames - animation may feel repetitive');
    }

    return warnings;
  }

  // ============================================================================
  // PHASE 3: GENERATE FRAMES
  // ============================================================================

  async generateAllFrames(
    plan: ProductionPlan,
    sourceImage: string,
    onFrameComplete: (frameId: string, url: string) => void
  ): Promise<void> {
    this.log('Starting frame generation...');
    this.progress('generating', 0);

    const allFrames = plan.frameManifest.categories.flatMap(c => c.frames);
    const totalFrames = allFrames.length;
    let completed = 0;

    // Process in parallel batches
    const batchSize = this.config.parallelGenerations;

    for (let i = 0; i < allFrames.length; i += batchSize) {
      const batch = allFrames.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (frame) => {
          try {
            frame.status = 'generating';
            const url = await this.generateSingleFrame(frame, sourceImage);
            frame.url = url;
            frame.status = 'complete';
            completed++;
            this.progress('generating', (completed / totalFrames) * 100);
            onFrameComplete(frame.id, url);
          } catch (error) {
            frame.status = 'error';
            this.log(`Frame ${frame.id} failed: ${error}`);
          }
        })
      );

      // Rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    this.log(`Generation complete: ${completed}/${totalFrames} frames`);
  }

  private async generateSingleFrame(frame: ManifestFrame, sourceImage: string): Promise<string> {
    // In production, call Gemini image generation
    // For now, return placeholder

    const stylePrompt = this.getStylePrompt();
    const fullPrompt = `${frame.prompt}. ${stylePrompt}`;

    // Placeholder SVG
    const hue = (frame.generationBatch * 30 + Math.random() * 20) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, 60%, 15%)"/>
          <stop offset="100%" style="stop-color:hsl(${hue + 30}, 60%, 25%)"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="256" cy="200" r="80" fill="hsl(${hue}, 70%, 60%)" opacity="0.9"/>
      <rect x="200" y="300" width="112" height="150" rx="10" fill="hsl(${hue}, 60%, 50%)"/>
      <text x="256" y="480" text-anchor="middle" fill="white" font-family="sans-serif" font-size="14">${frame.category}</text>
    </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  private getStylePrompt(): string {
    const styles: Record<StylePreset, string> = {
      'anime': 'anime style, cel shaded, vibrant colors, clean lines',
      'pixar': '3D Pixar style, soft lighting, expressive characters',
      'comic-book': 'comic book style, bold outlines, halftone dots',
      'watercolor': 'watercolor painting, soft edges, flowing colors',
      'oil-painting': 'oil painting, thick brushstrokes, rich textures',
      'cyberpunk': 'cyberpunk aesthetic, neon lights, dark atmosphere',
      'noir': 'film noir style, high contrast, dramatic shadows',
      'retro-cartoon': '1930s cartoon style, rubber hose animation',
      'realistic': 'photorealistic, detailed textures, natural lighting',
      'minimalist': 'minimalist design, simple shapes, limited palette',
      'custom': '',
    };

    return styles[this.config.style] || '';
  }

  // ============================================================================
  // PHASE 4: COMPOSE & EXPORT
  // ============================================================================

  async exportToMP4(
    plan: ProductionPlan,
    canvas: HTMLCanvasElement,
    onProgress: (percent: number) => void
  ): Promise<Blob> {
    this.log('Starting export...');
    this.progress('exporting', 0);

    const ctx = canvas.getContext('2d')!;
    const frames: ImageData[] = [];

    // Render each frame
    for (let frameNum = 0; frameNum < plan.totalDuration; frameNum++) {
      // Find which shot this frame belongs to
      const shot = plan.shots.find(s => s.startFrame <= frameNum && s.endFrame > frameNum);
      if (!shot) continue;

      // Get the frame image
      const frameReq = shot.frameRequirements[0];
      const manifestFrame = plan.frameManifest.categories
        .flatMap(c => c.frames)
        .find(f => f.id === frameReq?.id);

      if (manifestFrame?.url) {
        // Load and render frame with camera work
        await this.renderFrameWithCamera(ctx, canvas, manifestFrame.url, shot, frameNum);
      }

      // Capture frame
      frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

      if (frameNum % 24 === 0) {
        onProgress((frameNum / plan.totalDuration) * 100);
      }
    }

    // Encode to MP4 using MediaRecorder
    return this.encodeFramesToMP4(canvas, frames, plan.totalDuration, this.config.fps);
  }

  private async renderFrameWithCamera(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    imageUrl: string,
    shot: PlannedShot,
    frameNum: number
  ): Promise<void> {
    const img = await this.loadImage(imageUrl);

    // Calculate camera interpolation
    const shotProgress = (frameNum - shot.startFrame) / (shot.endFrame - shot.startFrame);
    const t = this.applyEasing(shotProgress, shot.cameraWork.easing);

    const lerp = (a: number, b: number) => a + (b - a) * t;
    const cam = {
      x: lerp(shot.cameraWork.startState.x, shot.cameraWork.endState.x),
      y: lerp(shot.cameraWork.startState.y, shot.cameraWork.endState.y),
      zoom: lerp(shot.cameraWork.startState.zoom, shot.cameraWork.endState.zoom),
      rotation: lerp(shot.cameraWork.startState.rotation, shot.cameraWork.endState.rotation),
    };

    // Clear and render with transforms
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((cam.rotation * Math.PI) / 180);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-canvas.width / 2 + cam.x * canvas.width, -canvas.height / 2 + cam.y * canvas.height);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.restore();
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'ease-in': return t * t;
      case 'ease-out': return 1 - (1 - t) * (1 - t);
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: return t;
    }
  }

  private async encodeFramesToMP4(
    canvas: HTMLCanvasElement,
    frames: ImageData[],
    totalFrames: number,
    fps: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      recorder.onerror = reject;

      recorder.start();

      // Play back frames
      const ctx = canvas.getContext('2d')!;
      let frameIndex = 0;
      const playFrame = () => {
        if (frameIndex < frames.length) {
          ctx.putImageData(frames[frameIndex], 0, 0);
          frameIndex++;
          setTimeout(playFrame, 1000 / fps);
        } else {
          recorder.stop();
        }
      };

      playFrame();
    });
  }

  // ============================================================================
  // FULL PIPELINE
  // ============================================================================

  /**
   * Run the complete animation pipeline autonomously
   */
  async produce(brief: AnimationBrief): Promise<{ plan: ProductionPlan; videoBlob: Blob }> {
    // Phase 1: Plan
    const plan = await this.createProductionPlan(brief);

    // Phase 2: Generate
    await this.generateAllFrames(plan, brief.sourceImages?.[0] || '', (id, url) => {
      this.log(`Frame ${id} complete`);
    });

    // Phase 3: Export
    const canvas = document.createElement('canvas');
    const res = this.getResolution();
    canvas.width = res.width;
    canvas.height = res.height;

    const videoBlob = await this.exportToMP4(plan, canvas, (p) => {
      this.progress('exporting', p);
    });

    this.log('Production complete!');
    return { plan, videoBlob };
  }

  private getResolution(): { width: number; height: number } {
    const resolutions: Record<Resolution, { width: number; height: number }> = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4k': { width: 3840, height: 2160 },
      'portrait-1080': { width: 1080, height: 1920 },
      'square-1080': { width: 1080, height: 1080 },
    };
    return resolutions[this.config.resolution];
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getPlan(): ProductionPlan | null {
    return this.plan;
  }

  getConfig(): DirectorConfig {
    return { ...this.config };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AnimationDirector;
