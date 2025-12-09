/**
 * Camera Sequence Manager
 * Enhanced camera motion system for smooth multi-frame sequences
 * Integrates with existing Step4Preview camera system
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

export enum CameraMotionType {
  ZOOM_IN = 'zoom_in',
  ZOOM_OUT = 'zoom_out',
  PAN_LEFT = 'pan_left', 
  PAN_RIGHT = 'pan_right',
  SWEEP_CIRCULAR = 'sweep_circular',
  DOLLY_ZOOM = 'dolly_zoom',
  SHAKE_BURST = 'shake_burst',
  TILT_HEADBANG = 'tilt_headbang',
  SPIN_CARD = 'spin_card',
  ZOOM_PUNCH = 'zoom_punch'
}

export enum EnergyMode {
  REST = 'rest',        // Low energy - smooth, gentle motions
  BUILD = 'build',      // Medium energy - gradual intensifying motions  
  IMPACT = 'impact'     // High energy - rapid, dramatic motions
}

export interface CameraKeyframe {
  time: number;         // 0-1 normalized time in sequence
  zoom: number;         // Camera zoom level
  panX: number;         // Pan X offset
  panY: number;         // Pan Y offset
  shakeX: number;       // Shake intensity X
  shakeY: number;       // Shake intensity Y
  rotation: number;     // Rotation degrees
  tiltX: number;        // Vertical tilt (headbang)
  tiltY: number;        // Horizontal tilt (card spin)
  dollyZoom: number;    // Dolly zoom effect (-1 to 1)
  easeType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

export interface CameraSequence {
  id: string;
  type: CameraMotionType;
  energyMode: EnergyMode;
  duration: number;     // Duration in beats
  keyframes: CameraKeyframe[];
  triggerConditions: {
    onBeat?: boolean;
    onSnare?: boolean; 
    onStutter?: boolean;
    energyThreshold?: number;
    beatPattern?: string[];
  };
  priority: number;     // Higher priority sequences override lower ones
}

export interface CameraState {
  currentSequence: CameraSequence | null;
  sequenceStartTime: number;
  activeKeyframe: CameraKeyframe;
  interpolatedState: CameraKeyframe;
  queuedSequences: CameraSequence[];
}

export class CameraSequenceManager {
  private state: CameraState;
  private sequences: Map<string, CameraSequence>;
  private beatTiming: {
    currentBeat: number;
    beatsPerSecond: number;
    lastBeatTime: number;
  };

  constructor() {
    this.state = {
      currentSequence: null,
      sequenceStartTime: 0,
      activeKeyframe: this.createNeutralKeyframe(),
      interpolatedState: this.createNeutralKeyframe(), 
      queuedSequences: []
    };

    this.sequences = new Map();
    this.beatTiming = {
      currentBeat: 0,
      beatsPerSecond: 2, // Default 120 BPM
      lastBeatTime: 0
    };

    this.initializeDefaultSequences();
  }

  private createNeutralKeyframe(): CameraKeyframe {
    return {
      time: 0,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      shakeX: 0,
      shakeY: 0,
      rotation: 0,
      tiltX: 0,
      tiltY: 0,
      dollyZoom: 0,
      easeType: 'linear'
    };
  }

  private initializeDefaultSequences(): void {
    // REST MODE SEQUENCES - Smooth and gentle
    this.addSequence({
      id: 'rest_zoom_breathe',
      type: CameraMotionType.ZOOM_IN,
      energyMode: EnergyMode.REST,
      duration: 8, // 8 beats = 4 seconds at 120 BPM
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in-out' },
        { time: 0.5, zoom: 1.1, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0.1, easeType: 'ease-in-out' },
        { time: 1.0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in-out' }
      ],
      triggerConditions: { energyThreshold: 0.2 },
      priority: 1
    });

    this.addSequence({
      id: 'rest_gentle_sweep',
      type: CameraMotionType.SWEEP_CIRCULAR,
      energyMode: EnergyMode.REST,
      duration: 6,
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in-out' },
        { time: 0.33, zoom: 1.05, panX: 30, panY: 0, shakeX: 0, shakeY: 0, rotation: 2, tiltX: 0, tiltY: 5, dollyZoom: 0.05, easeType: 'ease-in-out' },
        { time: 0.66, zoom: 1.05, panX: 0, panY: 20, shakeX: 0, shakeY: 0, rotation: -2, tiltX: 5, tiltY: 0, dollyZoom: 0.05, easeType: 'ease-in-out' },
        { time: 1.0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in-out' }
      ],
      triggerConditions: { energyThreshold: 0.3 },
      priority: 2
    });

    // BUILD MODE SEQUENCES - Gradual intensification
    this.addSequence({
      id: 'build_zoom_intensify',
      type: CameraMotionType.ZOOM_IN,
      energyMode: EnergyMode.BUILD,
      duration: 4,
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in' },
        { time: 0.25, zoom: 1.1, panX: 0, panY: 0, shakeX: 2, shakeY: 2, rotation: 1, tiltX: 5, tiltY: 0, dollyZoom: 0.1, easeType: 'ease-in' },
        { time: 0.75, zoom: 1.3, panX: 0, panY: 0, shakeX: 8, shakeY: 8, rotation: 3, tiltX: 15, tiltY: 5, dollyZoom: 0.3, easeType: 'ease-out' },
        { time: 1.0, zoom: 1.4, panX: 0, panY: 0, shakeX: 12, shakeY: 12, rotation: 5, tiltX: 20, tiltY: 10, dollyZoom: 0.4, easeType: 'ease-out' }
      ],
      triggerConditions: { energyThreshold: 0.6, onBeat: true },
      priority: 5
    });

    this.addSequence({
      id: 'build_dramatic_pan',
      type: CameraMotionType.PAN_LEFT,
      energyMode: EnergyMode.BUILD,
      duration: 2,
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in' },
        { time: 0.5, zoom: 1.15, panX: -60, panY: 10, shakeX: 5, shakeY: 5, rotation: -8, tiltX: 10, tiltY: -15, dollyZoom: 0.2, easeType: 'ease-in-out' },
        { time: 1.0, zoom: 1.1, panX: -40, panY: 0, shakeX: 3, shakeY: 3, rotation: -5, tiltX: 8, tiltY: -10, dollyZoom: 0.1, easeType: 'ease-out' }
      ],
      triggerConditions: { energyThreshold: 0.7, onSnare: true },
      priority: 6
    });

    // IMPACT MODE SEQUENCES - Rapid and dramatic
    this.addSequence({
      id: 'impact_zoom_punch',
      type: CameraMotionType.ZOOM_PUNCH,
      energyMode: EnergyMode.IMPACT,
      duration: 1, // 1 beat = very fast
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-out' },
        { time: 0.3, zoom: 1.8, panX: 0, panY: 0, shakeX: 25, shakeY: 25, rotation: 8, tiltX: 30, tiltY: 15, dollyZoom: 0.5, easeType: 'bounce' },
        { time: 1.0, zoom: 1.2, panX: 0, panY: 0, shakeX: 10, shakeY: 10, rotation: 3, tiltX: 15, tiltY: 8, dollyZoom: 0.2, easeType: 'ease-out' }
      ],
      triggerConditions: { onBeat: true, energyThreshold: 0.8 },
      priority: 10
    });

    this.addSequence({
      id: 'impact_whip_pan',
      type: CameraMotionType.PAN_RIGHT,
      energyMode: EnergyMode.IMPACT,
      duration: 0.5, // Half beat = extremely fast
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in' },
        { time: 0.6, zoom: 1.3, panX: 120, panY: 30, shakeX: 40, shakeY: 20, rotation: 15, tiltX: 25, tiltY: 30, dollyZoom: 0.3, easeType: 'ease-out' },
        { time: 1.0, zoom: 1.1, panX: 80, panY: 10, shakeX: 15, shakeY: 10, rotation: 8, tiltX: 12, tiltY: 15, dollyZoom: 0.1, easeType: 'bounce' }
      ],
      triggerConditions: { onStutter: true, energyThreshold: 0.9 },
      priority: 12
    });

    this.addSequence({
      id: 'impact_card_spin',
      type: CameraMotionType.SPIN_CARD,
      energyMode: EnergyMode.IMPACT,
      duration: 1,
      keyframes: [
        { time: 0, zoom: 1.0, panX: 0, panY: 0, shakeX: 0, shakeY: 0, rotation: 0, tiltX: 0, tiltY: 0, dollyZoom: 0, easeType: 'ease-in' },
        { time: 0.4, zoom: 1.4, panX: 0, panY: 0, shakeX: 20, shakeY: 20, rotation: 180, tiltX: 45, tiltY: 60, dollyZoom: 0.4, easeType: 'ease-in-out' },
        { time: 1.0, zoom: 1.1, panX: 0, panY: 0, shakeX: 8, shakeY: 8, rotation: 360, tiltX: 15, tiltY: 20, dollyZoom: 0.1, easeType: 'bounce' }
      ],
      triggerConditions: { onSnare: true, energyThreshold: 0.85, beatPattern: ['C'] },
      priority: 11
    });
  }

  public addSequence(sequence: CameraSequence): void {
    this.sequences.set(sequence.id, sequence);
  }

  public updateBeatTiming(beat: number, bpm: number): void {
    this.beatTiming.currentBeat = beat;
    this.beatTiming.beatsPerSecond = bpm / 60;
    this.beatTiming.lastBeatTime = performance.now();
  }

  public tryTriggerSequence(conditions: {
    energy: number;
    onBeat?: boolean;
    onSnare?: boolean;
    onStutter?: boolean;
    beatPattern?: string;
  }): boolean {
    // Don't interrupt high priority sequences
    if (this.state.currentSequence && this.state.currentSequence.priority >= 8) {
      const elapsed = (performance.now() - this.state.sequenceStartTime) / 1000;
      const sequenceDuration = this.state.currentSequence.duration / this.beatTiming.beatsPerSecond;
      if (elapsed < sequenceDuration * 0.5) { // Let high priority sequences play at least 50%
        return false;
      }
    }

    // Find best matching sequence
    let bestSequence: CameraSequence | null = null;
    let bestScore = 0;

    for (const sequence of this.sequences.values()) {
      let score = 0;
      const triggers = sequence.triggerConditions;

      // Energy matching
      if (triggers.energyThreshold) {
        if (conditions.energy >= triggers.energyThreshold) {
          score += 5;
          // Bonus for better energy mode matching
          if (sequence.energyMode === EnergyMode.REST && conditions.energy <= 0.4) score += 3;
          if (sequence.energyMode === EnergyMode.BUILD && conditions.energy >= 0.4 && conditions.energy <= 0.8) score += 3;
          if (sequence.energyMode === EnergyMode.IMPACT && conditions.energy >= 0.7) score += 3;
        } else {
          continue; // Skip if energy threshold not met
        }
      }

      // Trigger condition matching
      if (triggers.onBeat && conditions.onBeat) score += 4;
      if (triggers.onSnare && conditions.onSnare) score += 6;
      if (triggers.onStutter && conditions.onStutter) score += 8;

      // Beat pattern matching
      if (triggers.beatPattern && conditions.beatPattern) {
        if (triggers.beatPattern.includes(conditions.beatPattern)) score += 7;
      }

      // Priority bonus
      score += sequence.priority;

      if (score > bestScore) {
        bestScore = score;
        bestSequence = sequence;
      }
    }

    if (bestSequence && bestScore >= 8) { // Minimum score threshold
      this.startSequence(bestSequence);
      return true;
    }

    return false;
  }

  private startSequence(sequence: CameraSequence): void {
    this.state.currentSequence = sequence;
    this.state.sequenceStartTime = performance.now();
    console.log(`🎬 Starting camera sequence: ${sequence.id} (${sequence.energyMode})`);
  }

  public update(): CameraKeyframe {
    if (!this.state.currentSequence) {
      return this.state.interpolatedState;
    }

    const elapsed = (performance.now() - this.state.sequenceStartTime) / 1000;
    const sequenceDuration = this.state.currentSequence.duration / this.beatTiming.beatsPerSecond;
    const progress = Math.min(elapsed / sequenceDuration, 1.0);

    if (progress >= 1.0) {
      // Sequence completed
      this.state.currentSequence = null;
      this.state.interpolatedState = this.createNeutralKeyframe();
      return this.state.interpolatedState;
    }

    // Interpolate between keyframes
    const keyframes = this.state.currentSequence.keyframes;
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

    const easedProgress = this.applyEasing(keyframeProgress, nextKeyframe.easeType || 'linear');

    // Interpolate all properties
    this.state.interpolatedState = {
      time: progress,
      zoom: this.lerp(prevKeyframe.zoom, nextKeyframe.zoom, easedProgress),
      panX: this.lerp(prevKeyframe.panX, nextKeyframe.panX, easedProgress),
      panY: this.lerp(prevKeyframe.panY, nextKeyframe.panY, easedProgress),
      shakeX: this.lerp(prevKeyframe.shakeX, nextKeyframe.shakeX, easedProgress),
      shakeY: this.lerp(prevKeyframe.shakeY, nextKeyframe.shakeY, easedProgress),
      rotation: this.lerp(prevKeyframe.rotation, nextKeyframe.rotation, easedProgress),
      tiltX: this.lerp(prevKeyframe.tiltX, nextKeyframe.tiltX, easedProgress),
      tiltY: this.lerp(prevKeyframe.tiltY, nextKeyframe.tiltY, easedProgress),
      dollyZoom: this.lerp(prevKeyframe.dollyZoom, nextKeyframe.dollyZoom, easedProgress)
    };

    return this.state.interpolatedState;
  }

  private applyEasing(t: number, easeType: string): number {
    switch (easeType) {
      case 'ease-in': return t * t;
      case 'ease-out': return 1 - (1 - t) * (1 - t);
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'bounce': return t < 1/2.75 ? 7.5625 * t * t : t < 2/2.75 ? 7.5625 * (t -= 1.5/2.75) * t + 0.75 : 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
      default: return t; // linear
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public getCurrentSequenceInfo(): { id: string; progress: number; energyMode: string } | null {
    if (!this.state.currentSequence) return null;
    
    const elapsed = (performance.now() - this.state.sequenceStartTime) / 1000;
    const duration = this.state.currentSequence.duration / this.beatTiming.beatsPerSecond;
    const progress = Math.min(elapsed / duration, 1.0);

    return {
      id: this.state.currentSequence.id,
      progress,
      energyMode: this.state.currentSequence.energyMode
    };
  }

  public forceStop(): void {
    this.state.currentSequence = null;
    this.state.interpolatedState = this.createNeutralKeyframe();
  }
}

// Export singleton instance
export const cameraSequenceManager = new CameraSequenceManager();