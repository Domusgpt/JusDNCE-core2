/**
 * Virtual Frame Animation System
 *
 * A comprehensive toolkit for generating smooth animations from
 * discrete sprite frames using geometric warping, depth simulation,
 * and perceptual blending techniques.
 *
 * Zero AI calls required — all effects computed on GPU/WASM.
 *
 * @see VIRTUAL_FRAME_SYSTEM.md for full documentation
 */

// WebGL Shader-based Stitcher
export {
  VirtualFrameStitcher,
  type StitchParams,
  type ZoomParams,
  type VirtualFrameStitcherConfig,
} from './VirtualFrameStitcher';

// TypeScript Utilities
export {
  // Types
  type Frame,
  type SpriteSheetConfig,
  type AnimationState,
  type InterpolationResult,
  type PhaseConfig,
  type CropRect,
  type ParallaxLayer,

  // Sprite Sheet Utilities
  parseSpriteSheet,
  createSpriteSheet,
  interleaveSheets,

  // Phase Synthesis
  calculatePhase,
  calculatePhase2D,
  easeInOutCubic,
  applyMotionEasing,

  // Zoom & Pan
  calculateCropRect,
  springZoom,

  // Parallax
  DEFAULT_PARALLAX_LAYERS,
  calculateParallaxOffset,

  // Mipmaps
  generateMipmaps,
  selectMipmapLevel,

  // Animation Controller
  VirtualFrameAnimator,

  // Post-processing
  gammaBlend,
  applyFilmGrain,
  applyVignette,
} from './virtual-frame-utils';

// React Components
export {
  VirtualFrameRenderer,
  VirtualFrameControls,
  type VirtualFrameRendererProps,
  type VirtualFrameRendererHandle,
  type VirtualFrameControlsProps,
} from './VirtualFrameRenderer';

// Re-export config from constants
export {
  VIRTUAL_FRAME_CONFIG,
  type VirtualFrameConfig,
  type VirtualFramePreset,
  getVirtualFramePreset,
} from '../../constants';
