/**
 * Adaptive Choreography Integration
 * Connects the new ChoreographyBrain with existing JusDNCE systems
 * Handles style preset integration, frame analysis, and musical context
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { 
  ChoreographyBrain, 
  choreographyBrain, 
  ContentSignature, 
  MusicalContext, 
  AdaptedChoreography 
} from './ChoreographyBrain';
import { adaptiveCameraManager, AdaptiveCameraManager } from './AdaptiveCameraManager';
import { adaptiveLightingManager, AdaptiveLightingManager } from './AdaptiveLightingManager';
import { StylePreset, EnergyLevel, FrameType, SubjectCategory, GeneratedFrame } from '../types';
import { STYLE_PRESETS } from '../constants';
import { HolographicParams } from '../components/Visualizer/HolographicVisualizer';

export interface ChoreographySession {
  style_preset: StylePreset;
  subject_category: SubjectCategory;
  credit_tier: 'turbo' | 'quality' | 'super';
  frames: GeneratedFrame[];
  content_signature: ContentSignature;
  current_choreography: AdaptedChoreography | null;
  last_analysis_time: number;
}

export interface AudioAnalysisFrame {
  bass: number;
  mid: number;
  high: number;
  energy: number;
  timestamp: number;
}

export class AdaptiveChoreographyIntegration {
  private brain: ChoreographyBrain;
  private camera_manager: AdaptiveCameraManager;
  private lighting_manager: AdaptiveLightingManager;
  private current_session: ChoreographySession | null = null;
  private audio_history: AudioAnalysisFrame[] = [];
  private beat_detection: {
    last_beat_time: number;
    last_snare_time: number;
    detected_bpm: number;
    energy_trend: 'rising' | 'falling' | 'stable' | 'chaotic';
  };

  constructor() {
    this.brain = choreographyBrain;
    this.brain = new ChoreographyBrain(STYLE_PRESETS); // Initialize with style presets
    this.camera_manager = adaptiveCameraManager;
    this.lighting_manager = adaptiveLightingManager;
    this.beat_detection = {
      last_beat_time: 0,
      last_snare_time: 0,
      detected_bpm: 120,
      energy_trend: 'stable'
    };
  }

  // INITIALIZE SESSION
  public startChoreographySession(
    style_preset_id: string,
    subject_category: SubjectCategory,
    credit_tier: 'turbo' | 'quality' | 'super',
    frames: GeneratedFrame[]
  ): void {
    const style_preset = STYLE_PRESETS.find(s => s.id === style_preset_id);
    if (!style_preset) {
      throw new Error(`Style preset not found: ${style_preset_id}`);
    }

    // Analyze content from existing frames
    const content_signature = this.brain.analyzeContentFromFrames(frames, subject_category);

    this.current_session = {
      style_preset,
      subject_category,
      credit_tier,
      frames,
      content_signature,
      current_choreography: null,
      last_analysis_time: 0
    };

    console.log(`🎭 Started adaptive choreography session: ${style_preset.name} (${credit_tier})`);
    console.log(`📊 Content analysis:`, content_signature);
  }

  // PROCESS AUDIO FRAME (called from Step4Preview animation loop)
  public processAudioFrame(audio_data: {
    bass: number;
    mid: number;
    high: number;
    timestamp: number;
  }): void {
    if (!this.current_session) return;

    const now = performance.now();
    const energy = (audio_data.bass + audio_data.mid + audio_data.high) / 3;
    
    // Store audio frame
    const audio_frame: AudioAnalysisFrame = {
      ...audio_data,
      energy,
      timestamp: now
    };
    
    this.audio_history.push(audio_frame);
    
    // Maintain history size (keep last 5 seconds at 60fps)
    if (this.audio_history.length > 300) {
      this.audio_history.shift();
    }

    // Update beat detection
    this.updateBeatDetection(audio_data, now);

    // Update energy trend analysis
    this.updateEnergyTrend();

    // Check if we need to analyze and update choreography
    if (this.shouldAnalyzeChoreography(now)) {
      this.analyzeAndUpdateChoreography();
    }
  }

  private updateBeatDetection(audio_data: any, now: number): void {
    const beat_threshold = 0.65;
    const snare_threshold = 0.50;
    const min_beat_interval = 250; // Minimum 250ms between beats

    // Beat detection
    if (audio_data.bass > beat_threshold && (now - this.beat_detection.last_beat_time > min_beat_interval)) {
      this.beat_detection.last_beat_time = now;
      
      // Estimate BPM from beat interval
      if (this.audio_history.length > 2) {
        const previous_beats = this.audio_history
          .filter(f => f.bass > beat_threshold)
          .slice(-5); // Last 5 beats
        
        if (previous_beats.length >= 2) {
          const intervals = previous_beats
            .slice(1)
            .map((beat, i) => beat.timestamp - previous_beats[i].timestamp);
          const avg_interval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          this.beat_detection.detected_bpm = 60000 / avg_interval; // Convert ms to BPM
        }
      }
    }

    // Snare detection
    if (audio_data.mid > snare_threshold && (now - this.beat_detection.last_snare_time > min_beat_interval)) {
      this.beat_detection.last_snare_time = now;
    }

    // Update camera and lighting managers with beat timing
    this.camera_manager.updateBeatTiming(0, this.beat_detection.detected_bpm);
    this.lighting_manager.updateBeatTiming(0, this.beat_detection.detected_bpm);
  }

  private updateEnergyTrend(): void {
    if (this.audio_history.length < 30) return; // Need at least 30 frames (0.5 seconds)

    const recent_energy = this.audio_history.slice(-15).map(f => f.energy);
    const older_energy = this.audio_history.slice(-30, -15).map(f => f.energy);

    const recent_avg = recent_energy.reduce((a, b) => a + b, 0) / recent_energy.length;
    const older_avg = older_energy.reduce((a, b) => a + b, 0) / older_energy.length;

    const energy_change = recent_avg - older_avg;
    const change_threshold = 0.05;

    if (energy_change > change_threshold) {
      this.beat_detection.energy_trend = 'rising';
    } else if (energy_change < -change_threshold) {
      this.beat_detection.energy_trend = 'falling';
    } else if (recent_avg > 0.7) {
      this.beat_detection.energy_trend = 'stable';
    } else {
      // Look for chaotic patterns
      const variance = recent_energy.reduce((sum, e) => sum + Math.pow(e - recent_avg, 2), 0) / recent_energy.length;
      this.beat_detection.energy_trend = variance > 0.1 ? 'chaotic' : 'stable';
    }
  }

  private shouldAnalyzeChoreography(now: number): boolean {
    if (!this.current_session) return false;

    const time_since_last_analysis = now - this.current_session.last_analysis_time;
    const min_analysis_interval = 1000; // Analyze at most once per second

    return time_since_last_analysis > min_analysis_interval;
  }

  private analyzeAndUpdateChoreography(): void {
    if (!this.current_session) return;

    const now = performance.now();
    
    // Create musical context from recent audio analysis
    const musical_context = this.createMusicalContext();
    
    // Select appropriate choreography pattern
    const selected_pattern = this.brain.analyzeAndSelectPattern(
      this.current_session.content_signature,
      musical_context,
      this.current_session.style_preset,
      this.current_session.credit_tier,
      this.current_session.subject_category
    );

    // Adapt pattern to current context
    const adapted_choreography = this.brain.adaptPatternToContext(selected_pattern);
    
    this.current_session.current_choreography = adapted_choreography;
    this.current_session.last_analysis_time = now;

    console.log(`🧠 Selected choreography pattern: ${selected_pattern.name}`);
    console.log(`🎬 Camera config:`, adapted_choreography.camera_config);
    console.log(`💡 Lighting config:`, adapted_choreography.lighting_config);
  }

  private createMusicalContext(): MusicalContext {
    if (this.audio_history.length === 0) {
      // Return default context
      return {
        energy_level: 0.3,
        energy_trend: 'stable',
        rhythmic_density: 0.5,
        harmonic_tension: 0.3,
        genre_markers: ['ambient'],
        structure_phase: 'verse'
      };
    }

    const recent_frames = this.audio_history.slice(-60); // Last second at 60fps
    const current_energy = recent_frames[recent_frames.length - 1]?.energy || 0;

    // Analyze rhythmic density from beat patterns
    const beat_density = this.analyzeBeatDensity(recent_frames);
    
    // Analyze harmonic tension from frequency distribution
    const harmonic_tension = this.analyzeHarmonicTension(recent_frames);

    // Determine genre markers from audio characteristics
    const genre_markers = this.analyzeGenreMarkers(recent_frames);

    // Estimate musical structure phase
    const structure_phase = this.estimateStructuralPhase(current_energy, this.beat_detection.energy_trend);

    return {
      energy_level: current_energy,
      energy_trend: this.beat_detection.energy_trend,
      rhythmic_density: beat_density,
      harmonic_tension,
      genre_markers,
      structure_phase
    };
  }

  private analyzeBeatDensity(frames: AudioAnalysisFrame[]): number {
    const beat_threshold = 0.6;
    const beats = frames.filter(f => f.bass > beat_threshold);
    return Math.min(beats.length / frames.length * 4, 1.0); // Normalize to 0-1
  }

  private analyzeHarmonicTension(frames: AudioAnalysisFrame[]): number {
    // Use mid-range frequencies to estimate harmonic complexity
    const avg_mid = frames.reduce((sum, f) => sum + f.mid, 0) / frames.length;
    const avg_high = frames.reduce((sum, f) => sum + f.high, 0) / frames.length;
    
    // Higher mid/high ratio suggests more harmonic tension
    return Math.min((avg_mid + avg_high) * 0.7, 1.0);
  }

  private analyzeGenreMarkers(frames: AudioAnalysisFrame[]): string[] {
    const markers: string[] = [];
    
    const avg_bass = frames.reduce((sum, f) => sum + f.bass, 0) / frames.length;
    const avg_mid = frames.reduce((sum, f) => sum + f.mid, 0) / frames.length;
    const avg_high = frames.reduce((sum, f) => sum + f.high, 0) / frames.length;

    if (avg_bass > 0.7) markers.push('electronic', 'dance');
    if (avg_high > 0.6) markers.push('bright', 'energetic');
    if (avg_mid > 0.6 && avg_bass > 0.5) markers.push('aggressive');
    if (avg_bass < 0.3 && avg_mid < 0.4) markers.push('ambient', 'calm');
    
    // Analyze variance for rhythm detection
    const bass_variance = this.calculateVariance(frames.map(f => f.bass));
    if (bass_variance > 0.1) markers.push('rhythmic');
    
    return markers.length > 0 ? markers : ['general'];
  }

  private estimateStructuralPhase(energy: number, trend: string): MusicalContext['structure_phase'] {
    if (energy < 0.3) return 'intro';
    if (energy > 0.8 && trend === 'rising') return 'chorus';
    if (energy > 0.7 && trend === 'falling') return 'breakdown';
    if (trend === 'chaotic') return 'bridge';
    return 'verse';
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  // PUBLIC INTERFACE FOR STEP4PREVIEW
  public shouldTriggerCameraMotion(context: {
    energy: number;
    onBeat: boolean;
    onSnare: boolean;
  }): boolean {
    if (!this.current_session?.current_choreography) return false;

    const camera_config = this.current_session.current_choreography.camera_config;
    const now = performance.now();
    
    const motion_context = {
      energy_level: context.energy,
      beat_detected: context.onBeat,
      snare_detected: context.onSnare,
      musical_phase: this.createMusicalContext().structure_phase,
      time_since_last_motion: now - this.beat_detection.last_beat_time
    };

    return this.camera_manager.shouldTriggerSequence(motion_context, camera_config);
  }

  public triggerCameraMotion(): void {
    if (!this.current_session?.current_choreography) return;

    const camera_config = this.current_session.current_choreography.camera_config;
    this.camera_manager.startSequence(camera_config);
  }

  public shouldTriggerLighting(context: {
    energy: number;
    onBeat: boolean;
    onSnare: boolean;
    frameUrl?: string;
    cameraActive: boolean;
  }): boolean {
    if (!this.current_session?.current_choreography) return false;

    const lighting_config = this.current_session.current_choreography.lighting_config;
    
    const lighting_context = {
      energy_level: context.energy,
      beat_detected: context.onBeat,
      snare_detected: context.onSnare,
      camera_motion_active: context.cameraActive,
      hologram_params: this.current_session.style_preset.hologramParams,
      style_hue: this.current_session.style_preset.hologramParams.hue || 200
    };

    return this.lighting_manager.shouldTriggerEffect(lighting_context, lighting_config);
  }

  public triggerLighting(context: { cameraActive: boolean; frameUrl?: string }): void {
    if (!this.current_session?.current_choreography) return;

    const lighting_config = this.current_session.current_choreography.lighting_config;
    
    const lighting_context = {
      energy_level: this.audio_history[this.audio_history.length - 1]?.energy || 0.5,
      beat_detected: performance.now() - this.beat_detection.last_beat_time < 100,
      snare_detected: performance.now() - this.beat_detection.last_snare_time < 100,
      camera_motion_active: context.cameraActive,
      hologram_params: this.current_session.style_preset.hologramParams,
      style_hue: this.current_session.style_preset.hologramParams.hue || 200
    };

    this.lighting_manager.startEffect(lighting_config, lighting_context);
  }

  public getCameraUpdate(): any {
    return this.camera_manager.update();
  }

  public getLightingUpdate(): any {
    return this.lighting_manager.update();
  }

  public getCurrentPattern(): string | null {
    return this.current_session?.current_choreography?.pattern_id || null;
  }

  public getSessionInfo(): any {
    if (!this.current_session) return null;

    return {
      pattern: this.current_session.current_choreography?.pattern_id,
      content_complexity: this.current_session.content_signature.complexity,
      energy_trend: this.beat_detection.energy_trend,
      detected_bpm: this.beat_detection.detected_bpm,
      camera_info: this.camera_manager.getActiveSequenceInfo(),
      lighting_info: this.lighting_manager.getActiveLightingInfo()
    };
  }

  public reset(): void {
    this.current_session = null;
    this.audio_history = [];
    this.camera_manager.forceStop();
    this.lighting_manager.forceStopAll();
    this.beat_detection = {
      last_beat_time: 0,
      last_snare_time: 0,
      detected_bpm: 120,
      energy_trend: 'stable'
    };
  }
}

// Export singleton instance
export const adaptiveChoreographyIntegration = new AdaptiveChoreographyIntegration();