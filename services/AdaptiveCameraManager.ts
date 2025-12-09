/**
 * Adaptive Camera Manager
 * Replaces rigid camera sequences with dynamic pattern-based motion
 * Works with ChoreographyBrain to generate contextual camera movements
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { AdaptedCameraConfig, ChoreographyBrain, choreographyBrain } from './ChoreographyBrain';
import { CameraKeyframe } from './CameraSequenceManager';

export interface DynamicCameraSequence {
  id: string;
  config: AdaptedCameraConfig;
  start_time: number;
  duration: number;
  current_phase: number; // 0-1 progress through sequence
  keyframes: CameraKeyframe[];
}

export interface CameraMotionContext {
  energy_level: number;
  beat_detected: boolean;
  snare_detected: boolean;
  musical_phase: string;
  time_since_last_motion: number;
}

export class AdaptiveCameraManager {
  private active_sequence: DynamicCameraSequence | null = null;
  private brain: ChoreographyBrain;
  private beat_timing: {
    current_beat: number;
    beats_per_second: number;
    last_beat_time: number;
  };

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

  public shouldTriggerSequence(context: CameraMotionContext, adapted_config: AdaptedCameraConfig): boolean {
    const now = performance.now();
    
    // Don't interrupt recent sequences unless energy is very high
    if (this.active_sequence) {
      const sequence_age = (now - this.active_sequence.start_time) / 1000;
      const min_duration = this.active_sequence.duration * 0.3; // Let sequence play at least 30%
      
      if (sequence_age < min_duration && context.energy_level < 0.8) {
        return false;
      }
    }

    // Energy-based triggering
    if (context.energy_level > 0.6 && context.beat_detected) return true;
    if (context.energy_level > 0.8 && context.snare_detected) return true;
    
    // Time-based triggering (don't let camera stay static too long)
    if (context.time_since_last_motion > 4000) return true; // 4 seconds
    
    return false;
  }

  public generateDynamicSequence(config: AdaptedCameraConfig): DynamicCameraSequence {
    const duration = config.sequence_duration / this.beat_timing.beats_per_second;
    const keyframes = this.generateAdaptiveKeyframes(config, duration);
    
    return {
      id: `dynamic_${Date.now()}`,
      config,
      start_time: performance.now(),
      duration,
      current_phase: 0,
      keyframes
    };
  }

  private generateAdaptiveKeyframes(config: AdaptedCameraConfig, duration: number): CameraKeyframe[] {
    const keyframes: CameraKeyframe[] = [];
    const frame_count = Math.max(3, Math.round(duration * 2)); // 2 keyframes per second minimum
    
    for (let i = 0; i < frame_count; i++) {
      const t = i / (frame_count - 1); // 0 to 1
      const eased_t = this.applyEasing(t, config.easing_style);
      
      keyframes.push({
        time: t,
        zoom: this.interpolateZoom(eased_t, config),
        panX: this.interpolatePan(eased_t, config, 'x'),
        panY: this.interpolatePan(eased_t, config, 'y'),
        shakeX: this.interpolateShake(eased_t, config, 'x'),
        shakeY: this.interpolateShake(eased_t, config, 'y'),
        rotation: this.interpolateRotation(eased_t, config),
        tiltX: this.interpolateTilt(eased_t, config, 'x'),
        tiltY: this.interpolateTilt(eased_t, config, 'y'),
        dollyZoom: this.interpolateDollyZoom(eased_t, config),
        easeType: config.easing_style as any
      });
    }
    
    return keyframes;
  }

  private interpolateZoom(t: number, config: AdaptedCameraConfig): number {
    const [min_zoom, max_zoom] = config.zoom_range;
    
    // Create zoom curve based on motion intensity
    if (config.motion_intensity > 0.8) {
      // High intensity: dramatic zoom in then out
      const peak_t = 0.3;
      if (t <= peak_t) {
        return 1.0 + (max_zoom - 1.0) * (t / peak_t);
      } else {
        const decay = (t - peak_t) / (1.0 - peak_t);
        return max_zoom + (min_zoom - max_zoom) * decay;
      }
    } else if (config.motion_intensity > 0.5) {
      // Medium intensity: gradual zoom with slight pullback
      return 1.0 + (max_zoom - 1.0) * Math.sin(t * Math.PI);
    } else {
      // Low intensity: gentle breathing motion
      return 1.0 + (max_zoom - 1.0) * Math.sin(t * Math.PI * 2) * 0.5;
    }
  }

  private interpolatePan(t: number, config: AdaptedCameraConfig, axis: 'x' | 'y'): number {
    const amplitude = config.pan_amplitude;
    
    if (config.motion_intensity > 0.7) {
      // Dynamic pan motion
      return amplitude * Math.sin(t * Math.PI * 3 + (axis === 'x' ? 0 : Math.PI/2));
    } else {
      // Gentle drift
      return amplitude * 0.5 * Math.sin(t * Math.PI * 2 + (axis === 'x' ? 0 : Math.PI/4));
    }
  }

  private interpolateShake(t: number, config: AdaptedCameraConfig, axis: 'x' | 'y'): number {
    const intensity = config.shake_intensity;
    
    if (intensity === 0) return 0;
    
    // Shake that peaks in middle and decays
    const envelope = Math.sin(t * Math.PI);
    const noise = Math.sin(t * Math.PI * 20 + (axis === 'x' ? 0 : 1.5)) * envelope;
    
    return intensity * noise;
  }

  private interpolateRotation(t: number, config: AdaptedCameraConfig): number {
    const max_rotation = config.motion_intensity * 10; // Max 10 degrees
    
    // Rotation that follows pan motion
    return max_rotation * Math.sin(t * Math.PI * 2);
  }

  private interpolateTilt(t: number, config: AdaptedCameraConfig, axis: 'x' | 'y'): number {
    const max_tilt = config.motion_intensity * 15; // Max 15 degrees
    
    if (axis === 'x') {
      // Vertical tilt (headbang effect)
      return max_tilt * Math.cos(t * Math.PI * 2);
    } else {
      // Horizontal tilt (card spin effect)
      return max_tilt * 0.5 * Math.sin(t * Math.PI * 3);
    }
  }

  private interpolateDollyZoom(t: number, config: AdaptedCameraConfig): number {
    // Dolly zoom creates cinematic effect
    if (config.motion_intensity > 0.8) {
      return 0.3 * Math.sin(t * Math.PI);
    }
    return 0;
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'ease-in': return t * t;
      case 'ease-out': return 1 - (1 - t) * (1 - t);
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'linear':
      default: return t;
    }
  }

  public update(): CameraKeyframe | null {
    if (!this.active_sequence) return null;

    const now = performance.now();
    const elapsed = (now - this.active_sequence.start_time) / 1000;
    const progress = Math.min(elapsed / this.active_sequence.duration, 1.0);

    if (progress >= 1.0) {
      // Sequence completed
      this.active_sequence = null;
      return null;
    }

    // Update sequence phase
    this.active_sequence.current_phase = progress;

    // Interpolate between keyframes
    return this.interpolateKeyframes(this.active_sequence.keyframes, progress);
  }

  private interpolateKeyframes(keyframes: CameraKeyframe[], progress: number): CameraKeyframe {
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
      zoom: this.lerp(prev_frame.zoom, next_frame.zoom, local_progress),
      panX: this.lerp(prev_frame.panX, next_frame.panX, local_progress),
      panY: this.lerp(prev_frame.panY, next_frame.panY, local_progress),
      shakeX: this.lerp(prev_frame.shakeX, next_frame.shakeX, local_progress),
      shakeY: this.lerp(prev_frame.shakeY, next_frame.shakeY, local_progress),
      rotation: this.lerp(prev_frame.rotation, next_frame.rotation, local_progress),
      tiltX: this.lerp(prev_frame.tiltX, next_frame.tiltX, local_progress),
      tiltY: this.lerp(prev_frame.tiltY, next_frame.tiltY, local_progress),
      dollyZoom: this.lerp(prev_frame.dollyZoom, next_frame.dollyZoom, local_progress),
      easeType: next_frame.easeType
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public startSequence(config: AdaptedCameraConfig): void {
    this.active_sequence = this.generateDynamicSequence(config);
    console.log(`🎬 Starting adaptive camera sequence with intensity ${config.motion_intensity.toFixed(2)}`);
  }

  public forceStop(): void {
    this.active_sequence = null;
  }

  public getActiveSequenceInfo(): { config: AdaptedCameraConfig; progress: number } | null {
    if (!this.active_sequence) return null;
    
    return {
      config: this.active_sequence.config,
      progress: this.active_sequence.current_phase
    };
  }
}

export const adaptiveCameraManager = new AdaptiveCameraManager();