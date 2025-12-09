/**
 * Choreography Brain - Universal Pattern Engine for JusDNCE
 * Works with existing frame system, style presets, and credit tiers
 * Generates dynamic choreography based on content analysis + musical patterns
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { EnergyLevel, FrameType, SubjectCategory, StylePreset } from '../types';
import { HolographicParams } from '../components/Visualizer/HolographicVisualizer';

// CORE PATTERN TYPES
export interface ContentSignature {
  complexity: number;     // 0-1: Visual detail density
  contrast: number;       // 0-1: Light/dark variation  
  motion_implied: number; // 0-1: Implied movement in pose
  symmetry: number;       // 0-1: Pose symmetry
  focus_point: 'center' | 'left' | 'right' | 'top' | 'bottom';
  visual_weight: number;  // 0-1: How much visual attention the subject commands
}

export interface MusicalContext {
  energy_level: number;        // 0-1: Current musical energy
  energy_trend: 'rising' | 'falling' | 'stable' | 'chaotic';
  rhythmic_density: number;    // 0-1: Beats per measure complexity
  harmonic_tension: number;    // 0-1: Musical tension/release
  genre_markers: string[];     // ['electronic', 'aggressive', 'ambient', etc.]
  structure_phase: 'intro' | 'verse' | 'chorus' | 'bridge' | 'breakdown' | 'outro';
}

export interface ChoreographyPattern {
  id: string;
  name: string;
  
  // When this pattern applies
  triggers: {
    content_types: SubjectCategory[];
    energy_range: [number, number];     // [min, max] energy levels
    style_affinities: string[];         // Style IDs that work best
    musical_contexts: string[];         // Musical situations this fits
  };
  
  // How it modifies choreography
  camera_personality: CameraPersonality;
  lighting_personality: LightingPersonality;
  timing_modifiers: TimingProfile;
  
  // Adaptability
  frame_count_scaling: {
    turbo: number;      // 0-1: How much to use this pattern in turbo mode
    quality: number;    // 0-1: How much to use this pattern in quality mode  
    super: number;      // 0-1: How much to use this pattern in super mode
  };
}

export interface CameraPersonality {
  base_motion_style: 'smooth' | 'rhythmic' | 'dramatic' | 'chaotic';
  zoom_behavior: 'breathing' | 'pulse' | 'impact' | 'flow';
  pan_tendency: 'centered' | 'sweeping' | 'asymmetric' | 'following';
  shake_response: 'subtle' | 'rhythmic' | 'explosive' | 'none';
  
  // Dynamic parameters that scale with context
  intensity_multiplier: number;  // How much this personality amplifies effects
  energy_responsiveness: number; // How quickly it responds to energy changes
  duration_preference: 'short' | 'medium' | 'long'; // Preferred sequence length
}

export interface LightingPersonality {
  base_mood: 'cinematic' | 'party' | 'intimate' | 'epic' | 'ethereal';
  color_strategy: 'complement' | 'monochrome' | 'contrast' | 'style_driven';
  effect_density: 'minimal' | 'moderate' | 'rich' | 'overwhelming';
  timing_sync: 'beat' | 'energy' | 'camera' | 'content';
  
  // Style integration
  hologram_integration: boolean;  // Should it coordinate with background hologram?
  style_color_influence: number;  // 0-1: How much style preset colors affect lighting
}

export interface TimingProfile {
  beat_alignment: 'strict' | 'loose' | 'syncopated' | 'free';
  sequence_length_bias: number;    // -1 to 1: Shorter vs longer sequences
  overlap_tolerance: number;       // 0-1: How much effects can overlap
  energy_lag: number;             // 0-1: How much delay in responding to energy changes
}

// UNIVERSAL PATTERN LIBRARY
export class ChoreographyBrain {
  private patterns: Map<string, ChoreographyPattern>;
  private style_presets: StylePreset[];
  private current_context: {
    content?: ContentSignature;
    musical?: MusicalContext;
    style?: StylePreset;
    credit_tier?: 'turbo' | 'quality' | 'super';
    frame_availability?: {
      low: string[];
      mid: string[];  
      high: string[];
      closeup?: string[];
    };
  };

  constructor(style_presets: StylePreset[]) {
    this.patterns = new Map();
    this.style_presets = style_presets;
    this.current_context = {};
    this.initializeUniversalPatterns();
  }

  private initializeUniversalPatterns(): void {
    // FLOW PATTERN - Smooth, continuous motion
    this.addPattern({
      id: 'flow_harmony',
      name: 'Flowing Harmony',
      triggers: {
        content_types: ['CHARACTER', 'SYMBOL'],
        energy_range: [0, 0.6],
        style_affinities: ['vintage-film', 'natural', 'dreamy-oil', 'ethereal'],
        musical_contexts: ['ambient', 'emotional', 'building']
      },
      camera_personality: {
        base_motion_style: 'smooth',
        zoom_behavior: 'breathing', 
        pan_tendency: 'sweeping',
        shake_response: 'subtle',
        intensity_multiplier: 0.7,
        energy_responsiveness: 0.3,
        duration_preference: 'long'
      },
      lighting_personality: {
        base_mood: 'intimate',
        color_strategy: 'style_driven',
        effect_density: 'moderate',
        timing_sync: 'energy',
        hologram_integration: true,
        style_color_influence: 0.8
      },
      timing_modifiers: {
        beat_alignment: 'loose',
        sequence_length_bias: 0.3,
        overlap_tolerance: 0.7,
        energy_lag: 0.2
      },
      frame_count_scaling: { turbo: 0.9, quality: 1.0, super: 0.8 }
    });

    // PULSE PATTERN - Rhythmic, beat-driven
    this.addPattern({
      id: 'rhythmic_pulse',
      name: 'Rhythmic Pulse',
      triggers: {
        content_types: ['CHARACTER', 'TEXT'],
        energy_range: [0.3, 0.8],
        style_affinities: ['neon-cyber', 'retro-anime', 'acid-glitch'],
        musical_contexts: ['electronic', 'dance', 'rhythmic']
      },
      camera_personality: {
        base_motion_style: 'rhythmic',
        zoom_behavior: 'pulse',
        pan_tendency: 'asymmetric', 
        shake_response: 'rhythmic',
        intensity_multiplier: 1.0,
        energy_responsiveness: 0.8,
        duration_preference: 'medium'
      },
      lighting_personality: {
        base_mood: 'party',
        color_strategy: 'complement',
        effect_density: 'rich',
        timing_sync: 'beat',
        hologram_integration: true,
        style_color_influence: 0.6
      },
      timing_modifiers: {
        beat_alignment: 'strict',
        sequence_length_bias: -0.2,
        overlap_tolerance: 0.4,
        energy_lag: 0.0
      },
      frame_count_scaling: { turbo: 1.0, quality: 1.0, super: 1.0 }
    });

    // IMPACT PATTERN - Dramatic, explosive moments
    this.addPattern({
      id: 'dramatic_impact',
      name: 'Dramatic Impact',
      triggers: {
        content_types: ['CHARACTER', 'SYMBOL', 'TEXT'],
        energy_range: [0.7, 1.0],
        style_affinities: ['noir', 'cyber-samurai', 'street-graffiti'],
        musical_contexts: ['aggressive', 'climax', 'drop', 'explosive']
      },
      camera_personality: {
        base_motion_style: 'dramatic',
        zoom_behavior: 'impact',
        pan_tendency: 'asymmetric',
        shake_response: 'explosive', 
        intensity_multiplier: 1.4,
        energy_responsiveness: 1.0,
        duration_preference: 'short'
      },
      lighting_personality: {
        base_mood: 'epic',
        color_strategy: 'contrast',
        effect_density: 'overwhelming',
        timing_sync: 'beat',
        hologram_integration: false, // Lighting takes center stage
        style_color_influence: 0.4
      },
      timing_modifiers: {
        beat_alignment: 'strict',
        sequence_length_bias: -0.5,
        overlap_tolerance: 0.2,
        energy_lag: 0.0
      },
      frame_count_scaling: { turbo: 0.8, quality: 0.9, super: 1.0 }
    });

    // ETHEREAL PATTERN - Dreamy, otherworldly
    this.addPattern({
      id: 'ethereal_drift',
      name: 'Ethereal Drift',
      triggers: {
        content_types: ['CHARACTER', 'SYMBOL'],
        energy_range: [0, 0.5],
        style_affinities: ['dreamy-oil', 'vaporwave', 'ukiyo-e'],
        musical_contexts: ['ambient', 'ethereal', 'calm', 'mystical']
      },
      camera_personality: {
        base_motion_style: 'smooth',
        zoom_behavior: 'flow',
        pan_tendency: 'following',
        shake_response: 'none',
        intensity_multiplier: 0.5,
        energy_responsiveness: 0.2,
        duration_preference: 'long'
      },
      lighting_personality: {
        base_mood: 'ethereal',
        color_strategy: 'style_driven',
        effect_density: 'minimal',
        timing_sync: 'content',
        hologram_integration: true,
        style_color_influence: 1.0
      },
      timing_modifiers: {
        beat_alignment: 'free',
        sequence_length_bias: 0.5,
        overlap_tolerance: 0.9,
        energy_lag: 0.5
      },
      frame_count_scaling: { turbo: 0.6, quality: 0.8, super: 1.0 }
    });

    // CHAOS PATTERN - Unpredictable, glitchy
    this.addPattern({
      id: 'chaotic_glitch',
      name: 'Chaotic Glitch', 
      triggers: {
        content_types: ['TEXT', 'SYMBOL'],
        energy_range: [0.6, 1.0],
        style_affinities: ['acid-glitch', 'crt-terminal', '16bit-pixel'],
        musical_contexts: ['glitch', 'experimental', 'chaotic', 'breakdown']
      },
      camera_personality: {
        base_motion_style: 'chaotic',
        zoom_behavior: 'impact', 
        pan_tendency: 'asymmetric',
        shake_response: 'explosive',
        intensity_multiplier: 1.2,
        energy_responsiveness: 1.0,
        duration_preference: 'short'
      },
      lighting_personality: {
        base_mood: 'epic',
        color_strategy: 'contrast',
        effect_density: 'overwhelming',
        timing_sync: 'content',
        hologram_integration: false,
        style_color_influence: 0.3
      },
      timing_modifiers: {
        beat_alignment: 'syncopated',
        sequence_length_bias: -0.3,
        overlap_tolerance: 0.1,
        energy_lag: 0.0
      },
      frame_count_scaling: { turbo: 0.7, quality: 1.0, super: 1.0 }
    });
  }

  public addPattern(pattern: ChoreographyPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  // SMART PATTERN SELECTION
  public analyzeAndSelectPattern(
    content_signature: ContentSignature,
    musical_context: MusicalContext,
    style_preset: StylePreset,
    credit_tier: 'turbo' | 'quality' | 'super',
    subject_category: SubjectCategory
  ): ChoreographyPattern {
    
    this.current_context = {
      content: content_signature,
      musical: musical_context,
      style: style_preset,
      credit_tier
    };

    let best_pattern: ChoreographyPattern | null = null;
    let best_score = 0;

    for (const pattern of this.patterns.values()) {
      let score = 0;

      // Subject category match
      if (pattern.triggers.content_types.includes(subject_category)) {
        score += 30;
      }

      // Energy range match
      const [min_energy, max_energy] = pattern.triggers.energy_range;
      if (musical_context.energy_level >= min_energy && musical_context.energy_level <= max_energy) {
        score += 25;
        // Bonus for being in the sweet spot
        const range_center = (min_energy + max_energy) / 2;
        const distance_from_center = Math.abs(musical_context.energy_level - range_center);
        score += (1 - distance_from_center) * 10;
      }

      // Style affinity match
      if (pattern.triggers.style_affinities.includes(style_preset.id)) {
        score += 20;
      }

      // Musical context match
      const musical_keywords = musical_context.genre_markers.concat([musical_context.structure_phase]);
      const matches = pattern.triggers.musical_contexts.filter(ctx => 
        musical_keywords.some(keyword => keyword.includes(ctx) || ctx.includes(keyword))
      );
      score += matches.length * 8;

      // Credit tier effectiveness
      const tier_effectiveness = pattern.frame_count_scaling[credit_tier];
      score *= tier_effectiveness;

      // Content signature bonuses
      if (content_signature.complexity > 0.7 && pattern.lighting_personality.effect_density === 'rich') {
        score += 5;
      }
      if (content_signature.motion_implied > 0.6 && pattern.camera_personality.base_motion_style === 'dramatic') {
        score += 5;
      }

      if (score > best_score) {
        best_score = score;
        best_pattern = pattern;
      }
    }

    return best_pattern || this.patterns.get('rhythmic_pulse')!; // Fallback
  }

  // PATTERN ADAPTATION
  public adaptPatternToContext(pattern: ChoreographyPattern): AdaptedChoreography {
    const context = this.current_context;
    if (!context.content || !context.musical || !context.style) {
      throw new Error('Context not set');
    }

    // Scale pattern based on current context
    const adapted_camera = this.adaptCameraPersonality(pattern.camera_personality, context);
    const adapted_lighting = this.adaptLightingPersonality(pattern.lighting_personality, context);
    const adapted_timing = this.adaptTimingProfile(pattern.timing_modifiers, context);

    return {
      pattern_id: pattern.id,
      camera_config: adapted_camera,
      lighting_config: adapted_lighting,  
      timing_config: adapted_timing,
      hologram_sync: adapted_lighting.hologram_integration
    };
  }

  private adaptCameraPersonality(personality: CameraPersonality, context: any): AdaptedCameraConfig {
    const energy = context.musical.energy_level;
    const complexity = context.content.complexity;
    
    return {
      motion_intensity: personality.intensity_multiplier * (0.5 + energy * 0.5),
      zoom_range: this.calculateZoomRange(personality.zoom_behavior, energy),
      pan_amplitude: this.calculatePanAmplitude(personality.pan_tendency, energy, complexity),
      shake_intensity: this.calculateShakeIntensity(personality.shake_response, energy),
      sequence_duration: this.calculateDuration(personality.duration_preference, context.musical.rhythmic_density),
      easing_style: this.selectEasingForStyle(personality.base_motion_style)
    };
  }

  private adaptLightingPersonality(personality: LightingPersonality, context: any): AdaptedLightingConfig {
    const style_hue = context.style.hologramParams.hue || 200;
    const energy = context.musical.energy_level;
    
    return {
      base_color_palette: this.generateColorPalette(personality.color_strategy, style_hue),
      effect_intensity: energy * (personality.effect_density === 'overwhelming' ? 1.0 : 0.7),
      sync_mode: personality.timing_sync,
      hologram_integration: personality.hologram_integration,
      blend_modes: this.selectBlendModes(personality.base_mood),
      effect_count: this.calculateEffectCount(personality.effect_density, context.credit_tier)
    };
  }

  private adaptTimingProfile(timing: TimingProfile, context: any): AdaptedTimingConfig {
    return {
      beat_sync_strength: timing.beat_alignment === 'strict' ? 1.0 : 0.6,
      sequence_overlap: timing.overlap_tolerance,
      response_delay: timing.energy_lag * 1000, // Convert to milliseconds
      length_multiplier: 1.0 + timing.sequence_length_bias
    };
  }

  // UTILITY METHODS
  private calculateZoomRange(behavior: string, energy: number): [number, number] {
    const base_ranges = {
      'breathing': [0.95, 1.1],
      'pulse': [0.9, 1.2], 
      'impact': [0.8, 1.5],
      'flow': [0.98, 1.05]
    };
    const [min, max] = base_ranges[behavior] || base_ranges.pulse;
    const energy_scale = 0.5 + energy * 0.5;
    return [min * energy_scale, max * energy_scale];
  }

  private calculatePanAmplitude(tendency: string, energy: number, complexity: number): number {
    const base_amplitudes = {
      'centered': 10,
      'sweeping': 40,
      'asymmetric': 60,
      'following': 25
    };
    return (base_amplitudes[tendency] || 30) * (0.3 + energy * 0.7) * (0.5 + complexity * 0.5);
  }

  private calculateShakeIntensity(response: string, energy: number): number {
    const base_intensities = {
      'none': 0,
      'subtle': 2,
      'rhythmic': 8,
      'explosive': 20
    };
    return (base_intensities[response] || 5) * energy;
  }

  private calculateDuration(preference: string, rhythmic_density: number): number {
    const base_durations = {
      'short': 1,
      'medium': 2,
      'long': 4
    };
    const base = base_durations[preference] || 2;
    // Higher rhythmic density = shorter sequences
    return base * (1.5 - rhythmic_density * 0.5);
  }

  private selectEasingForStyle(style: string): string {
    const easing_map = {
      'smooth': 'ease-in-out',
      'rhythmic': 'ease-out',
      'dramatic': 'ease-in',
      'chaotic': 'linear'
    };
    return easing_map[style] || 'ease-in-out';
  }

  private generateColorPalette(strategy: string, style_hue: number): number[] {
    switch (strategy) {
      case 'complement':
        return [style_hue, (style_hue + 180) % 360];
      case 'monochrome':
        return [style_hue, style_hue, style_hue];
      case 'contrast':
        return [style_hue, (style_hue + 120) % 360, (style_hue + 240) % 360];
      case 'style_driven':
      default:
        return [style_hue, (style_hue + 30) % 360, (style_hue - 30 + 360) % 360];
    }
  }

  private selectBlendModes(mood: string): string[] {
    const mode_map = {
      'cinematic': ['overlay', 'multiply'],
      'party': ['screen', 'add'],
      'intimate': ['overlay', 'soft-light'],
      'epic': ['screen', 'add', 'overlay'],
      'ethereal': ['screen', 'overlay']
    };
    return mode_map[mood] || ['overlay'];
  }

  private calculateEffectCount(density: string, tier: string): number {
    const base_counts = {
      'minimal': 1,
      'moderate': 2, 
      'rich': 3,
      'overwhelming': 4
    };
    const tier_multipliers = {
      'turbo': 0.7,
      'quality': 1.0,
      'super': 1.3
    };
    return Math.round((base_counts[density] || 2) * (tier_multipliers[tier] || 1.0));
  }

  // CONTENT ANALYSIS (Works with existing frame system)
  public analyzeContentFromFrames(
    frames: {url: string, pose: string, energy: EnergyLevel, type?: FrameType}[],
    subject_category: SubjectCategory
  ): ContentSignature {
    // Analyze existing frame distribution for content signature
    const energy_distribution = {
      low: frames.filter(f => f.energy === 'low').length,
      mid: frames.filter(f => f.energy === 'mid').length,
      high: frames.filter(f => f.energy === 'high').length
    };
    
    const total_frames = frames.length;
    const has_closeups = frames.some(f => f.type === 'closeup');
    
    // Calculate signature from frame analysis
    const complexity = (energy_distribution.mid + energy_distribution.high * 2) / (total_frames * 2);
    const motion_implied = energy_distribution.high / total_frames;
    const contrast = has_closeups ? 0.8 : 0.5; // Closeups indicate high contrast
    
    // Subject-specific adjustments
    let symmetry = 0.5;
    let focus_point: 'center' | 'left' | 'right' | 'top' | 'bottom' = 'center';
    let visual_weight = 0.7;
    
    switch (subject_category) {
      case 'CHARACTER':
        symmetry = 0.6; // Characters usually somewhat symmetric
        visual_weight = 0.8;
        focus_point = 'center';
        break;
      case 'TEXT':
        symmetry = 0.9; // Text is usually symmetric
        visual_weight = 0.6;
        focus_point = 'center';
        break;
      case 'SYMBOL':
        symmetry = 0.8; // Symbols often symmetric
        visual_weight = 0.7;
        focus_point = 'center';
        break;
    }

    return {
      complexity,
      contrast,
      motion_implied,
      symmetry,
      focus_point,
      visual_weight
    };
  }
}

// OUTPUT INTERFACES
export interface AdaptedChoreography {
  pattern_id: string;
  camera_config: AdaptedCameraConfig;
  lighting_config: AdaptedLightingConfig;
  timing_config: AdaptedTimingConfig;
  hologram_sync: boolean;
}

export interface AdaptedCameraConfig {
  motion_intensity: number;
  zoom_range: [number, number];
  pan_amplitude: number;
  shake_intensity: number;
  sequence_duration: number;
  easing_style: string;
}

export interface AdaptedLightingConfig {
  base_color_palette: number[];
  effect_intensity: number;
  sync_mode: string;
  hologram_integration: boolean;
  blend_modes: string[];
  effect_count: number;
}

export interface AdaptedTimingConfig {
  beat_sync_strength: number;
  sequence_overlap: number;
  response_delay: number;
  length_multiplier: number;
}

// Export singleton instance
export const choreographyBrain = new ChoreographyBrain([]);