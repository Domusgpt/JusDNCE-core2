/**
 * VIB34DIntegration.ts
 * 
 * Integrates VIB34D Choreography Engine with JusDNCE export system
 * Provides advanced 4D visualization and choreography for frame generation
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

// VIB34D Types
export interface ChoreographySequence {
  name: string;
  duration: number; // beats
  trigger: 'beat' | 'measure' | 'energy' | 'manual';
  parameters: {
    [visualizerName: string]: {
      [paramName: string]: {
        keyframes: Array<{
          time: number; // 0-1 normalized
          value: number | number[];
          ease?: 'linear' | 'ease-in' | 'ease-out' | 'elastic';
        }>;
      };
    };
  };
}

export interface VIB34DConfig {
  bpm: number;
  visualizers: string[];
  sequences: ChoreographySequence[];
  enablePredictive: boolean;
  energyThreshold: number;
}

export interface VisualizerState {
  name: string;
  parameters: { [key: string]: any };
  active: boolean;
  intensity: number;
}

export interface ChoreographyFrame {
  timestamp: number;
  visualizers: VisualizerState[];
  audioData: {
    bass: number;
    mid: number;
    high: number;
    energy: number;
    beat: boolean;
  };
  choreographySequence?: string;
}

// Main VIB34D Integration Class
export class VIB34DIntegration {
  private config: VIB34DConfig;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private running = false;
  private startTime = 0;
  private currentBeat = 0;
  private beatDuration = 500; // ms
  
  // State
  private visualizerStates: Map<string, VisualizerState> = new Map();
  private activeSequences: ChoreographySequence[] = [];
  private frameHistory: ChoreographyFrame[] = [];
  private audioBuffer: Float32Array | null = null;
  
  constructor(config: Partial<VIB34DConfig> = {}) {
    this.config = {
      bpm: 120,
      visualizers: ['quantum', 'faceted', 'holographic'],
      sequences: [],
      enablePredictive: true,
      energyThreshold: 0.7,
      ...config
    };
    
    this.beatDuration = (60 / this.config.bpm) * 1000;
    this.initializeVisualizers();
    
    console.log('🌌 VIB34D Integration initialized', this.config);
  }

  /**
   * Initialize default visualizer states
   */
  private initializeVisualizers() {
    this.config.visualizers.forEach(name => {
      this.visualizerStates.set(name, {
        name,
        parameters: this.getDefaultParameters(name),
        active: true,
        intensity: 1.0
      });
    });
  }

  /**
   * Get default parameters for each visualizer type
   */
  private getDefaultParameters(visualizerName: string): { [key: string]: any } {
    switch (visualizerName) {
      case 'quantum':
        return {
          rotationSpeed: 1.0,
          particleDensity: 0.8,
          energyField: 0.5,
          quantumFlux: 0.3,
          colorShift: [0.5, 0.7, 1.0]
        };
      case 'faceted':
        return {
          faceCount: 20,
          rotation: [0, 0, 0],
          reflection: 0.6,
          refraction: 1.2,
          crystallinity: 0.8
        };
      case 'holographic':
        return {
          hologramDepth: 0.5,
          interferencePattern: 0.3,
          coherence: 0.9,
          wavelength: 550,
          laserIntensity: 1.0
        };
      default:
        return {};
    }
  }

  /**
   * Analyze audio file and extract frame choreography data
   */
  async analyzeAudioForChoreography(audioFile: File): Promise<ChoreographyFrame[]> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Extract audio features
      const frames = await this.extractChoreographyFrames(audioBuffer);
      
      console.log(`🎵 Extracted ${frames.length} choreography frames from audio`);
      return frames;
      
    } catch (error) {
      console.error('❌ Audio analysis failed:', error);
      return [];
    }
  }

  /**
   * Extract choreography frames from audio buffer
   */
  private async extractChoreographyFrames(audioBuffer: AudioBuffer): Promise<ChoreographyFrame[]> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;
    
    // Frame rate for choreography (24fps for smooth animation)
    const frameRate = 24;
    const framesCount = Math.floor(duration * frameRate);
    const samplesPerFrame = Math.floor(channelData.length / framesCount);
    
    const frames: ChoreographyFrame[] = [];
    
    for (let frame = 0; frame < framesCount; frame++) {
      const startSample = frame * samplesPerFrame;
      const endSample = Math.min(startSample + samplesPerFrame, channelData.length);
      
      // Analyze audio segment
      const audioData = this.analyzeAudioSegment(channelData, startSample, endSample, sampleRate);
      
      // Generate visualizer states for this frame
      const visualizers = this.generateVisualizerStates(audioData, frame / frameRate);
      
      frames.push({
        timestamp: frame / frameRate,
        visualizers,
        audioData,
        choreographySequence: this.selectSequence(audioData)
      });
    }
    
    return frames;
  }

  /**
   * Analyze audio segment for features
   */
  private analyzeAudioSegment(data: Float32Array, start: number, end: number, sampleRate: number) {
    const segment = data.slice(start, end);
    
    // Calculate RMS energy
    let rms = 0;
    for (let i = 0; i < segment.length; i++) {
      rms += segment[i] * segment[i];
    }
    rms = Math.sqrt(rms / segment.length);
    
    // Simple frequency analysis (bass, mid, high)
    const bass = this.calculateFrequencyBand(segment, 0, 0.1);
    const mid = this.calculateFrequencyBand(segment, 0.1, 0.4);
    const high = this.calculateFrequencyBand(segment, 0.4, 1.0);
    
    // Beat detection (simple energy-based)
    const energy = rms;
    const beat = energy > this.config.energyThreshold;
    
    return { bass, mid, high, energy, beat };
  }

  /**
   * Simple frequency band calculation
   */
  private calculateFrequencyBand(segment: Float32Array, lowRatio: number, highRatio: number): number {
    const startIndex = Math.floor(segment.length * lowRatio);
    const endIndex = Math.floor(segment.length * highRatio);
    
    let sum = 0;
    for (let i = startIndex; i < endIndex; i++) {
      sum += Math.abs(segment[i]);
    }
    
    return sum / (endIndex - startIndex);
  }

  /**
   * Generate visualizer states based on audio data
   */
  private generateVisualizerStates(audioData: any, timestamp: number): VisualizerState[] {
    const states: VisualizerState[] = [];
    
    this.visualizerStates.forEach((state, name) => {
      const newState = { ...state };
      
      // Apply audio-reactive parameters
      switch (name) {
        case 'quantum':
          newState.parameters = {
            ...newState.parameters,
            rotationSpeed: 0.5 + audioData.energy * 2,
            particleDensity: 0.6 + audioData.mid * 0.4,
            energyField: audioData.bass * 1.2,
            quantumFlux: audioData.high * 0.8,
            colorShift: [
              0.3 + audioData.bass * 0.7,
              0.5 + audioData.mid * 0.5,
              0.7 + audioData.high * 0.3
            ]
          };
          break;
          
        case 'faceted':
          newState.parameters = {
            ...newState.parameters,
            faceCount: Math.floor(12 + audioData.energy * 20),
            rotation: [
              timestamp * audioData.bass * 0.5,
              timestamp * audioData.mid * 0.3,
              timestamp * audioData.high * 0.2
            ],
            reflection: 0.4 + audioData.mid * 0.6,
            crystallinity: 0.6 + audioData.energy * 0.4
          };
          break;
          
        case 'holographic':
          newState.parameters = {
            ...newState.parameters,
            hologramDepth: 0.3 + audioData.bass * 0.7,
            interferencePattern: audioData.high * 0.8,
            coherence: 0.7 + audioData.energy * 0.3,
            laserIntensity: 0.8 + audioData.beat ? 0.2 : 0
          };
          break;
      }
      
      // Apply choreography sequences
      const activeSequence = this.findActiveSequence(timestamp, audioData);
      if (activeSequence) {
        newState.parameters = this.applySequenceParameters(
          newState.parameters, 
          activeSequence, 
          timestamp
        );
        newState.intensity = this.calculateSequenceIntensity(activeSequence, timestamp);
      }
      
      states.push(newState);
    });
    
    return states;
  }

  /**
   * Select appropriate choreography sequence
   */
  private selectSequence(audioData: any): string | undefined {
    if (audioData.energy > 0.8) return 'high-energy';
    if (audioData.bass > 0.6) return 'bass-heavy';
    if (audioData.beat) return 'beat-sync';
    return undefined;
  }

  /**
   * Find active sequence at timestamp
   */
  private findActiveSequence(timestamp: number, audioData: any): ChoreographySequence | null {
    // Simple sequence selection based on audio characteristics
    for (const sequence of this.config.sequences) {
      if (this.shouldTriggerSequence(sequence, timestamp, audioData)) {
        return sequence;
      }
    }
    return null;
  }

  /**
   * Check if sequence should be triggered
   */
  private shouldTriggerSequence(sequence: ChoreographySequence, timestamp: number, audioData: any): boolean {
    switch (sequence.trigger) {
      case 'beat':
        return audioData.beat;
      case 'energy':
        return audioData.energy > this.config.energyThreshold;
      case 'measure':
        // Trigger on measure boundaries (every 4 beats)
        const beatIndex = Math.floor(timestamp / (this.beatDuration / 1000));
        return beatIndex % 4 === 0 && audioData.beat;
      default:
        return false;
    }
  }

  /**
   * Apply sequence parameters to visualizer
   */
  private applySequenceParameters(
    baseParams: any, 
    sequence: ChoreographySequence, 
    timestamp: number
  ): any {
    const sequenceTime = (timestamp % sequence.duration) / sequence.duration;
    const params = { ...baseParams };
    
    // Apply keyframe interpolation
    Object.entries(sequence.parameters).forEach(([visualizerName, paramSet]) => {
      Object.entries(paramSet).forEach(([paramName, keyframeData]) => {
        const value = this.interpolateKeyframes(keyframeData.keyframes, sequenceTime);
        if (value !== undefined) {
          params[paramName] = value;
        }
      });
    });
    
    return params;
  }

  /**
   * Interpolate between keyframes
   */
  private interpolateKeyframes(keyframes: any[], time: number): any {
    if (keyframes.length === 0) return undefined;
    if (keyframes.length === 1) return keyframes[0].value;
    
    // Find surrounding keyframes
    let before = keyframes[0];
    let after = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        before = keyframes[i];
        after = keyframes[i + 1];
        break;
      }
    }
    
    // Linear interpolation
    const t = (time - before.time) / (after.time - before.time);
    
    if (Array.isArray(before.value)) {
      return before.value.map((val: number, idx: number) => 
        val + (after.value[idx] - val) * t
      );
    } else {
      return before.value + (after.value - before.value) * t;
    }
  }

  /**
   * Calculate sequence intensity
   */
  private calculateSequenceIntensity(sequence: ChoreographySequence, timestamp: number): number {
    const sequenceTime = (timestamp % sequence.duration) / sequence.duration;
    
    // Create intensity curve (build up to peak in middle, then decay)
    if (sequenceTime < 0.3) {
      return sequenceTime / 0.3; // Build up
    } else if (sequenceTime < 0.7) {
      return 1.0; // Peak
    } else {
      return (1.0 - sequenceTime) / 0.3; // Decay
    }
  }

  /**
   * Load default choreography sequences
   */
  loadDefaultSequences() {
    const defaultSequences: ChoreographySequence[] = [
      {
        name: 'high-energy',
        duration: 8, // beats
        trigger: 'energy',
        parameters: {
          quantum: {
            rotationSpeed: {
              keyframes: [
                { time: 0, value: 2.0 },
                { time: 0.5, value: 4.0 },
                { time: 1.0, value: 2.0 }
              ]
            },
            colorShift: {
              keyframes: [
                { time: 0, value: [1.0, 0.2, 0.8] },
                { time: 0.5, value: [0.8, 1.0, 0.2] },
                { time: 1.0, value: [0.2, 0.8, 1.0] }
              ]
            }
          }
        }
      },
      {
        name: 'bass-heavy',
        duration: 4,
        trigger: 'beat',
        parameters: {
          faceted: {
            faceCount: {
              keyframes: [
                { time: 0, value: 30 },
                { time: 0.25, value: 50 },
                { time: 0.5, value: 30 },
                { time: 0.75, value: 50 },
                { time: 1.0, value: 30 }
              ]
            },
            reflection: {
              keyframes: [
                { time: 0, value: 0.9 },
                { time: 0.5, value: 0.3 },
                { time: 1.0, value: 0.9 }
              ]
            }
          }
        }
      }
    ];
    
    defaultSequences.forEach(seq => {
      this.config.sequences.push(seq);
    });
    
    console.log('🎭 Loaded default choreography sequences');
  }

  /**
   * Export choreography data for frame generation
   */
  exportChoreographyData(frames: ChoreographyFrame[]): string {
    const exportData = {
      metadata: {
        version: '1.0',
        frameCount: frames.length,
        duration: frames[frames.length - 1]?.timestamp || 0,
        generated: new Date().toISOString()
      },
      config: this.config,
      frames: frames.map(frame => ({
        timestamp: frame.timestamp,
        visualizers: frame.visualizers,
        audioData: frame.audioData,
        sequence: frame.choreographySequence
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get current visualizer state for preview
   */
  getCurrentVisualizerState(visualizerName: string): VisualizerState | null {
    return this.visualizerStates.get(visualizerName) || null;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.running = false;
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.visualizerStates.clear();
    this.frameHistory = [];
    
    console.log('🧹 VIB34D Integration disposed');
  }
}

// Export utility functions
export function createDefaultVIB34DConfig(): VIB34DConfig {
  return {
    bpm: 120,
    visualizers: ['quantum', 'faceted', 'holographic'],
    sequences: [],
    enablePredictive: true,
    energyThreshold: 0.6
  };
}

export function mergeChoreographyWithFrames(
  generatedFrames: string[],
  choreographyFrames: ChoreographyFrame[]
): Array<{ frameUrl: string; choreography: ChoreographyFrame }> {
  const merged = [];
  const frameCount = Math.min(generatedFrames.length, choreographyFrames.length);
  
  for (let i = 0; i < frameCount; i++) {
    merged.push({
      frameUrl: generatedFrames[i],
      choreography: choreographyFrames[i]
    });
  }
  
  return merged;
}

// Export singleton instance
export const vib34dIntegration = new VIB34DIntegration();

export default VIB34DIntegration;