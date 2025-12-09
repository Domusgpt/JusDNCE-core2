/**
 * Engagement Manager
 * Keep users engaged during frame generation with real-time status updates,
 * anticipation building, and preview enhancements
 * 
 * A Paul Phillips Manifestation  
 * "The Revolution Will Not be in a Structured Format"
 */

export enum GenerationPhase {
  IDLE = 'idle',
  ANALYZING_AUDIO = 'analyzing_audio',
  PLANNING_CHOREOGRAPHY = 'planning_choreography', 
  GENERATING_FRAMES = 'generating_frames',
  PROCESSING_CAMERA = 'processing_camera',
  APPLYING_LIGHTING = 'applying_lighting',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export enum AnticipationLevel {
  CALM = 'calm',
  BUILDING = 'building', 
  EXCITING = 'exciting',
  EPIC = 'epic'
}

export interface GenerationStatus {
  phase: GenerationPhase;
  progress: number;        // 0-1 overall progress
  currentFrame: number;
  totalFrames: number;
  
  // System-specific progress
  choreographyProgress: number;
  cameraSequenceProgress: number;
  lightingEffectProgress: number;
  
  // Timing estimates
  estimatedCompletion: number; // seconds remaining
  timeElapsed: number;
  
  // User engagement
  anticipationLevel: AnticipationLevel;
  currentMessage: string;
  upcomingEvents: UpcomingEvent[];
  
  // Performance metrics
  framesPerSecond: number;
  generationSpeed: number; // frames/minute
}

export interface UpcomingEvent {
  type: 'camera_sequence' | 'lighting_effect' | 'frame_generation' | 'beat_drop' | 'energy_peak';
  description: string;
  beatNumber: number;
  timeUntil: number; // seconds
  excitement: AnticipationLevel;
  icon: string;
}

export interface EngagementConfig {
  enableAnticipationMessages: boolean;
  enableProgressPredictions: boolean;
  enableBeatsNotifications: boolean;
  messageUpdateInterval: number; // milliseconds
  maxUpcomingEvents: number;
}

export class EngagementManager {
  private status: GenerationStatus;
  private config: EngagementConfig;
  private startTime: number;
  private frameGenerationTimes: number[]; // Track generation performance
  private beatPredictions: BeatPrediction[];
  private messageTemplates: MessageTemplates;
  private subscribers: ((status: GenerationStatus) => void)[];

  constructor(config: Partial<EngagementConfig> = {}) {
    this.config = {
      enableAnticipationMessages: true,
      enableProgressPredictions: true,
      enableBeatsNotifications: true,
      messageUpdateInterval: 500,
      maxUpcomingEvents: 5,
      ...config
    };

    this.status = this.createInitialStatus();
    this.frameGenerationTimes = [];
    this.beatPredictions = [];
    this.messageTemplates = new MessageTemplates();
    this.subscribers = [];
    this.startTime = 0;
  }

  private createInitialStatus(): GenerationStatus {
    return {
      phase: GenerationPhase.IDLE,
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      choreographyProgress: 0,
      cameraSequenceProgress: 0,
      lightingEffectProgress: 0,
      estimatedCompletion: 0,
      timeElapsed: 0,
      anticipationLevel: AnticipationLevel.CALM,
      currentMessage: "Ready to create your dance masterpiece! 🎭",
      upcomingEvents: [],
      framesPerSecond: 0,
      generationSpeed: 0
    };
  }

  public startGeneration(totalFrames: number, audioAnalysis?: any): void {
    this.startTime = performance.now();
    this.status.phase = GenerationPhase.ANALYZING_AUDIO;
    this.status.totalFrames = totalFrames;
    this.status.currentFrame = 0;
    this.status.progress = 0;
    this.status.anticipationLevel = AnticipationLevel.BUILDING;
    this.status.currentMessage = "🎵 Analyzing your music for the perfect choreography...";
    
    // Generate beat predictions if audio analysis provided
    if (audioAnalysis) {
      this.beatPredictions = this.generateBeatPredictions(audioAnalysis);
      this.updateUpcomingEvents();
    }

    this.notifySubscribers();
  }

  public updatePhase(phase: GenerationPhase, message?: string): void {
    this.status.phase = phase;
    this.updateTimeElapsed();
    
    if (message) {
      this.status.currentMessage = message;
    } else {
      this.status.currentMessage = this.messageTemplates.getPhaseMessage(phase, this.status.anticipationLevel);
    }

    // Update anticipation level based on phase
    switch (phase) {
      case GenerationPhase.PLANNING_CHOREOGRAPHY:
        this.status.anticipationLevel = AnticipationLevel.BUILDING;
        break;
      case GenerationPhase.GENERATING_FRAMES:
        this.status.anticipationLevel = AnticipationLevel.EXCITING;
        break;
      case GenerationPhase.PROCESSING_CAMERA:
        this.status.anticipationLevel = AnticipationLevel.EPIC;
        break;
      case GenerationPhase.APPLYING_LIGHTING:
        this.status.anticipationLevel = AnticipationLevel.EPIC;
        break;
      case GenerationPhase.COMPLETE:
        this.status.anticipationLevel = AnticipationLevel.CALM;
        break;
    }

    this.updateProgress();
    this.notifySubscribers();
  }

  public updateFrameProgress(currentFrame: number, generationTimeMs?: number): void {
    this.status.currentFrame = currentFrame;
    
    // Track generation performance
    if (generationTimeMs !== undefined) {
      this.frameGenerationTimes.push(generationTimeMs);
      if (this.frameGenerationTimes.length > 10) {
        this.frameGenerationTimes.shift(); // Keep last 10 for averaging
      }
      
      // Calculate frames per second and generation speed
      const avgGenerationTime = this.frameGenerationTimes.reduce((a, b) => a + b, 0) / this.frameGenerationTimes.length;
      this.status.framesPerSecond = 1000 / avgGenerationTime;
      this.status.generationSpeed = (60 * 1000) / avgGenerationTime; // frames per minute
    }
    
    this.updateProgress();
    this.updateTimeElapsed();
    this.updateEstimatedCompletion();
    
    // Generate dynamic messages based on progress
    if (this.config.enableAnticipationMessages) {
      this.updateProgressMessage();
    }
    
    this.notifySubscribers();
  }

  public updateSystemProgress(system: 'choreography' | 'camera' | 'lighting', progress: number): void {
    switch (system) {
      case 'choreography':
        this.status.choreographyProgress = progress;
        break;
      case 'camera':
        this.status.cameraSequenceProgress = progress;
        break;
      case 'lighting':
        this.status.lightingEffectProgress = progress;
        break;
    }
    
    this.updateProgress();
    this.notifySubscribers();
  }

  private updateProgress(): void {
    const phaseWeights = {
      [GenerationPhase.IDLE]: 0,
      [GenerationPhase.ANALYZING_AUDIO]: 0.05,
      [GenerationPhase.PLANNING_CHOREOGRAPHY]: 0.1, 
      [GenerationPhase.GENERATING_FRAMES]: 0.6,
      [GenerationPhase.PROCESSING_CAMERA]: 0.8,
      [GenerationPhase.APPLYING_LIGHTING]: 0.9,
      [GenerationPhase.FINALIZING]: 0.95,
      [GenerationPhase.COMPLETE]: 1.0,
      [GenerationPhase.ERROR]: 0
    };

    let baseProgress = phaseWeights[this.status.phase];
    
    // Add frame progress within generation phase
    if (this.status.phase === GenerationPhase.GENERATING_FRAMES && this.status.totalFrames > 0) {
      const frameProgress = this.status.currentFrame / this.status.totalFrames;
      baseProgress = 0.1 + (frameProgress * 0.5); // 10% to 60%
    }
    
    this.status.progress = Math.min(1, baseProgress);
  }

  private updateTimeElapsed(): void {
    if (this.startTime > 0) {
      this.status.timeElapsed = (performance.now() - this.startTime) / 1000;
    }
  }

  private updateEstimatedCompletion(): void {
    if (this.frameGenerationTimes.length > 2 && this.status.totalFrames > 0) {
      const avgTime = this.frameGenerationTimes.reduce((a, b) => a + b, 0) / this.frameGenerationTimes.length;
      const remainingFrames = this.status.totalFrames - this.status.currentFrame;
      this.status.estimatedCompletion = (remainingFrames * avgTime) / 1000;
    }
  }

  private updateProgressMessage(): void {
    const progress = this.status.progress;
    const frameProgress = this.status.currentFrame / this.status.totalFrames;
    
    if (this.status.phase === GenerationPhase.GENERATING_FRAMES) {
      if (frameProgress < 0.25) {
        this.status.currentMessage = this.messageTemplates.getProgressMessage('early', this.status.anticipationLevel);
      } else if (frameProgress < 0.5) {
        this.status.currentMessage = this.messageTemplates.getProgressMessage('mid', this.status.anticipationLevel);
      } else if (frameProgress < 0.75) {
        this.status.currentMessage = this.messageTemplates.getProgressMessage('late', this.status.anticipationLevel);
      } else {
        this.status.currentMessage = this.messageTemplates.getProgressMessage('final', this.status.anticipationLevel);
      }
    }
  }

  private generateBeatPredictions(audioAnalysis: any): BeatPrediction[] {
    // This would integrate with actual audio analysis
    // For now, generate sample predictions
    const predictions: BeatPrediction[] = [];
    
    // Sample beat prediction logic
    for (let i = 0; i < 64; i += 4) { // Every 4 beats
      if (i % 16 === 0) { // Major sections
        predictions.push({
          beatNumber: i,
          eventType: 'energy_peak',
          intensity: 0.8 + Math.random() * 0.2,
          description: 'Major energy peak incoming!'
        });
      } else if (i % 8 === 0) { // Minor sections
        predictions.push({
          beatNumber: i,
          eventType: 'beat_drop',
          intensity: 0.6 + Math.random() * 0.3,
          description: 'Beat drop sequence'
        });
      }
    }
    
    return predictions;
  }

  private updateUpcomingEvents(): void {
    if (!this.config.enableBeatsNotifications) return;
    
    const currentTime = this.status.timeElapsed;
    const events: UpcomingEvent[] = [];
    
    // Add beat predictions
    for (const prediction of this.beatPredictions) {
      const eventTime = (prediction.beatNumber * 0.5); // Assuming 120 BPM
      const timeUntil = eventTime - currentTime;
      
      if (timeUntil > 0 && timeUntil < 10 && events.length < this.config.maxUpcomingEvents) {
        events.push({
          type: prediction.eventType as any,
          description: prediction.description,
          beatNumber: prediction.beatNumber,
          timeUntil,
          excitement: this.getExcitementLevel(prediction.intensity),
          icon: this.getEventIcon(prediction.eventType)
        });
      }
    }
    
    // Sort by time until event
    events.sort((a, b) => a.timeUntil - b.timeUntil);
    
    this.status.upcomingEvents = events.slice(0, this.config.maxUpcomingEvents);
  }

  private getExcitementLevel(intensity: number): AnticipationLevel {
    if (intensity >= 0.8) return AnticipationLevel.EPIC;
    if (intensity >= 0.6) return AnticipationLevel.EXCITING;
    if (intensity >= 0.4) return AnticipationLevel.BUILDING;
    return AnticipationLevel.CALM;
  }

  private getEventIcon(eventType: string): string {
    switch (eventType) {
      case 'energy_peak': return '⚡';
      case 'beat_drop': return '💥';
      case 'camera_sequence': return '🎬';
      case 'lighting_effect': return '💡';
      default: return '🎵';
    }
  }

  public subscribe(callback: (status: GenerationStatus) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) this.subscribers.splice(index, 1);
    };
  }

  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      callback(this.status);
    }
  }

  public getStatus(): GenerationStatus {
    return { ...this.status };
  }

  public reset(): void {
    this.status = this.createInitialStatus();
    this.frameGenerationTimes = [];
    this.beatPredictions = [];
    this.startTime = 0;
    this.notifySubscribers();
  }

  public setError(errorMessage: string): void {
    this.status.phase = GenerationPhase.ERROR;
    this.status.currentMessage = `❌ ${errorMessage}`;
    this.status.anticipationLevel = AnticipationLevel.CALM;
    this.notifySubscribers();
  }
}

// Message templates for dynamic engagement
class MessageTemplates {
  private phaseMessages = {
    [GenerationPhase.ANALYZING_AUDIO]: {
      [AnticipationLevel.CALM]: "🎵 Analyzing your music...",
      [AnticipationLevel.BUILDING]: "🎵 Discovering the rhythm in your track...",
      [AnticipationLevel.EXCITING]: "🎵 Finding the perfect beats for your dance!",
      [AnticipationLevel.EPIC]: "🎵 Unlocking the musical magic!"
    },
    [GenerationPhase.PLANNING_CHOREOGRAPHY]: {
      [AnticipationLevel.CALM]: "🎭 Planning your choreography...",
      [AnticipationLevel.BUILDING]: "🎭 Crafting the perfect dance sequence...",
      [AnticipationLevel.EXCITING]: "🎭 Designing epic dance moves!",
      [AnticipationLevel.EPIC]: "🎭 Creating choreography magic!"
    },
    [GenerationPhase.GENERATING_FRAMES]: {
      [AnticipationLevel.CALM]: "🎨 Generating your dance frames...",
      [AnticipationLevel.BUILDING]: "🎨 Bringing your dancer to life...", 
      [AnticipationLevel.EXCITING]: "🎨 Creating stunning dance poses!",
      [AnticipationLevel.EPIC]: "🎨 Manifesting pure dance energy!"
    },
    [GenerationPhase.PROCESSING_CAMERA]: {
      [AnticipationLevel.CALM]: "🎬 Adding camera effects...",
      [AnticipationLevel.BUILDING]: "🎬 Creating cinematic magic...",
      [AnticipationLevel.EXCITING]: "🎬 Perfecting dynamic camera work!",
      [AnticipationLevel.EPIC]: "🎬 Unleashing Hollywood-level cinematography!"
    },
    [GenerationPhase.APPLYING_LIGHTING]: {
      [AnticipationLevel.CALM]: "💡 Applying lighting effects...",
      [AnticipationLevel.BUILDING]: "💡 Setting the perfect mood...",
      [AnticipationLevel.EXCITING]: "💡 Adding spectacular lighting!",
      [AnticipationLevel.EPIC]: "💡 Creating a visual masterpiece!"
    },
    [GenerationPhase.COMPLETE]: {
      [AnticipationLevel.CALM]: "✅ Your dance is ready!",
      [AnticipationLevel.BUILDING]: "✅ Dance masterpiece complete!",
      [AnticipationLevel.EXCITING]: "✅ Your epic dance is ready to rock!",
      [AnticipationLevel.EPIC]: "✅ LEGENDARY dance sequence complete!"
    }
  };

  private progressMessages = {
    early: {
      [AnticipationLevel.CALM]: "🎨 Getting started...",
      [AnticipationLevel.BUILDING]: "🎨 The magic is beginning...",
      [AnticipationLevel.EXCITING]: "🎨 Epic moves incoming!",
      [AnticipationLevel.EPIC]: "🎨 Prepare for greatness!"
    },
    mid: {
      [AnticipationLevel.CALM]: "🎨 Making good progress...",
      [AnticipationLevel.BUILDING]: "🎨 The energy is building...",
      [AnticipationLevel.EXCITING]: "🎨 Amazing sequences forming!",
      [AnticipationLevel.EPIC]: "🎨 Mind-blowing choreography emerging!"
    },
    late: {
      [AnticipationLevel.CALM]: "🎨 Almost there...",
      [AnticipationLevel.BUILDING]: "🎨 The climax approaches...",
      [AnticipationLevel.EXCITING]: "🎨 The best moves are coming!",
      [AnticipationLevel.EPIC]: "🎨 LEGENDARY finale incoming!"
    },
    final: {
      [AnticipationLevel.CALM]: "🎨 Finishing touches...",
      [AnticipationLevel.BUILDING]: "🎨 Perfecting the masterpiece...",
      [AnticipationLevel.EXCITING]: "🎨 Adding the final magic!",
      [AnticipationLevel.EPIC]: "🎨 ULTIMATE perfection achieved!"
    }
  };

  public getPhaseMessage(phase: GenerationPhase, anticipation: AnticipationLevel): string {
    return this.phaseMessages[phase]?.[anticipation] || "🎭 Creating something amazing...";
  }

  public getProgressMessage(stage: 'early' | 'mid' | 'late' | 'final', anticipation: AnticipationLevel): string {
    return this.progressMessages[stage]?.[anticipation] || "🎨 Working on your masterpiece...";
  }
}

interface BeatPrediction {
  beatNumber: number;
  eventType: 'energy_peak' | 'beat_drop' | 'camera_sequence' | 'lighting_effect';
  intensity: number;
  description: string;
}

// Export singleton instance
export const engagementManager = new EngagementManager();