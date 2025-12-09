/**
 * Adaptive Lighting Manager  
 * Replaces keyword-based lighting with dynamic mood-based effects
 * Works with ChoreographyBrain and integrates with existing hologram system
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { AdaptedLightingConfig, ChoreographyBrain, choreographyBrain } from './ChoreographyBrain';
import { LightingKeyframe } from './LightingDirector';
import { HolographicParams } from '../components/Visualizer/HolographicVisualizer';

export interface DynamicLightingEffect {
  id: string;
  config: AdaptedLightingConfig;
  start_time: number;
  duration: number;
  current_phase: number;
  keyframes: LightingKeyframe[];
  priority: number;
}

export interface LightingContext {
  energy_level: number;
  beat_detected: boolean;
  snare_detected: boolean;
  camera_motion_active: boolean;
  hologram_params?: HolographicParams;
  style_hue: number;
}

export class AdaptiveLightingManager {
  private active_effects: DynamicLightingEffect[] = [];
  private brain: ChoreographyBrain;
  private beat_timing: {
    current_beat: number;
    beats_per_second: number;
    last_beat_time: number;
  };
  private effect_counter = 0;

  constructor() {
    this.brain = choreographyBrain;
    this.beat_timing = {
      current_beat: 0,
      beats_per_second: 2,
      last_beat_time: 0
    };
  }

  public updateBeatTiming(beat: number, bpm: number): void {
    this.beat_timing.current_beat = beat;
    this.beat_timing.beats_per_second = bpm / 60;
    this.beat_timing.last_beat_time = performance.now();
  }

  public shouldTriggerEffect(context: LightingContext, config: AdaptedLightingConfig): boolean {
    const now = performance.now();
    
    // Check if we're at the effect limit
    if (this.active_effects.length >= config.effect_count) {
      return false;
    }

    // Energy-based triggering
    if (context.energy_level > 0.6 && context.beat_detected) return true;
    if (context.energy_level > 0.7 && context.snare_detected) return true;
    
    // Camera coordination triggering
    if (config.sync_mode === 'camera' && context.camera_motion_active) return true;
    
    // Time-based triggering for ambient effects
    if (config.sync_mode === 'content' && this.active_effects.length === 0) {
      const time_since_last_effect = this.getTimeSinceLastEffect();
      if (time_since_last_effect > 2000) return true; // 2 seconds
    }
    
    return false;
  }

  private getTimeSinceLastEffect(): number {
    if (this.active_effects.length === 0) return Infinity;
    
    const newest_effect = this.active_effects.reduce((newest, effect) => 
      effect.start_time > newest.start_time ? effect : newest
    );
    
    return performance.now() - newest_effect.start_time;
  }

  public generateDynamicEffect(config: AdaptedLightingConfig, context: LightingContext): DynamicLightingEffect {
    const duration = this.calculateEffectDuration(config, context);
    const keyframes = this.generateAdaptiveKeyframes(config, context, duration);
    const priority = this.calculateEffectPriority(config, context);
    
    return {
      id: `adaptive_${this.effect_counter++}`,
      config,
      start_time: performance.now(),
      duration,
      current_phase: 0,
      keyframes,
      priority
    };
  }

  private calculateEffectDuration(config: AdaptedLightingConfig, context: LightingContext): number {
    let base_duration = 2.0; // 2 seconds base
    
    // Adjust based on sync mode
    switch (config.sync_mode) {
      case 'beat':
        base_duration = 1.0 / this.beat_timing.beats_per_second; // One beat
        break;
      case 'energy':
        base_duration = context.energy_level > 0.8 ? 0.5 : 2.0;
        break;
      case 'camera':
        base_duration = 1.5; // Coordinate with camera sequences
        break;
      case 'content':
        base_duration = 3.0; // Longer ambient effects
        break;
    }
    
    // Scale with effect intensity
    return base_duration * (0.5 + config.effect_intensity * 0.5);
  }

  private calculateEffectPriority(config: AdaptedLightingConfig, context: LightingContext): number {
    let priority = 5;
    
    // High energy effects get priority
    priority += context.energy_level * 10;
    
    // Beat-synced effects get priority
    if (context.beat_detected) priority += 5;
    if (context.snare_detected) priority += 8;
    
    // Camera coordination gets priority
    if (context.camera_motion_active && config.sync_mode === 'camera') priority += 7;
    
    return priority;
  }

  private generateAdaptiveKeyframes(
    config: AdaptedLightingConfig, 
    context: LightingContext, 
    duration: number
  ): LightingKeyframe[] {
    const keyframes: LightingKeyframe[] = [];
    const frame_count = Math.max(3, Math.round(duration * 3)); // 3 keyframes per second
    
    // Select colors based on strategy
    const colors = this.selectColorsForContext(config, context);
    const positions = this.generatePositions(config, context);
    
    for (let i = 0; i < frame_count; i++) {
      const t = i / (frame_count - 1); // 0 to 1
      const color_index = Math.floor(t * colors.length) % colors.length;
      const position_index = Math.floor(t * positions.length) % positions.length;
      
      keyframes.push({
        time: t,
        intensity: this.calculateIntensityCurve(t, config),
        color: this.hslToRgb(colors[color_index], 0.8, 0.6),
        blur: this.calculateBlurCurve(t, config),
        position: positions[position_index],
        size: this.calculateSizeCurve(t, config),
        opacity: this.calculateOpacityCurve(t, config),
        blendMode: this.selectBlendModeForPhase(t, config)
      });
    }
    
    return keyframes;
  }

  private selectColorsForContext(config: AdaptedLightingConfig, context: LightingContext): number[] {
    const base_palette = config.base_color_palette;
    
    // If hologram integration is enabled, blend with hologram colors
    if (config.hologram_integration && context.hologram_params) {
      const hologram_hue = context.hologram_params.hue || 200;
      return [hologram_hue, ...base_palette.slice(0, 2)];
    }
    
    return base_palette;
  }

  private generatePositions(config: AdaptedLightingConfig, context: LightingContext): Array<{x: number, y: number}> {
    const positions = [];
    
    if (context.camera_motion_active) {
      // Follow camera motion with offset positions
      positions.push(
        { x: 0.2, y: -0.1 },
        { x: -0.2, y: 0.1 },
        { x: 0, y: 0.3 }
      );
    } else {
      // Standard centered positions
      positions.push(
        { x: 0, y: 0 },
        { x: 0.1, y: -0.2 },
        { x: -0.1, y: 0.2 }
      );
    }
    
    return positions;
  }

  private calculateIntensityCurve(t: number, config: AdaptedLightingConfig): number {
    const base_intensity = config.effect_intensity;
    
    // Different intensity curves for different sync modes
    switch (config.sync_mode) {
      case 'beat':
        // Sharp attack, quick decay
        return base_intensity * Math.exp(-t * 4);
      case 'energy':
        // Sustained intensity
        return base_intensity * (0.7 + 0.3 * Math.sin(t * Math.PI));
      case 'camera':
        // Follow typical camera motion curve
        return base_intensity * Math.sin(t * Math.PI);
      case 'content':
      default:
        // Gentle fade in and out
        return base_intensity * Math.sin(t * Math.PI);
    }
  }

  private calculateBlurCurve(t: number, config: AdaptedLightingConfig): number {
    const max_blur = config.effect_intensity * 20;
    
    // More blur at the peak of the effect
    return max_blur * Math.sin(t * Math.PI);
  }

  private calculateSizeCurve(t: number, config: AdaptedLightingConfig): number {
    const base_size = 0.5 + config.effect_intensity * 0.5;
    
    // Size grows and shrinks
    return base_size * (0.3 + 0.7 * Math.sin(t * Math.PI));
  }

  private calculateOpacityCurve(t: number, config: AdaptedLightingConfig): number {
    const max_opacity = config.effect_intensity;
    
    // Standard fade in/out
    return max_opacity * Math.sin(t * Math.PI);
  }

  private selectBlendModeForPhase(t: number, config: AdaptedLightingConfig): LightingKeyframe['blendMode'] {
    const modes = config.blend_modes;
    if (modes.length === 1) return modes[0] as any;
    
    const phase_index = Math.floor(t * modes.length);
    return modes[phase_index % modes.length] as any;
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 1/6) { r = c; g = x; b = 0; }
    else if (1/6 <= h && h < 2/6) { r = x; g = c; b = 0; }
    else if (2/6 <= h && h < 3/6) { r = 0; g = c; b = x; }
    else if (3/6 <= h && h < 4/6) { r = 0; g = x; b = c; }
    else if (4/6 <= h && h < 5/6) { r = x; g = 0; b = c; }
    else if (5/6 <= h && h < 1) { r = c; g = 0; b = x; }
    
    return [r + m, g + m, b + m];
  }

  public update(): LightingKeyframe {
    const now = performance.now();
    
    // Update all active effects
    this.active_effects = this.active_effects.filter(effect => {
      const elapsed = (now - effect.start_time) / 1000;
      const progress = Math.min(elapsed / effect.duration, 1.0);
      
      if (progress >= 1.0) {
        return false; // Remove completed effect
      }
      
      effect.current_phase = progress;
      return true;
    });
    
    // Composite all active effects
    return this.compositeEffects();
  }

  private compositeEffects(): LightingKeyframe {
    if (this.active_effects.length === 0) {
      // Return ambient lighting
      return {
        time: 0,
        intensity: 0.3,
        color: [1, 1, 1],
        blur: 0,
        position: { x: 0, y: 0 },
        size: 1,
        opacity: 0.3,
        blendMode: 'normal'
      };
    }
    
    // Sort by priority
    const sorted_effects = [...this.active_effects].sort((a, b) => b.priority - a.priority);
    
    // Start with the highest priority effect
    const primary_effect = sorted_effects[0];
    const primary_keyframe = this.interpolateKeyframes(primary_effect.keyframes, primary_effect.current_phase);
    
    // Blend in additional effects
    let composite_intensity = primary_keyframe.intensity;
    let composite_color = [...primary_keyframe.color] as [number, number, number];
    let composite_blur = primary_keyframe.blur;
    
    for (let i = 1; i < Math.min(sorted_effects.length, 3); i++) {
      const effect = sorted_effects[i];
      const keyframe = this.interpolateKeyframes(effect.keyframes, effect.current_phase);
      const weight = 0.3 / i; // Diminishing weight for secondary effects
      
      composite_intensity = Math.min(1, composite_intensity + keyframe.intensity * weight);
      composite_color[0] = Math.min(1, composite_color[0] + keyframe.color[0] * weight);
      composite_color[1] = Math.min(1, composite_color[1] + keyframe.color[1] * weight);
      composite_color[2] = Math.min(1, composite_color[2] + keyframe.color[2] * weight);
      composite_blur = Math.max(composite_blur, keyframe.blur * weight);
    }
    
    return {
      ...primary_keyframe,
      intensity: composite_intensity,
      color: composite_color,
      blur: composite_blur
    };
  }

  private interpolateKeyframes(keyframes: LightingKeyframe[], progress: number): LightingKeyframe {
    if (keyframes.length === 1) return keyframes[0];
    
    // Find surrounding keyframes
    let prev_frame = keyframes[0];
    let next_frame = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
        prev_frame = keyframes[i];
        next_frame = keyframes[i + 1];
        break;
      }
    }
    
    // Calculate interpolation factor
    const time_span = next_frame.time - prev_frame.time;
    const local_progress = time_span === 0 ? 0 : (progress - prev_frame.time) / time_span;
    
    // Interpolate all properties
    return {
      time: progress,
      intensity: this.lerp(prev_frame.intensity, next_frame.intensity, local_progress),
      color: [
        this.lerp(prev_frame.color[0], next_frame.color[0], local_progress),
        this.lerp(prev_frame.color[1], next_frame.color[1], local_progress),
        this.lerp(prev_frame.color[2], next_frame.color[2], local_progress)
      ],
      blur: this.lerp(prev_frame.blur, next_frame.blur, local_progress),
      position: {
        x: this.lerp(prev_frame.position.x, next_frame.position.x, local_progress),
        y: this.lerp(prev_frame.position.y, next_frame.position.y, local_progress)
      },
      size: this.lerp(prev_frame.size, next_frame.size, local_progress),
      opacity: this.lerp(prev_frame.opacity, next_frame.opacity, local_progress),
      blendMode: next_frame.blendMode
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public startEffect(config: AdaptedLightingConfig, context: LightingContext): void {
    const effect = this.generateDynamicEffect(config, context);
    this.active_effects.push(effect);
    
    // Limit total effects
    if (this.active_effects.length > config.effect_count) {
      // Remove lowest priority effects
      this.active_effects.sort((a, b) => b.priority - a.priority);
      this.active_effects = this.active_effects.slice(0, config.effect_count);
    }
    
    console.log(`💡 Starting adaptive lighting effect with intensity ${config.effect_intensity.toFixed(2)}`);
  }

  public forceStopAll(): void {
    this.active_effects = [];
  }

  public getActiveLightingInfo(): { effects: string[]; total_intensity: number } {
    const effects = this.active_effects.map(e => `${e.id} (${e.config.sync_mode})`);
    const total_intensity = this.active_effects.reduce((sum, e) => 
      sum + e.config.effect_intensity * (1 - e.current_phase), 0
    );
    
    return { effects, total_intensity };
  }
}

export const adaptiveLightingManager = new AdaptiveLightingManager();