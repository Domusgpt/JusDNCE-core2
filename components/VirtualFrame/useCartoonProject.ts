/**
 * useCartoonProject.ts
 *
 * React hook for managing multi-scene cartoon projects.
 * Handles generation, timeline composition, and playback.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CartoonProject,
  Scene,
  Shot,
  ProjectSettings,
  GenerationPlan,
  UniqueFrame,
  CartoonPlanner,
  TimelineComposer,
  CameraMotionGenerator,
  BatchGenerationService,
  TimelineTrack,
  CameraState,
  CameraMotion,
} from '../../services/batchGeneration';
import {
  AnimationMode,
  ANIMATION_MODE_CONFIGS,
  createAnimationProject,
  SequentialPlayer,
} from './SequentialAnimator';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCartoonProjectOptions {
  mode?: AnimationMode;
  fps?: number;
  resolution?: { width: number; height: number };
}

export interface UseCartoonProjectReturn {
  // Project state
  project: CartoonProject | null;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;

  // Project management
  createProject: (sourceImage: string, description: string, options?: Partial<ProjectSettings>) => void;
  addScene: (scene: Omit<Scene, 'id'>) => void;
  removeScene: (sceneId: string) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;

  // Shot management
  addShot: (sceneId: string, shot: Omit<Shot, 'id'>) => void;
  removeShot: (sceneId: string, shotId: string) => void;

  // Generation
  generatePlan: () => GenerationPlan | null;
  startGeneration: () => Promise<void>;
  cancelGeneration: () => void;

  // Timeline
  composeTimeline: () => TimelineTrack[];
  getTotalDuration: () => number;

  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (frame: number) => void;
  getCurrentFrame: () => number;
  isPlaying: boolean;

  // Camera motion helpers
  addPanShot: (sceneId: string, frameRef: string, direction: 'left' | 'right' | 'up' | 'down', duration: number) => void;
  addZoomShot: (sceneId: string, frameRef: string, zoomIn: boolean, duration: number) => void;
  addKenBurnsShot: (sceneId: string, frameRef: string, duration: number) => void;
  addHoldShot: (sceneId: string, frameRef: string, duration: number) => void;
  addLoopShot: (sceneId: string, frameRefs: string[], loopCount: number) => void;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: ProjectSettings = {
  totalDurationSeconds: 60,
  fps: 24,
  resolution: { width: 1920, height: 1080 },
  batchSize: 120,
  parallelBatches: 3,
  reuseThreshold: 0.8,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCartoonProject(options: UseCartoonProjectOptions = {}): UseCartoonProjectReturn {
  const { mode = 'story', fps = 24, resolution = { width: 1920, height: 1080 } } = options;

  // State
  const [project, setProject] = useState<CartoonProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Refs
  const generationService = useRef(new BatchGenerationService());
  const playerRef = useRef<SequentialPlayer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const abortRef = useRef(false);

  // ============================================================================
  // PROJECT MANAGEMENT
  // ============================================================================

  const createProject = useCallback((
    sourceImage: string,
    description: string,
    settingsOverrides?: Partial<ProjectSettings>
  ) => {
    const settings: ProjectSettings = {
      ...DEFAULT_SETTINGS,
      fps,
      resolution,
      ...settingsOverrides,
    };

    const modeConfig = ANIMATION_MODE_CONFIGS[mode];

    const newProject: CartoonProject = {
      id: `cartoon-${Date.now()}`,
      name: description.slice(0, 50) || 'Untitled Project',
      sourceImage,
      style: 'natural',
      scenes: [],
      frameLibrary: {
        uniqueFrames: [],
        categories: [],
        totalGenerated: 0,
        reusableCount: 0,
      },
      timeline: [],
      settings,
      status: 'planning',
    };

    setProject(newProject);
    setError(null);
  }, [mode, fps, resolution]);

  const addScene = useCallback((scene: Omit<Scene, 'id'>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: [
          ...prev.scenes,
          { ...scene, id: `scene-${prev.scenes.length}` },
        ],
      };
    });
  }, []);

  const removeScene = useCallback((sceneId: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.filter(s => s.id !== sceneId),
      };
    });
  }, []);

  const updateScene = useCallback((sceneId: string, updates: Partial<Scene>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map(s =>
          s.id === sceneId ? { ...s, ...updates } : s
        ),
      };
    });
  }, []);

  // ============================================================================
  // SHOT MANAGEMENT
  // ============================================================================

  const addShot = useCallback((sceneId: string, shot: Omit<Shot, 'id'>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map(scene => {
          if (scene.id !== sceneId) return scene;
          return {
            ...scene,
            shots: [
              ...scene.shots,
              { ...shot, id: `shot-${scene.shots.length}` },
            ],
          };
        }),
      };
    });
  }, []);

  const removeShot = useCallback((sceneId: string, shotId: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map(scene => {
          if (scene.id !== sceneId) return scene;
          return {
            ...scene,
            shots: scene.shots.filter(s => s.id !== shotId),
          };
        }),
      };
    });
  }, []);

  // ============================================================================
  // CAMERA MOTION SHOT HELPERS
  // ============================================================================

  const createStaticCamera = (): CameraMotion => ({
    type: 'static',
    startPos: { x: 0, y: 0, zoom: 1, rotation: 0 },
    endPos: { x: 0, y: 0, zoom: 1, rotation: 0 },
    easing: 'linear',
    duration: 0,
  });

  const addPanShot = useCallback((
    sceneId: string,
    frameRef: string,
    direction: 'left' | 'right' | 'up' | 'down',
    duration: number
  ) => {
    const camera = CameraMotionGenerator.createPanMotion(duration, direction, 0.3);
    addShot(sceneId, {
      type: 'pan',
      frameRef,
      duration,
      camera,
    });
  }, [addShot]);

  const addZoomShot = useCallback((
    sceneId: string,
    frameRef: string,
    zoomIn: boolean,
    duration: number
  ) => {
    const camera = CameraMotionGenerator.createZoomPush(duration, zoomIn ? 0.5 : -0.3);
    addShot(sceneId, {
      type: 'zoom',
      frameRef,
      duration,
      camera,
    });
  }, [addShot]);

  const addKenBurnsShot = useCallback((
    sceneId: string,
    frameRef: string,
    duration: number
  ) => {
    const camera = CameraMotionGenerator.createKenBurns(duration, true, 'right');
    addShot(sceneId, {
      type: 'pan',
      frameRef,
      duration,
      camera,
    });
  }, [addShot]);

  const addHoldShot = useCallback((
    sceneId: string,
    frameRef: string,
    duration: number
  ) => {
    addShot(sceneId, {
      type: 'hold',
      frameRef,
      duration,
      camera: createStaticCamera(),
    });
  }, [addShot]);

  const addLoopShot = useCallback((
    sceneId: string,
    frameRefs: string[],
    loopCount: number
  ) => {
    const duration = frameRefs.length * loopCount;
    addShot(sceneId, {
      type: 'loop',
      frameRef: frameRefs[0],
      duration,
      camera: createStaticCamera(),
    });
  }, [addShot]);

  // ============================================================================
  // GENERATION
  // ============================================================================

  const generatePlan = useCallback((): GenerationPlan | null => {
    if (!project) return null;

    const planner = new CartoonPlanner(project);
    return planner.createGenerationPlan();
  }, [project]);

  const startGeneration = useCallback(async () => {
    if (!project) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    abortRef.current = false;

    try {
      const plan = generatePlan();
      if (!plan) throw new Error('Failed to create generation plan');

      const allFrames: UniqueFrame[] = [];

      for (let i = 0; i < plan.batches.length; i++) {
        if (abortRef.current) break;

        const batch = plan.batches[i];
        const batchFrames = await generationService.current.generateBatch(
          batch,
          project.sourceImage,
          project.style,
          (completed, total) => {
            const overallProgress = ((i * project.settings.batchSize + completed) /
              (plan.batches.length * project.settings.batchSize)) * 100;
            setGenerationProgress(overallProgress);
          }
        );

        allFrames.push(...batchFrames);
      }

      // Update project with generated frames
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          frameLibrary: {
            ...prev.frameLibrary,
            uniqueFrames: allFrames,
            totalGenerated: allFrames.length,
            reusableCount: allFrames.filter(f => f.tags.includes('reusable')).length,
          },
          status: 'ready',
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setProject(prev => prev ? { ...prev, status: 'error' } : prev);
    } finally {
      setIsGenerating(false);
    }
  }, [project, generatePlan]);

  const cancelGeneration = useCallback(() => {
    abortRef.current = true;
    setIsGenerating(false);
  }, []);

  // ============================================================================
  // TIMELINE
  // ============================================================================

  const composeTimeline = useCallback((): TimelineTrack[] => {
    if (!project) return [];

    const composer = new TimelineComposer(project);
    const timeline = composer.compose();

    setProject(prev => prev ? { ...prev, timeline } : prev);
    return timeline;
  }, [project]);

  const getTotalDuration = useCallback((): number => {
    if (!project) return 0;
    const composer = new TimelineComposer(project);
    composer.compose();
    return composer.getTotalFrames();
  }, [project]);

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame(0);
  }, []);

  const seekTo = useCallback((frame: number) => {
    setCurrentFrame(Math.max(0, frame));
  }, []);

  const getCurrentFrameNumber = useCallback(() => currentFrame, [currentFrame]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastTime = performance.now();
    const frameInterval = 1000 / (project?.settings.fps || 24);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastTime;

      if (elapsed >= frameInterval) {
        lastTime = timestamp;
        setCurrentFrame(prev => {
          const totalFrames = getTotalDuration();
          const next = prev + 1;
          if (next >= totalFrames) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, project?.settings.fps, getTotalDuration]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    project,
    isGenerating,
    generationProgress,
    error,

    createProject,
    addScene,
    removeScene,
    updateScene,

    addShot,
    removeShot,

    generatePlan,
    startGeneration,
    cancelGeneration,

    composeTimeline,
    getTotalDuration,

    play,
    pause,
    stop,
    seekTo,
    getCurrentFrame: getCurrentFrameNumber,
    isPlaying,

    addPanShot,
    addZoomShot,
    addKenBurnsShot,
    addHoldShot,
    addLoopShot,
  };
}

export default useCartoonProject;
