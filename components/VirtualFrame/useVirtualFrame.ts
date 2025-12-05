/**
 * useVirtualFrame.ts
 *
 * React hook for easy integration of Virtual Frame system
 * into existing components like Step4Preview.
 *
 * Usage:
 * const { render, setAngle, setAudioLevels } = useVirtualFrame({
 *   frames: generatedFrames,
 *   canvas: canvasRef.current,
 * });
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { VirtualFrameStitcher, StitchParams } from './VirtualFrameStitcher';
import {
  Frame,
  VirtualFrameAnimator,
  InterpolationResult,
} from './virtual-frame-utils';
import { VIRTUAL_FRAME_CONFIG, VirtualFramePreset } from '../../constants';

export interface UseVirtualFrameOptions {
  frames: Frame[];
  canvas: HTMLCanvasElement | null;
  width?: number;
  height?: number;
  preset?: VirtualFramePreset;
  autoInit?: boolean;
}

export interface UseVirtualFrameReturn {
  // State
  isReady: boolean;
  isLoading: boolean;
  loadingProgress: number;

  // Initialization
  initialize: () => Promise<void>;
  dispose: () => void;

  // Animation control
  setAngle: (angle: number, immediate?: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  // Audio reactivity
  setAudioLevels: (bass: number, mid: number, high: number) => void;

  // Rendering
  render: (deltaTime?: number) => InterpolationResult | null;
  renderFrame: (frameA: string, frameB: string, t: number) => void;

  // Get current interpolation without rendering
  getInterpolation: () => InterpolationResult | null;
}

export function useVirtualFrame(options: UseVirtualFrameOptions): UseVirtualFrameReturn {
  const {
    frames,
    canvas,
    width = 584,
    height = 584,
    preset = 'audio-dance',
    autoInit = true,
  } = options;

  const stitcherRef = useRef<VirtualFrameStitcher | null>(null);
  const animatorRef = useRef<VirtualFrameAnimator | null>(null);
  const audioLevelsRef = useRef({ bass: 0, mid: 0, high: 0 });
  const lastTimeRef = useRef<number>(0);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Get config for preset
  const config = VIRTUAL_FRAME_CONFIG.presets[preset] || VIRTUAL_FRAME_CONFIG.presets['audio-dance'];

  // Initialize the system
  const initialize = useCallback(async () => {
    if (!canvas || frames.length === 0) return;

    setIsLoading(true);
    setLoadingProgress(0);

    try {
      // Create stitcher
      stitcherRef.current = new VirtualFrameStitcher({
        canvas,
        width,
        height,
      });

      // Create animator
      animatorRef.current = new VirtualFrameAnimator(frames, {
        framesPerRevolution: frames.length,
        warpMultiplier: config.phaseSynthesis?.warpMultiplier ?? 1.0,
        seamFeatherPx: config.phaseSynthesis?.featherPx ?? 10,
        motionShear: config.phaseSynthesis?.motionShear ?? 0.08,
      });

      // Load frame textures
      let loaded = 0;
      const loadPromises = frames.map((frame) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            stitcherRef.current?.loadFrame(frame.id, img);
            loaded++;
            setLoadingProgress(loaded / frames.length);
            resolve();
          };

          img.onerror = () => reject(new Error(`Failed to load: ${frame.url}`));
          img.src = frame.url;
        });
      });

      await Promise.all(loadPromises);

      setIsReady(true);
    } catch (error) {
      console.error('Virtual Frame init error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [canvas, frames, width, height, config]);

  // Auto-initialize if enabled
  useEffect(() => {
    if (autoInit && canvas && frames.length > 0 && !isReady && !isLoading) {
      initialize();
    }
  }, [autoInit, canvas, frames, isReady, isLoading, initialize]);

  // Cleanup
  const dispose = useCallback(() => {
    stitcherRef.current?.dispose();
    stitcherRef.current = null;
    animatorRef.current = null;
    setIsReady(false);
  }, []);

  useEffect(() => {
    return () => dispose();
  }, [dispose]);

  // Animation control
  const setAngle = useCallback((angle: number, immediate = false) => {
    animatorRef.current?.setTarget(angle, immediate);
  }, []);

  const setZoom = useCallback((zoom: number) => {
    animatorRef.current?.setZoom(zoom);
  }, []);

  const setPan = useCallback((x: number, y: number) => {
    animatorRef.current?.setPan(x, y);
  }, []);

  const setAudioLevels = useCallback((bass: number, mid: number, high: number) => {
    audioLevelsRef.current = { bass, mid, high };
  }, []);

  // Get current interpolation
  const getInterpolation = useCallback((): InterpolationResult | null => {
    if (!animatorRef.current) return null;
    return animatorRef.current.update(0);
  }, []);

  // Build stitch params with audio reactivity
  const buildParams = useCallback((interpolation: InterpolationResult): StitchParams => {
    const { t, seamAngle, motionDir } = interpolation;
    const { bass, mid, high } = audioLevelsRef.current;
    const base = VirtualFrameStitcher.getDefaultParams();

    const featherWidth = (config.phaseSynthesis?.featherPx ?? 10) / width;
    const motionShear = (config.phaseSynthesis?.motionShear ?? 0.08) + high * 0.06;
    const grainIntensity = config.sweeteners?.grain?.enabled
      ? (config.sweeteners.grain.intensity ?? 0.03) + bass * 0.03
      : 0;

    return {
      ...base,
      blendT: t,
      featherWidth,
      warpStrength: Math.min(t * (config.phaseSynthesis?.warpMultiplier ?? 1.0), 1),
      motionShear,
      seamAngle,
      parallaxEnabled: config.parallax?.enabled ?? true,
      parallaxOffset: motionDir * (config.parallax?.intensity ?? 1.0),
      grainIntensity,
      vignetteStrength: config.sweeteners?.vignette?.enabled
        ? (config.sweeteners.vignette.intensity ?? 0.2)
        : 0,
      ditherAmount: 0.002,
      motionBlurEnabled: config.motionBlur?.enabled ?? true,
      motionBlurMix: config.motionBlur?.mixFactor ?? 0.3,
      shadowEnabled: config.shadow?.enabled ?? true,
      shadowIntensity: config.shadow?.opacity ?? 0.4,
      shadowOffset: [motionDir * 0.003, -0.05],
    };
  }, [config, width]);

  // Main render function
  const render = useCallback((deltaTime?: number): InterpolationResult | null => {
    if (!stitcherRef.current || !animatorRef.current || !isReady) {
      return null;
    }

    const now = performance.now();
    const dt = deltaTime ?? (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    // Update animation
    const interpolation = animatorRef.current.update(dt);
    const params = buildParams(interpolation);

    // Render
    stitcherRef.current.stitch(
      interpolation.frameA.id,
      interpolation.frameB.id,
      params
    );

    return interpolation;
  }, [isReady, buildParams]);

  // Direct frame render (for manual control)
  const renderFrame = useCallback((frameA: string, frameB: string, t: number) => {
    if (!stitcherRef.current || !isReady) return;

    const params = VirtualFrameStitcher.getDefaultParams();
    params.blendT = t;

    stitcherRef.current.stitch(frameA, frameB, params);
  }, [isReady]);

  return {
    isReady,
    isLoading,
    loadingProgress,
    initialize,
    dispose,
    setAngle,
    setZoom,
    setPan,
    setAudioLevels,
    render,
    renderFrame,
    getInterpolation,
  };
}

export default useVirtualFrame;
