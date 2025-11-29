/**
 * VirtualFrameRenderer.tsx
 *
 * React component that integrates the Virtual Frame system.
 * Handles frame loading, animation control, and rendering.
 *
 * Usage:
 * <VirtualFrameRenderer
 *   frames={generatedFrames}
 *   config={VIRTUAL_FRAME_CONFIG}
 *   onReady={() => console.log('Ready!')}
 * />
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

import {
  VirtualFrameStitcher,
  StitchParams,
  ZoomParams,
} from './VirtualFrameStitcher';

import {
  Frame,
  VirtualFrameAnimator,
  calculateCropRect,
  generateMipmaps,
  CropRect,
} from './virtual-frame-utils';

import { VIRTUAL_FRAME_CONFIG, VirtualFrameConfig } from '../../constants';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualFrameRendererProps {
  frames: Frame[];
  width?: number;
  height?: number;
  config?: VirtualFrameConfig;
  audioEnabled?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface VirtualFrameRendererHandle {
  // Control methods
  setAngle: (angle: number, immediate?: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setPitch: (pitch: number) => void;

  // Audio reactivity
  setAudioLevels: (bass: number, mid: number, high: number) => void;

  // State getters
  getCurrentAngle: () => number;
  getState: () => AnimationStateSnapshot;

  // Playback
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;

  // Export
  getCanvas: () => HTMLCanvasElement | null;
  captureFrame: () => string | null;
}

interface AnimationStateSnapshot {
  angle: number;
  zoom: number;
  pan: { x: number; y: number };
  pitch: number;
  frameA: number;
  frameB: number;
  blendT: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VirtualFrameRenderer = forwardRef<
  VirtualFrameRendererHandle,
  VirtualFrameRendererProps
>((props, ref) => {
  const {
    frames,
    width = 584,
    height = 584,
    config = VIRTUAL_FRAME_CONFIG,
    audioEnabled = false,
    onReady,
    onError,
    className,
    style,
  } = props;

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stitcherRef = useRef<VirtualFrameStitcher | null>(null);
  const animatorRef = useRef<VirtualFrameAnimator | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // State
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Audio levels (for reactive effects)
  const audioLevelsRef = useRef({ bass: 0, mid: 0, high: 0 });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;

    const initializeRenderer = async () => {
      try {
        // Create stitcher
        stitcherRef.current = new VirtualFrameStitcher({
          canvas: canvasRef.current!,
          width,
          height,
        });

        // Create animator
        animatorRef.current = new VirtualFrameAnimator(frames, {
          framesPerRevolution: frames.length,
          warpMultiplier: config.phaseSynthesis.warpMultiplier,
          seamFeatherPx: config.phaseSynthesis.featherPx,
          motionShear: config.phaseSynthesis.motionShear,
        });

        // Load all frame textures
        await loadFrameTextures();

        setIsReady(true);
        onReady?.();
      } catch (error) {
        console.error('VirtualFrameRenderer init error:', error);
        onError?.(error as Error);
      }
    };

    initializeRenderer();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      stitcherRef.current?.dispose();
    };
  }, [frames, width, height, config, onReady, onError]);

  // ============================================================================
  // FRAME LOADING
  // ============================================================================

  const loadFrameTextures = async () => {
    if (!stitcherRef.current) return;

    const loadPromises = frames.map((frame, index) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            stitcherRef.current!.loadFrame(frame.id, img);

            // Generate SDF for parallax if enabled
            if (config.parallax.enabled) {
              stitcherRef.current!.generateSDF(frame.id);
            }

            setLoadedCount((prev) => prev + 1);
            resolve();
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error(`Failed to load frame: ${frame.url}`));
        };

        img.src = frame.url;
      });
    });

    await Promise.all(loadPromises);
  };

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  const animate = useCallback(
    (timestamp: number) => {
      if (!stitcherRef.current || !animatorRef.current || !isPlaying) return;

      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Update animator
      const interpolation = animatorRef.current.update(dt);

      // Get audio levels for reactive effects
      const { bass, mid, high } = audioLevelsRef.current;

      // Build stitch params
      const params = buildStitchParams(interpolation, { bass, mid, high });

      // Render
      stitcherRef.current.stitch(
        interpolation.frameA.id,
        interpolation.frameB.id,
        params
      );

      // Apply zoom if needed
      const state = animatorRef.current.getState();
      if (state.zoom > 1 || state.pan.x !== 0 || state.pan.y !== 0) {
        // Note: Zoom is applied as post-process, would need second pass
        // For now, zoom is handled in stitch params indirectly
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [isPlaying, config]
  );

  // Start/stop animation loop
  useEffect(() => {
    if (isPlaying && isReady) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, isReady, animate]);

  // ============================================================================
  // PARAM BUILDERS
  // ============================================================================

  const buildStitchParams = (
    interpolation: ReturnType<VirtualFrameAnimator['update']>,
    audioLevels: { bass: number; mid: number; high: number }
  ): StitchParams => {
    const { t, seamAngle, motionDir } = interpolation;
    const { bass, mid, high } = audioLevels;

    // Base config values
    const base = VirtualFrameStitcher.getDefaultParams();

    // Apply config overrides
    const featherWidth = config.phaseSynthesis.featherPx / width;
    const motionShear = config.phaseSynthesis.motionShear + high * 0.06;
    const grainIntensity = config.sweeteners.grain.enabled
      ? config.sweeteners.grain.intensity + bass * 0.03
      : 0;

    // Calculate parallax offset from motion
    const state = animatorRef.current?.getState();
    const parallaxOffset = state
      ? (state.currentAngle - (state.targetAngle || 0)) *
        config.parallax.pxPerDegree *
        config.parallax.intensity
      : 0;

    return {
      ...base,
      blendT: t,
      featherWidth,
      warpStrength: Math.min(t * config.phaseSynthesis.warpMultiplier, 1),
      motionShear,
      seamAngle,

      parallaxEnabled: config.parallax.enabled,
      parallaxOffset,

      grainIntensity,
      vignetteStrength: config.sweeteners.vignette.enabled
        ? config.sweeteners.vignette.intensity
        : 0,
      ditherAmount: config.microDither.enabled
        ? config.microDither.amount
        : 0,

      motionBlurEnabled: config.motionBlur.enabled,
      motionBlurMix: config.motionBlur.mixFactor,

      shadowEnabled: config.shadow.enabled,
      shadowIntensity: config.shadow.opacity,
      shadowOffset: [
        motionDir * config.shadow.yawShiftPx / width,
        -config.shadow.verticalCompression,
      ],
    };
  };

  // ============================================================================
  // IMPERATIVE HANDLE
  // ============================================================================

  useImperativeHandle(ref, () => ({
    setAngle: (angle: number, immediate = false) => {
      animatorRef.current?.setTarget(angle, immediate);
    },

    setZoom: (zoom: number) => {
      animatorRef.current?.setZoom(zoom);
    },

    setPan: (x: number, y: number) => {
      animatorRef.current?.setPan(x, y);
    },

    setPitch: (pitch: number) => {
      animatorRef.current?.setPitch(pitch);
    },

    setAudioLevels: (bass: number, mid: number, high: number) => {
      audioLevelsRef.current = { bass, mid, high };
    },

    getCurrentAngle: () => {
      return animatorRef.current?.getState().currentAngle ?? 0;
    },

    getState: (): AnimationStateSnapshot => {
      const state = animatorRef.current?.getState();
      const interpolation = animatorRef.current?.update(0);

      return {
        angle: state?.currentAngle ?? 0,
        zoom: state?.zoom ?? 1,
        pan: state?.pan ?? { x: 0, y: 0 },
        pitch: state?.pitch ?? 0,
        frameA: interpolation?.frameA.index ?? 0,
        frameB: interpolation?.frameB.index ?? 0,
        blendT: interpolation?.t ?? 0,
      };
    },

    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    isPlaying: () => isPlaying,

    getCanvas: () => canvasRef.current,

    captureFrame: () => {
      return canvasRef.current?.toDataURL('image/png') ?? null;
    },
  }));

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Loading overlay */}
      {!isReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            fontFamily: 'Rajdhani, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Loading Frames
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
              {loadedCount} / {frames.length}
            </div>
            <div
              style={{
                width: '200px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                marginTop: '0.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(loadedCount / Math.max(frames.length, 1)) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VirtualFrameRenderer.displayName = 'VirtualFrameRenderer';

// ============================================================================
// CONTROLS COMPONENT
// ============================================================================

export interface VirtualFrameControlsProps {
  config: VirtualFrameConfig;
  onChange: (config: VirtualFrameConfig) => void;
  onReset: () => void;
}

export const VirtualFrameControls: React.FC<VirtualFrameControlsProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const updateConfig = <K extends keyof VirtualFrameConfig>(
    key: K,
    value: VirtualFrameConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  const updateNested = (path: string, value: unknown) => {
    const keys = path.split('.');
    const newConfig = { ...config } as Record<string, unknown>;
    let current = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
      current = current[keys[i]] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
    onChange(newConfig as VirtualFrameConfig);
  };

  return (
    <div
      className="virtual-frame-controls"
      style={{
        padding: '1rem',
        background: 'rgba(15, 15, 17, 0.9)',
        backdropFilter: 'blur(16px)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: 'Rajdhani, sans-serif',
        color: 'white',
        fontSize: '0.875rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Virtual Frame Settings</h3>
        <button
          onClick={onReset}
          style={{
            padding: '0.25rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Reset
        </button>
      </div>

      {/* Phase Synthesis */}
      <ControlSection title="Phase Synthesis">
        <Slider
          label="Feather"
          value={config.phaseSynthesis.featherPx}
          min={4}
          max={20}
          onChange={(v) => updateNested('phaseSynthesis.featherPx', v)}
        />
        <Slider
          label="Motion Shear"
          value={config.phaseSynthesis.motionShear}
          min={0}
          max={0.2}
          step={0.01}
          onChange={(v) => updateNested('phaseSynthesis.motionShear', v)}
        />
      </ControlSection>

      {/* Parallax */}
      <ControlSection title="Parallax">
        <Toggle
          label="Enabled"
          value={config.parallax.enabled}
          onChange={(v) => updateNested('parallax.enabled', v)}
        />
        {config.parallax.enabled && (
          <Slider
            label="Intensity"
            value={config.parallax.intensity}
            min={0}
            max={2}
            step={0.1}
            onChange={(v) => updateNested('parallax.intensity', v)}
          />
        )}
      </ControlSection>

      {/* Shadow */}
      <ControlSection title="Shadow">
        <Toggle
          label="Enabled"
          value={config.shadow.enabled}
          onChange={(v) => updateNested('shadow.enabled', v)}
        />
        {config.shadow.enabled && (
          <Slider
            label="Opacity"
            value={config.shadow.opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateNested('shadow.opacity', v)}
          />
        )}
      </ControlSection>

      {/* Motion Blur */}
      <ControlSection title="Motion Blur">
        <Toggle
          label="Enabled"
          value={config.motionBlur.enabled}
          onChange={(v) => updateNested('motionBlur.enabled', v)}
        />
        {config.motionBlur.enabled && (
          <Slider
            label="Mix"
            value={config.motionBlur.mixFactor}
            min={0}
            max={0.5}
            step={0.05}
            onChange={(v) => updateNested('motionBlur.mixFactor', v)}
          />
        )}
      </ControlSection>

      {/* Sweeteners */}
      <ControlSection title="Sweeteners">
        <Toggle
          label="Film Grain"
          value={config.sweeteners.grain.enabled}
          onChange={(v) => updateNested('sweeteners.grain.enabled', v)}
        />
        <Toggle
          label="Vignette"
          value={config.sweeteners.vignette.enabled}
          onChange={(v) => updateNested('sweeteners.vignette.enabled', v)}
        />
      </ControlSection>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ControlSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div
      style={{
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        opacity: 0.5,
        marginBottom: '0.5rem',
        letterSpacing: '0.05em',
      }}
    >
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {children}
    </div>
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <span style={{ width: '80px', fontSize: '0.75rem' }}>{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        flex: 1,
        accentColor: '#8b5cf6',
      }}
    />
    <span
      style={{
        width: '40px',
        fontSize: '0.75rem',
        textAlign: 'right',
        opacity: 0.7,
      }}
    >
      {value.toFixed(step < 1 ? 2 : 0)}
    </span>
  </div>
);

const Toggle: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <span style={{ flex: 1, fontSize: '0.75rem' }}>{label}</span>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '40px',
        height: '20px',
        borderRadius: '10px',
        border: 'none',
        background: value
          ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
          : 'rgba(255, 255, 255, 0.2)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'white',
          top: '2px',
          left: value ? '22px' : '2px',
          transition: 'left 0.2s',
        }}
      />
    </button>
  </div>
);

export default VirtualFrameRenderer;
