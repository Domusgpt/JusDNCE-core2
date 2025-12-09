/**
 * Predictive Choreography Engine
 * Enhanced beat detection with energy prediction and proactive planning
 * Coordinates camera motions and lighting effects ahead of musical events
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { CameraMotionType, EnergyMode, cameraSequenceManager } from './CameraSequenceManager';
import { LightingEffectType, lightingDirector } from './LightingDirector';
import { engagementManager } from './EngagementManager';

export enum EnergyTrend {
  BUILDING = 'building',
  SUSTAINING = 'sustaining', 
  DROPPING = 'dropping',
  STABLE = 'stable'
}

export interface EnergyAnalysis {
  currentEnergy: number;      // 0-1 current energy level
  energyTrend: EnergyTrend;   // Direction of energy change
  trendStrength: number;      // How strong the trend is (0-1)
  nextPredictedPeak: number;  // Beats until next predicted peak
  peakIntensity: number;      // Predicted intensity of next peak
  confidenceLevel: number;    // Confidence in predictions (0-1)
}

export interface BeatPrediction {
  beatNumber: number;
  timestamp: number;         // Predicted time in seconds
  energy: number;            // Predicted energy level
  type: 'kick' | 'snare' | 'peak' | 'drop' | 'transition';
  confidence: number;
  plannedEvents: PlannedEvent[];
}

export interface PlannedEvent {
  type: 'camera' | 'lighting' | 'frame_change' | 'effect';
  action: string;
  triggerBeat: number;
  duration: number;          // In beats
  priority: number;
}

export interface ChoreographyPlan {
  currentBeat: number;
  lookaheadBeats: number;
  predictedBeats: BeatPrediction[];
  energyAnalysis: EnergyAnalysis;
  activeEvents: PlannedEvent[];
  queuedEvents: PlannedEvent[];
}

export class PredictiveChoreographyEngine {
  private plan: ChoreographyPlan;
  private audioHistory: AudioFrame[];
  private energyHistory: number[];
  private beatHistory: BeatEvent[];
  private bpm: number;
  private beatInterval: number; // ms between beats
  private lastBeatTime: number;
  private analysisWindowSize: number; // frames to analyze
  private predictionHorizon: number; // beats to look ahead

  constructor() {
    this.plan = {
      currentBeat: 0,
      lookaheadBeats: 16, // 8 bars ahead at 4/4 time
      predictedBeats: [],
      energyAnalysis: {
        currentEnergy: 0,
        energyTrend: EnergyTrend.STABLE,
        trendStrength: 0,
        nextPredictedPeak: 0,
        peakIntensity: 0,
        confidenceLevel: 0
      },
      activeEvents: [],
      queuedEvents: []
    };

    this.audioHistory = [];
    this.energyHistory = [];
    this.beatHistory = [];
    this.bpm = 120;
    this.beatInterval = (60 / this.bpm) * 1000;
    this.lastBeatTime = 0;
    this.analysisWindowSize = 120; // 2 seconds at 60fps
    this.predictionHorizon = 16;

    console.log('🧠 Predictive Choreography Engine initialized');
  }

  public updateBPM(bpm: number): void {
    this.bpm = bpm;
    this.beatInterval = (60 / bpm) * 1000;
    cameraSequenceManager.updateBeatTiming(this.plan.currentBeat, bpm);
    lightingDirector.updateBeatTiming(this.plan.currentBeat, bpm);
  }

  public processAudioFrame(audioData: {
    bass: number;
    mid: number; 
    high: number;
    timestamp: number;
  }): void {
    // Store audio frame for analysis
    const frame: AudioFrame = {
      ...audioData,
      energy: (audioData.bass + audioData.mid + audioData.high) / 3,
      timestamp: performance.now()
    };

    this.audioHistory.push(frame);
    this.energyHistory.push(frame.energy);

    // Maintain history size
    if (this.audioHistory.length > this.analysisWindowSize) {
      this.audioHistory.shift();
      this.energyHistory.shift();
    }

    // Update current energy analysis
    this.updateEnergyAnalysis();

    // Detect beats and update predictions
    const beatDetected = this.detectBeat(audioData);
    if (beatDetected) {
      this.onBeatDetected(audioData);
    }

    // Execute planned events
    this.executeScheduledEvents();
  }

  private updateEnergyAnalysis(): void {
    if (this.energyHistory.length < 10) return;

    const recent = this.energyHistory.slice(-10);
    const older = this.energyHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    this.plan.energyAnalysis.currentEnergy = recentAvg;
    
    // Calculate trend
    const energyChange = recentAvg - olderAvg;
    const trendThreshold = 0.05;
    
    if (energyChange > trendThreshold) {
      this.plan.energyAnalysis.energyTrend = EnergyTrend.BUILDING;
      this.plan.energyAnalysis.trendStrength = Math.min(1, energyChange / 0.2);
    } else if (energyChange < -trendThreshold) {
      this.plan.energyAnalysis.energyTrend = EnergyTrend.DROPPING;
      this.plan.energyAnalysis.trendStrength = Math.min(1, Math.abs(energyChange) / 0.2);
    } else if (recentAvg > 0.7) {
      this.plan.energyAnalysis.energyTrend = EnergyTrend.SUSTAINING;
      this.plan.energyAnalysis.trendStrength = recentAvg;
    } else {
      this.plan.energyAnalysis.energyTrend = EnergyTrend.STABLE;
      this.plan.energyAnalysis.trendStrength = 1 - Math.abs(energyChange);
    }

    // Predict next peak
    this.predictNextEnergyPeak();
  }

  private predictNextEnergyPeak(): void {
    const analysis = this.plan.energyAnalysis;
    
    if (analysis.energyTrend === EnergyTrend.BUILDING) {
      // If building, predict peak in 4-8 beats based on trend strength
      const beatsUntilPeak = 4 + (1 - analysis.trendStrength) * 4;
      analysis.nextPredictedPeak = beatsUntilPeak;
      analysis.peakIntensity = Math.min(1, analysis.currentEnergy + analysis.trendStrength * 0.3);
      analysis.confidenceLevel = analysis.trendStrength * 0.8;
    } else if (analysis.energyTrend === EnergyTrend.SUSTAINING) {
      // If sustaining, might drop soon or continue
      analysis.nextPredictedPeak = 2;
      analysis.peakIntensity = analysis.currentEnergy;
      analysis.confidenceLevel = 0.6;
    } else {
      // If dropping or stable, predict next buildup
      analysis.nextPredictedPeak = 8;
      analysis.peakIntensity = 0.7;
      analysis.confidenceLevel = 0.4;
    }

    // Plan events for predicted peak
    this.planEventsForPredictedPeak();
  }

  private planEventsForPredictedPeak(): void {
    const analysis = this.plan.energyAnalysis;
    const peakBeat = this.plan.currentBeat + analysis.nextPredictedPeak;
    
    // Don't plan if confidence is too low or peak is too far
    if (analysis.confidenceLevel < 0.5 || analysis.nextPredictedPeak > 12) return;

    // Plan camera sequence leading to peak
    if (analysis.peakIntensity > 0.7) {
      this.queueEvent({
        type: 'camera',
        action: 'build_zoom_intensify',
        triggerBeat: peakBeat - 4, // Start building 4 beats before
        duration: 4,
        priority: 8
      });
      
      this.queueEvent({
        type: 'camera', 
        action: 'impact_zoom_punch',
        triggerBeat: peakBeat,
        duration: 1,
        priority: 10
      });
    }

    // Plan lighting effects
    if (analysis.peakIntensity > 0.6) {
      this.queueEvent({
        type: 'lighting',
        action: 'impact_strobe',
        triggerBeat: peakBeat,
        duration: 1,
        priority: 12
      });
    }

    // Update engagement manager with anticipation
    engagementManager.updateSystemProgress('choreography', analysis.confidenceLevel);
  }

  private detectBeat(audioData: any): boolean {
    const now = performance.now();
    
    // Simple beat detection based on energy and timing
    const energyThreshold = 0.6;
    const timeSinceLastBeat = now - this.lastBeatTime;
    const minBeatInterval = this.beatInterval * 0.7; // Allow some variance
    const maxBeatInterval = this.beatInterval * 1.3;

    if (audioData.bass > energyThreshold && 
        timeSinceLastBeat > minBeatInterval &&
        timeSinceLastBeat < maxBeatInterval * 2) {
      return true;
    }

    // Also detect on expected timing even with lower energy
    if (timeSinceLastBeat > this.beatInterval * 0.9 &&
        timeSinceLastBeat < this.beatInterval * 1.1 &&
        audioData.bass > 0.4) {
      return true;
    }

    return false;
  }

  private onBeatDetected(audioData: any): void {
    const now = performance.now();
    this.lastBeatTime = now;
    this.plan.currentBeat++;

    // Record beat event
    this.beatHistory.push({
      beatNumber: this.plan.currentBeat,
      timestamp: now,
      energy: this.plan.energyAnalysis.currentEnergy,
      type: audioData.bass > 0.7 ? 'kick' : audioData.mid > 0.7 ? 'snare' : 'normal'
    });

    // Maintain beat history
    if (this.beatHistory.length > 64) {
      this.beatHistory.shift();
    }

    console.log(`🥁 Beat ${this.plan.currentBeat} detected (${this.plan.energyAnalysis.energyTrend})`);

    // Trigger immediate choreography
    this.triggerImmediateChoreography(audioData);

    // Update long-term predictions
    this.updateBeatPredictions();
  }

  private triggerImmediateChoreography(audioData: any): void {
    const analysis = this.plan.energyAnalysis;
    
    // Determine energy mode for camera sequences
    let energyMode: EnergyMode;
    if (analysis.currentEnergy < 0.4) {
      energyMode = EnergyMode.REST;
    } else if (analysis.currentEnergy < 0.7) {
      energyMode = EnergyMode.BUILD;
    } else {
      energyMode = EnergyMode.IMPACT;
    }

    // Try to trigger camera sequence
    const cameraTriggered = cameraSequenceManager.tryTriggerSequence({
      energy: analysis.currentEnergy,
      onBeat: true,
      onSnare: audioData.mid > 0.7,
      onStutter: false
    });

    // Try to trigger lighting effects
    const lightingTriggered = lightingDirector.analyzeAndTrigger({
      energy: analysis.currentEnergy,
      onBeat: true,
      onSnare: audioData.mid > 0.7,
      beatPattern: this.getCurrentBeatPattern()
    });

    if (cameraTriggered || lightingTriggered) {
      console.log(`🎬 Triggered choreography: camera=${cameraTriggered}, lighting=${lightingTriggered}`);
    }
  }

  private getCurrentBeatPattern(): string {
    const beatInMeasure = this.plan.currentBeat % 4;
    return ['A', 'B', 'A', 'C'][beatInMeasure] || 'A';
  }

  private updateBeatPredictions(): void {
    // Generate predictions for the next 16 beats
    this.plan.predictedBeats = [];
    
    for (let i = 1; i <= this.predictionHorizon; i++) {
      const futureBeat = this.plan.currentBeat + i;
      const futureTimestamp = this.lastBeatTime + (i * this.beatInterval);
      
      // Predict energy based on current trend
      let predictedEnergy = this.plan.energyAnalysis.currentEnergy;
      const trend = this.plan.energyAnalysis.energyTrend;
      const strength = this.plan.energyAnalysis.trendStrength;
      
      switch (trend) {
        case EnergyTrend.BUILDING:
          predictedEnergy = Math.min(1, predictedEnergy + (strength * 0.1 * i));
          break;
        case EnergyTrend.DROPPING:
          predictedEnergy = Math.max(0, predictedEnergy - (strength * 0.05 * i));
          break;
        case EnergyTrend.SUSTAINING:
          predictedEnergy = predictedEnergy * (0.95 + strength * 0.05);
          break;
      }

      // Determine beat type based on position and energy
      let beatType: 'kick' | 'snare' | 'peak' | 'drop' | 'transition' = 'kick';
      if (i === this.plan.energyAnalysis.nextPredictedPeak) {
        beatType = 'peak';
      } else if (futureBeat % 4 === 2) {
        beatType = 'snare';
      } else if (predictedEnergy < 0.3) {
        beatType = 'drop';
      } else if (Math.abs(predictedEnergy - this.plan.energyAnalysis.currentEnergy) > 0.2) {
        beatType = 'transition';
      }

      this.plan.predictedBeats.push({
        beatNumber: futureBeat,
        timestamp: futureTimestamp,
        energy: predictedEnergy,
        type: beatType,
        confidence: Math.max(0.3, this.plan.energyAnalysis.confidenceLevel - (i * 0.05)),
        plannedEvents: []
      });
    }
  }

  private queueEvent(event: PlannedEvent): void {
    // Check if event already exists
    const exists = this.plan.queuedEvents.some(e => 
      e.type === event.type && 
      e.action === event.action && 
      Math.abs(e.triggerBeat - event.triggerBeat) < 2
    );

    if (!exists) {
      this.plan.queuedEvents.push(event);
      console.log(`📅 Queued ${event.type} event: ${event.action} at beat ${event.triggerBeat}`);
    }
  }

  private executeScheduledEvents(): void {
    const currentTime = performance.now();
    const currentBeat = this.plan.currentBeat;
    
    // Move events from queued to active when their time comes
    this.plan.queuedEvents = this.plan.queuedEvents.filter(event => {
      const beatsUntilTrigger = event.triggerBeat - currentBeat;
      
      if (beatsUntilTrigger <= 0.5 && beatsUntilTrigger >= -0.5) {
        // Time to execute this event
        this.executeEvent(event);
        this.plan.activeEvents.push(event);
        return false; // Remove from queued
      }
      
      return beatsUntilTrigger > -1; // Keep if not too far in past
    });

    // Clean up completed active events
    this.plan.activeEvents = this.plan.activeEvents.filter(event => {
      const beatsActive = currentBeat - event.triggerBeat;
      return beatsActive < event.duration;
    });
  }

  private executeEvent(event: PlannedEvent): void {
    console.log(`🎭 Executing planned ${event.type} event: ${event.action}`);
    
    switch (event.type) {
      case 'camera':
        // Trigger specific camera sequence
        cameraSequenceManager.tryTriggerSequence({
          energy: this.plan.energyAnalysis.currentEnergy,
          onBeat: true
        });
        break;
        
      case 'lighting':
        // Trigger specific lighting effect
        lightingDirector.analyzeAndTrigger({
          energy: this.plan.energyAnalysis.currentEnergy,
          onBeat: true
        });
        break;
    }
  }

  public getCurrentPlan(): ChoreographyPlan {
    return { ...this.plan };
  }

  public getEnergyAnalysis(): EnergyAnalysis {
    return { ...this.plan.energyAnalysis };
  }

  public reset(): void {
    this.plan.currentBeat = 0;
    this.plan.predictedBeats = [];
    this.plan.activeEvents = [];
    this.plan.queuedEvents = [];
    this.audioHistory = [];
    this.energyHistory = [];
    this.beatHistory = [];
    this.lastBeatTime = 0;
  }
}

interface AudioFrame {
  bass: number;
  mid: number;
  high: number;
  energy: number;
  timestamp: number;
}

interface BeatEvent {
  beatNumber: number;
  timestamp: number;
  energy: number;
  type: 'kick' | 'snare' | 'normal';
}

// Export singleton instance
export const predictiveChoreographyEngine = new PredictiveChoreographyEngine();