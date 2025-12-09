/**
 * Lighting Director
 * Coordinate lighting effects with camera motions, frame content, and beat analysis
 * Creates contextual lighting (gun flashes, strobes, dramatic lighting)
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { CameraMotionType, EnergyMode } from './CameraSequenceManager';

export enum LightingEffectType {
  STROBE = 'strobe',
  FLASH = 'flash',
  FADE_TO_BLACK = 'fade_to_black',
  FADE_TO_WHITE = 'fade_to_white', 
  COLOR_WASH = 'color_wash',
  SPOTLIGHT = 'spotlight',
  RIM_LIGHT = 'rim_light',
  MUZZLE_FLASH = 'muzzle_flash',
  EXPLOSION_BURST = 'explosion_burst',
  NEON_PULSE = 'neon_pulse',
  SWEEP_LIGHT = 'sweep_light',
  DISCO_STROBE = 'disco_strobe'
}

export interface LightingKeyframe {
  time: number;         // 0-1 normalized time
  intensity: number;    // 0-1 lighting intensity
  color: [number, number, number]; // RGB color (0-1)
  blur: number;         // Blur amount for glow effects
  position: { x: number; y: number }; // Light position (-1 to 1)
  size: number;         // Light size/spread (0-1)
  opacity: number;      // Overall opacity
  blendMode: 'normal' | 'screen' | 'overlay' | 'multiply' | 'add';
}

export interface LightingEffect {
  id: string;
  type: LightingEffectType;
  duration: number;     // Duration in beats
  keyframes: LightingKeyframe[];
  triggerConditions: {
    frameContent?: string[]; // e.g., ['gun', 'weapon', 'action']
    cameraMotion?: CameraMotionType[];
    energyThreshold?: number;
    onBeat?: boolean;
    onSnare?: boolean;
    onStutter?: boolean;
    beatPattern?: string[];
  };
  priority: number;
  layered?: boolean;    // Can stack with other effects
}

export interface ActiveLightingState {
  activeEffects: LightingEffect[];
  ambientLevel: number;    // Base lighting level (0-1)
  colorTemperature: number; // Warm to cool (2700K-6500K mapped to 0-1)
  dynamicRange: number;    // Contrast level (0-1)
  strobePhase: number;     // Current strobe cycle phase
}

export class LightingDirector {
  private state: ActiveLightingState;
  private effects: Map<string, LightingEffect>;
  private frameContentAnalyzer: FrameContentAnalyzer;
  private beatTiming: {
    beatsPerSecond: number;
    lastBeatTime: number;
    currentBeat: number;
  };

  constructor() {
    this.state = {
      activeEffects: [],
      ambientLevel: 0.7,      // Default ambient
      colorTemperature: 0.6,   // Neutral cool
      dynamicRange: 0.8,       // High contrast
      strobePhase: 0
    };

    this.effects = new Map();
    this.frameContentAnalyzer = new FrameContentAnalyzer();
    this.beatTiming = {
      beatsPerSecond: 2,
      lastBeatTime: 0,
      currentBeat: 0
    };

    this.initializeDefaultEffects();
  }

  private initializeDefaultEffects(): void {
    // CONTEXTUAL LIGHTING BASED ON FRAME CONTENT

    // Muzzle flash for weapon/gun frames
    this.addEffect({
      id: 'muzzle_flash',
      type: LightingEffectType.MUZZLE_FLASH,
      duration: 0.25, // Quarter beat - very fast
      keyframes: [
        { 
          time: 0, intensity: 0, color: [1, 0.8, 0.4], blur: 0, 
          position: {x: 0.3, y: 0.2}, size: 0, opacity: 0, blendMode: 'screen' 
        },
        { 
          time: 0.2, intensity: 1, color: [1, 1, 0.8], blur: 8, 
          position: {x: 0.3, y: 0.2}, size: 0.4, opacity: 0.9, blendMode: 'add' 
        },
        { 
          time: 1.0, intensity: 0, color: [0.8, 0.4, 0.2], blur: 2, 
          position: {x: 0.3, y: 0.2}, size: 0.1, opacity: 0, blendMode: 'screen' 
        }
      ],
      triggerConditions: { 
        frameContent: ['gun', 'weapon', 'pistol', 'rifle', 'action', 'combat'],
        onBeat: true,
        energyThreshold: 0.6 
      },
      priority: 15,
      layered: true
    });

    // Spotlight for dramatic close-up frames
    this.addEffect({
      id: 'dramatic_spotlight',
      type: LightingEffectType.SPOTLIGHT,
      duration: 4,
      keyframes: [
        { 
          time: 0, intensity: 0, color: [1, 0.95, 0.9], blur: 15, 
          position: {x: 0, y: -0.3}, size: 0, opacity: 0, blendMode: 'overlay' 
        },
        { 
          time: 0.3, intensity: 0.8, color: [1, 0.95, 0.9], blur: 20, 
          position: {x: 0, y: -0.3}, size: 0.6, opacity: 0.7, blendMode: 'overlay' 
        },
        { 
          time: 1.0, intensity: 0.6, color: [1, 0.9, 0.8], blur: 18, 
          position: {x: 0, y: -0.3}, size: 0.5, opacity: 0.5, blendMode: 'overlay' 
        }
      ],
      triggerConditions: { 
        frameContent: ['closeup', 'face', 'portrait', 'dramatic'],
        energyThreshold: 0.7 
      },
      priority: 8
    });

    // BEAT-SYNCHRONIZED STROBES

    // High-energy strobe burst
    this.addEffect({
      id: 'impact_strobe',
      type: LightingEffectType.STROBE,
      duration: 1,
      keyframes: [
        { time: 0, intensity: 0, color: [1, 1, 1], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'screen' },
        { time: 0.1, intensity: 1, color: [1, 1, 1], blur: 5, position: {x: 0, y: 0}, size: 1, opacity: 0.8, blendMode: 'screen' },
        { time: 0.2, intensity: 0, color: [1, 1, 1], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'screen' },
        { time: 0.3, intensity: 1, color: [1, 1, 1], blur: 5, position: {x: 0, y: 0}, size: 1, opacity: 0.6, blendMode: 'screen' },
        { time: 0.4, intensity: 0, color: [1, 1, 1], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'screen' },
        { time: 1.0, intensity: 0, color: [1, 1, 1], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'screen' }
      ],
      triggerConditions: { 
        onBeat: true, 
        energyThreshold: 0.8,
        cameraMotion: [CameraMotionType.ZOOM_PUNCH, CameraMotionType.SHAKE_BURST] 
      },
      priority: 12,
      layered: true
    });

    // Color wash for dance peaks
    this.addEffect({
      id: 'dance_color_wash',
      type: LightingEffectType.COLOR_WASH,
      duration: 2,
      keyframes: [
        { time: 0, intensity: 0.3, color: [0.8, 0.2, 0.9], blur: 25, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'overlay' },
        { time: 0.5, intensity: 0.7, color: [0.2, 0.8, 0.9], blur: 30, position: {x: 0, y: 0}, size: 1, opacity: 0.4, blendMode: 'overlay' },
        { time: 1.0, intensity: 0.4, color: [0.9, 0.8, 0.2], blur: 20, position: {x: 0, y: 0}, size: 1, opacity: 0.2, blendMode: 'overlay' }
      ],
      triggerConditions: { 
        frameContent: ['dance', 'movement', 'energy'],
        energyThreshold: 0.6,
        onSnare: true 
      },
      priority: 6,
      layered: true
    });

    // CAMERA MOTION COORDINATION

    // Sweep light that follows camera pans
    this.addEffect({
      id: 'camera_sweep_light',
      type: LightingEffectType.SWEEP_LIGHT,
      duration: 2,
      keyframes: [
        { time: 0, intensity: 0.6, color: [1, 0.9, 0.8], blur: 15, position: {x: -0.5, y: 0}, size: 0.3, opacity: 0.3, blendMode: 'overlay' },
        { time: 0.5, intensity: 0.8, color: [1, 0.95, 0.9], blur: 18, position: {x: 0, y: 0}, size: 0.4, opacity: 0.5, blendMode: 'overlay' },
        { time: 1.0, intensity: 0.6, color: [1, 0.9, 0.8], blur: 15, position: {x: 0.5, y: 0}, size: 0.3, opacity: 0.3, blendMode: 'overlay' }
      ],
      triggerConditions: { 
        cameraMotion: [CameraMotionType.PAN_LEFT, CameraMotionType.PAN_RIGHT, CameraMotionType.SWEEP_CIRCULAR] 
      },
      priority: 7,
      layered: true
    });

    // Fade to black for dramatic impact
    this.addEffect({
      id: 'dramatic_blackout',
      type: LightingEffectType.FADE_TO_BLACK,
      duration: 1,
      keyframes: [
        { time: 0, intensity: 0, color: [0, 0, 0], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'multiply' },
        { time: 0.3, intensity: 1, color: [0, 0, 0], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0.8, blendMode: 'multiply' },
        { time: 1.0, intensity: 0, color: [0, 0, 0], blur: 0, position: {x: 0, y: 0}, size: 1, opacity: 0, blendMode: 'multiply' }
      ],
      triggerConditions: { 
        energyThreshold: 0.9,
        beatPattern: ['C'],
        cameraMotion: [CameraMotionType.DOLLY_ZOOM] 
      },
      priority: 10
    });

    // Neon pulse for cyberpunk/tech frames  
    this.addEffect({
      id: 'neon_tech_pulse',
      type: LightingEffectType.NEON_PULSE,
      duration: 4,
      keyframes: [
        { time: 0, intensity: 0.4, color: [0, 1, 1], blur: 10, position: {x: 0, y: 0}, size: 0.8, opacity: 0.2, blendMode: 'screen' },
        { time: 0.25, intensity: 0.8, color: [0.2, 1, 0.8], blur: 15, position: {x: 0, y: 0}, size: 0.9, opacity: 0.4, blendMode: 'screen' },
        { time: 0.5, intensity: 0.6, color: [0.8, 0.2, 1], blur: 12, position: {x: 0, y: 0}, size: 0.85, opacity: 0.3, blendMode: 'screen' },
        { time: 0.75, intensity: 0.9, color: [1, 0.2, 0.8], blur: 18, position: {x: 0, y: 0}, size: 0.95, opacity: 0.5, blendMode: 'screen' },
        { time: 1.0, intensity: 0.4, color: [0, 1, 1], blur: 10, position: {x: 0, y: 0}, size: 0.8, opacity: 0.2, blendMode: 'screen' }
      ],
      triggerConditions: { 
        frameContent: ['cyber', 'neon', 'tech', 'futuristic'],
        energyThreshold: 0.5 
      },
      priority: 5,
      layered: true
    });
  }

  public addEffect(effect: LightingEffect): void {
    this.effects.set(effect.id, effect);
  }

  public updateBeatTiming(beat: number, bpm: number): void {
    this.beatTiming.currentBeat = beat;
    this.beatTiming.beatsPerSecond = bpm / 60;
    this.beatTiming.lastBeatTime = performance.now();
  }

  public analyzeAndTrigger(context: {
    frameUrl?: string;
    energy: number;
    cameraMotion?: CameraMotionType;
    onBeat?: boolean;
    onSnare?: boolean; 
    onStutter?: boolean;
    beatPattern?: string;
    stylePreset?: string;
  }): boolean {
    let triggered = false;

    // Analyze frame content if provided
    let frameContent: string[] = [];
    if (context.frameUrl) {
      frameContent = this.frameContentAnalyzer.analyzeFrame(context.frameUrl, context.stylePreset);
    }

    // Find matching effects
    const candidates: { effect: LightingEffect; score: number }[] = [];

    for (const effect of this.effects.values()) {
      let score = 0;
      const triggers = effect.triggerConditions;

      // Frame content matching (highest priority)
      if (triggers.frameContent && frameContent.length > 0) {
        const matches = triggers.frameContent.filter(keyword => 
          frameContent.some(content => content.includes(keyword))
        );
        if (matches.length > 0) {
          score += matches.length * 8; // High score for content matches
        } else if (triggers.frameContent.length > 0) {
          continue; // Skip if frame content specified but doesn't match
        }
      }

      // Camera motion coordination
      if (triggers.cameraMotion && context.cameraMotion) {
        if (triggers.cameraMotion.includes(context.cameraMotion)) {
          score += 6;
        }
      }

      // Energy threshold
      if (triggers.energyThreshold) {
        if (context.energy >= triggers.energyThreshold) {
          score += 4;
        } else {
          continue; // Skip if energy requirement not met
        }
      }

      // Beat synchronization
      if (triggers.onBeat && context.onBeat) score += 5;
      if (triggers.onSnare && context.onSnare) score += 7;
      if (triggers.onStutter && context.onStutter) score += 6;

      // Beat pattern
      if (triggers.beatPattern && context.beatPattern) {
        if (triggers.beatPattern.includes(context.beatPattern)) score += 5;
      }

      // Priority bonus
      score += effect.priority / 2;

      if (score >= 8) { // Minimum threshold
        candidates.push({ effect, score });
      }
    }

    // Sort by score and start effects
    candidates.sort((a, b) => b.score - a.score);

    for (const candidate of candidates.slice(0, 3)) { // Max 3 concurrent effects
      if (this.canStartEffect(candidate.effect)) {
        this.startEffect(candidate.effect);
        triggered = true;
      }
    }

    return triggered;
  }

  private canStartEffect(effect: LightingEffect): boolean {
    // Check if we already have too many active effects
    const activeCount = this.state.activeEffects.length;
    if (!effect.layered && activeCount > 0) return false;
    if (activeCount >= 4) return false; // Hard limit

    // Check for conflicting effects
    for (const active of this.state.activeEffects) {
      if (active.type === effect.type && !effect.layered) {
        return false; // Don't stack same type unless layered
      }
    }

    return true;
  }

  private startEffect(effect: LightingEffect): void {
    const activeEffect = {
      ...effect,
      startTime: performance.now()
    };
    
    this.state.activeEffects.push(activeEffect);
    console.log(`💡 Starting lighting effect: ${effect.id} (${effect.type})`);
  }

  public update(): LightingKeyframe {
    const now = performance.now();
    const compositeLighting: LightingKeyframe = {
      time: 0,
      intensity: this.state.ambientLevel,
      color: [1, 1, 1],
      blur: 0,
      position: { x: 0, y: 0 },
      size: 1,
      opacity: this.state.ambientLevel,
      blendMode: 'normal'
    };

    // Update and composite all active effects
    this.state.activeEffects = this.state.activeEffects.filter(activeEffect => {
      const elapsed = (now - (activeEffect as any).startTime) / 1000;
      const duration = activeEffect.duration / this.beatTiming.beatsPerSecond;
      const progress = Math.min(elapsed / duration, 1.0);

      if (progress >= 1.0) {
        return false; // Remove completed effect
      }

      // Interpolate keyframes
      const keyframe = this.interpolateKeyframes(activeEffect.keyframes, progress);
      
      // Composite the lighting effect
      this.compositeLightingKeyframe(compositeLighting, keyframe, activeEffect.type);

      return true;
    });

    // Update strobe phase for continuous effects
    this.state.strobePhase = (this.state.strobePhase + 0.1) % (Math.PI * 2);

    return compositeLighting;
  }

  private interpolateKeyframes(keyframes: LightingKeyframe[], progress: number): LightingKeyframe {
    if (keyframes.length === 1) return keyframes[0];

    let prevKeyframe = keyframes[0];
    let nextKeyframe = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
        prevKeyframe = keyframes[i];
        nextKeyframe = keyframes[i + 1];
        break;
      }
    }

    const keyframeProgress = prevKeyframe.time === nextKeyframe.time ? 0 :
      (progress - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);

    return {
      time: progress,
      intensity: this.lerp(prevKeyframe.intensity, nextKeyframe.intensity, keyframeProgress),
      color: [
        this.lerp(prevKeyframe.color[0], nextKeyframe.color[0], keyframeProgress),
        this.lerp(prevKeyframe.color[1], nextKeyframe.color[1], keyframeProgress),
        this.lerp(prevKeyframe.color[2], nextKeyframe.color[2], keyframeProgress)
      ],
      blur: this.lerp(prevKeyframe.blur, nextKeyframe.blur, keyframeProgress),
      position: {
        x: this.lerp(prevKeyframe.position.x, nextKeyframe.position.x, keyframeProgress),
        y: this.lerp(prevKeyframe.position.y, nextKeyframe.position.y, keyframeProgress)
      },
      size: this.lerp(prevKeyframe.size, nextKeyframe.size, keyframeProgress),
      opacity: this.lerp(prevKeyframe.opacity, nextKeyframe.opacity, keyframeProgress),
      blendMode: nextKeyframe.blendMode
    };
  }

  private compositeLightingKeyframe(composite: LightingKeyframe, addition: LightingKeyframe, effectType: LightingEffectType): void {
    // Apply different compositing based on effect type and blend mode
    switch (addition.blendMode) {
      case 'screen':
        composite.intensity = Math.min(1, composite.intensity + addition.intensity * addition.opacity);
        break;
      case 'multiply':
        composite.intensity = composite.intensity * (1 - addition.opacity + addition.intensity * addition.opacity);
        break;
      case 'overlay':
        const overlayFactor = addition.opacity * addition.intensity;
        composite.intensity = composite.intensity + overlayFactor * (1 - composite.intensity);
        break;
      case 'add':
        composite.intensity = Math.min(1, composite.intensity + addition.intensity * addition.opacity);
        break;
      default: // normal
        composite.intensity = composite.intensity * (1 - addition.opacity) + addition.intensity * addition.opacity;
    }

    // Composite colors
    const factor = addition.opacity * addition.intensity;
    composite.color[0] = Math.min(1, composite.color[0] + addition.color[0] * factor);
    composite.color[1] = Math.min(1, composite.color[1] + addition.color[1] * factor);
    composite.color[2] = Math.min(1, composite.color[2] + addition.color[2] * factor);

    // Max blur for multiple effects
    composite.blur = Math.max(composite.blur, addition.blur * addition.opacity);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public setAmbientLevel(level: number): void {
    this.state.ambientLevel = Math.max(0, Math.min(1, level));
  }

  public setColorTemperature(temp: number): void {
    this.state.colorTemperature = Math.max(0, Math.min(1, temp));
  }

  public getActiveLightingInfo(): { effects: string[]; ambientLevel: number } {
    return {
      effects: this.state.activeEffects.map(effect => `${effect.id} (${effect.type})`),
      ambientLevel: this.state.ambientLevel
    };
  }

  public forceStopAll(): void {
    this.state.activeEffects = [];
  }
}

// Frame content analyzer for contextual lighting
class FrameContentAnalyzer {
  private contentKeywords: Record<string, string[]> = {
    weapon: ['gun', 'pistol', 'rifle', 'weapon', 'sword', 'knife', 'combat', 'action', 'fight'],
    tech: ['cyber', 'neon', 'tech', 'futuristic', 'robot', 'digital', 'hologram', 'matrix'],
    dance: ['dance', 'movement', 'energy', 'party', 'celebration', 'rhythm', 'groove'],
    dramatic: ['closeup', 'face', 'portrait', 'dramatic', 'intense', 'emotion', 'serious'],
    nature: ['outdoor', 'nature', 'landscape', 'sky', 'water', 'forest', 'mountain'],
    urban: ['city', 'street', 'urban', 'building', 'neon', 'traffic', 'graffiti']
  };

  public analyzeFrame(frameUrl: string, stylePreset?: string): string[] {
    const content: string[] = [];

    // Basic analysis from frame URL/filename (simple heuristic)
    const urlLower = frameUrl.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.contentKeywords)) {
      for (const keyword of keywords) {
        if (urlLower.includes(keyword)) {
          content.push(category);
          content.push(keyword);
          break;
        }
      }
    }

    // Analyze style preset for additional context
    if (stylePreset) {
      const styleLower = stylePreset.toLowerCase();
      if (styleLower.includes('cyber') || styleLower.includes('neon')) content.push('tech', 'cyber');
      if (styleLower.includes('noir') || styleLower.includes('dramatic')) content.push('dramatic');
      if (styleLower.includes('anime') || styleLower.includes('character')) content.push('character');
    }

    return [...new Set(content)]; // Remove duplicates
  }
}

// Export singleton instance
export const lightingDirector = new LightingDirector();