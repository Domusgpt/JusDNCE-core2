/**
 * AnimationStudio.tsx
 *
 * Advanced Animation Production Interface
 * Provides UI for the expanded animation system with multiple modes,
 * virtual frame effects, camera motions, and AI-powered planning.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Film,
  Sparkles,
  Camera,
  Layers,
  Play,
  Pause,
  Download,
  Settings,
  Wand2,
  RotateCcw,
  Zap,
  Music,
  Image,
  Box,
  BookOpen,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';

// Types
interface AnimationMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  frameCount: number;
  spriteSheets: number;
}

interface CameraMotion {
  id: string;
  name: string;
  description: string;
}

interface VirtualEffect {
  id: string;
  name: string;
  enabled: boolean;
  intensity: number;
}

interface ProductionState {
  phase: 'idle' | 'planning' | 'generating' | 'composing' | 'exporting' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  framesGenerated: number;
  totalFrames: number;
  error?: string;
}

interface AnimationStudioProps {
  sourceImage: string;
  audioFile?: File | null;
  onExport: (videoBlob: Blob) => void;
  onClose: () => void;
}

const triggerImpulse = (type: 'click' | 'hover', intensity: number = 1.0) => {
  const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
  window.dispatchEvent(event);
};

// Animation Modes
const ANIMATION_MODES: AnimationMode[] = [
  {
    id: 'dance',
    name: 'Dance Sequence',
    description: 'Audio-reactive dance moves with beat sync',
    icon: <Music size={20} />,
    frameCount: 12,
    spriteSheets: 1
  },
  {
    id: 'story',
    name: 'Story Animation',
    description: 'Sequential narrative with scene transitions',
    icon: <BookOpen size={20} />,
    frameCount: 120,
    spriteSheets: 10
  },
  {
    id: 'product-360',
    name: 'Product 360°',
    description: 'Full rotation showcase with lighting',
    icon: <Box size={20} />,
    frameCount: 36,
    spriteSheets: 3
  },
  {
    id: 'transformation',
    name: 'Transformation',
    description: 'Morph sequence with smooth transitions',
    icon: <Shuffle size={20} />,
    frameCount: 24,
    spriteSheets: 2
  },
  {
    id: 'tutorial',
    name: 'Tutorial Steps',
    description: 'Step-by-step instructional sequence',
    icon: <Layers size={20} />,
    frameCount: 48,
    spriteSheets: 4
  }
];

// Camera Motions
const CAMERA_MOTIONS: CameraMotion[] = [
  { id: 'static', name: 'Static', description: 'No camera movement' },
  { id: 'pan-left', name: 'Pan Left', description: 'Horizontal pan to the left' },
  { id: 'pan-right', name: 'Pan Right', description: 'Horizontal pan to the right' },
  { id: 'zoom-in', name: 'Zoom In', description: 'Slow zoom into subject' },
  { id: 'zoom-out', name: 'Zoom Out', description: 'Slow zoom out from subject' },
  { id: 'ken-burns', name: 'Ken Burns', description: 'Combined pan and zoom' },
  { id: 'shake', name: 'Impact Shake', description: 'Dramatic shake effect' },
  { id: 'orbit', name: 'Orbit', description: 'Circular motion around subject' }
];

// Default Virtual Effects
const DEFAULT_EFFECTS: VirtualEffect[] = [
  { id: 'phase-synthesis', name: 'Phase Synthesis', enabled: true, intensity: 1.0 },
  { id: 'motion-blur', name: 'Motion Blur', enabled: true, intensity: 0.3 },
  { id: 'parallax', name: 'Parallax Depth', enabled: true, intensity: 0.8 },
  { id: 'shadow', name: 'Dynamic Shadows', enabled: true, intensity: 0.4 },
  { id: 'seam-blend', name: 'Seam Blending', enabled: true, intensity: 1.0 },
  { id: 'film-grain', name: 'Film Grain', enabled: false, intensity: 0.1 }
];

export const AnimationStudio: React.FC<AnimationStudioProps> = ({
  sourceImage,
  audioFile,
  onExport,
  onClose
}) => {
  // State
  const [selectedMode, setSelectedMode] = useState<AnimationMode>(ANIMATION_MODES[0]);
  const [selectedCamera, setSelectedCamera] = useState<string>('static');
  const [effects, setEffects] = useState<VirtualEffect[]>(DEFAULT_EFFECTS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);
  const [production, setProduction] = useState<ProductionState>({
    phase: 'idle',
    progress: 0,
    currentStep: '',
    framesGenerated: 0,
    totalFrames: 0
  });

  // Preview state
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation loop for preview
  useEffect(() => {
    if (isPlaying && previewFrames.length > 0) {
      const fps = 24;
      let lastTime = 0;

      const animate = (time: number) => {
        if (time - lastTime >= 1000 / fps) {
          setCurrentFrame(prev => (prev + 1) % previewFrames.length);
          lastTime = time;
        }
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, previewFrames.length]);

  // Toggle effect
  const toggleEffect = useCallback((id: string) => {
    setEffects(prev => prev.map(e =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    ));
  }, []);

  // Update effect intensity
  const updateEffectIntensity = useCallback((id: string, intensity: number) => {
    setEffects(prev => prev.map(e =>
      e.id === id ? { ...e, intensity } : e
    ));
  }, []);

  // Start production
  const startProduction = useCallback(async () => {
    triggerImpulse('click', 1.5);

    setProduction({
      phase: 'planning',
      progress: 0,
      currentStep: 'Analyzing prompt and planning animation...',
      framesGenerated: 0,
      totalFrames: selectedMode.frameCount
    });

    try {
      // Simulate planning phase
      await new Promise(r => setTimeout(r, 1500));

      setProduction(prev => ({
        ...prev,
        phase: 'generating',
        progress: 10,
        currentStep: 'Generating sprite sheets...'
      }));

      // Simulate frame generation
      const totalFrames = selectedMode.frameCount;
      for (let i = 0; i < totalFrames; i += 4) {
        await new Promise(r => setTimeout(r, 200));
        setProduction(prev => ({
          ...prev,
          progress: 10 + (i / totalFrames) * 60,
          framesGenerated: Math.min(i + 4, totalFrames),
          currentStep: `Generating frames ${i + 1}-${Math.min(i + 4, totalFrames)} of ${totalFrames}...`
        }));
      }

      // Simulate composition phase
      setProduction(prev => ({
        ...prev,
        phase: 'composing',
        progress: 75,
        currentStep: 'Applying virtual frame effects...'
      }));
      await new Promise(r => setTimeout(r, 2000));

      // Simulate export phase
      setProduction(prev => ({
        ...prev,
        phase: 'exporting',
        progress: 90,
        currentStep: 'Encoding video...'
      }));
      await new Promise(r => setTimeout(r, 1500));

      // Complete
      setProduction(prev => ({
        ...prev,
        phase: 'complete',
        progress: 100,
        currentStep: 'Animation complete!'
      }));

      // For demo, set preview frames to source image
      setPreviewFrames([sourceImage]);

    } catch (error: any) {
      setProduction(prev => ({
        ...prev,
        phase: 'error',
        error: error.message || 'Production failed'
      }));
    }
  }, [selectedMode, sourceImage]);

  // Reset production
  const resetProduction = useCallback(() => {
    setProduction({
      phase: 'idle',
      progress: 0,
      currentStep: '',
      framesGenerated: 0,
      totalFrames: 0
    });
    setPreviewFrames([]);
    setCurrentFrame(0);
    setIsPlaying(false);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex">
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-white/10 flex flex-col bg-black/40">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/20 rounded-lg">
                <Film size={24} className="text-brand-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Animation Studio</h2>
                <p className="text-xs text-gray-400">Advanced Production Pipeline</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-gray-400 text-xl">×</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Animation Mode Selector */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Animation Mode
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ANIMATION_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setSelectedMode(mode);
                    triggerImpulse('click', 0.5);
                  }}
                  onMouseEnter={() => triggerImpulse('hover', 0.2)}
                  className={`
                    p-4 rounded-xl border text-left transition-all
                    ${selectedMode.id === mode.id
                      ? 'border-brand-500 bg-brand-500/20 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedMode.id === mode.id ? 'bg-brand-500/30 text-brand-300' : 'bg-white/10 text-gray-400'}`}>
                      {mode.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">{mode.name}</div>
                      <div className="text-xs text-gray-400">{mode.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-brand-400 font-mono">{mode.frameCount} frames</div>
                      <div className="text-xs text-gray-500">{mode.spriteSheets} sheets</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Animation Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your animation... (e.g., 'energetic dance with spins and jumps')"
              className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Camera Motion */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Camera Motion
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CAMERA_MOTIONS.map(cam => (
                <button
                  key={cam.id}
                  onClick={() => {
                    setSelectedCamera(cam.id);
                    triggerImpulse('click', 0.3);
                  }}
                  className={`
                    p-3 rounded-lg border text-left transition-all text-sm
                    ${selectedCamera === cam.id
                      ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 hover:border-white/20 text-gray-400'
                    }
                  `}
                >
                  <Camera size={14} className="inline mr-2" />
                  {cam.name}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                Duration
              </label>
              <span className="text-sm text-brand-400 font-mono">{duration}s</span>
            </div>
            <input
              type="range"
              min={3}
              max={60}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Advanced Settings */}
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-300">Virtual Frame Effects</span>
              </div>
              {showAdvanced ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-3 border-t border-white/10">
                {effects.map(effect => (
                  <div key={effect.id} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleEffect(effect.id)}
                      className={`w-10 h-6 rounded-full transition-colors ${effect.enabled ? 'bg-brand-500' : 'bg-white/20'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${effect.enabled ? 'translate-x-4' : ''}`} />
                    </button>
                    <span className={`text-sm flex-1 ${effect.enabled ? 'text-white' : 'text-gray-500'}`}>
                      {effect.name}
                    </span>
                    {effect.enabled && (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={effect.intensity * 100}
                        onChange={e => updateEffectIntensity(effect.id, Number(e.target.value) / 100)}
                        className="w-20 accent-brand-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-white/10">
          {production.phase === 'idle' ? (
            <button
              onClick={startProduction}
              disabled={!sourceImage}
              className="w-full py-4 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-3 bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 size={18} />
              START PRODUCTION
            </button>
          ) : production.phase === 'complete' ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Create demo blob
                  const blob = new Blob(['demo'], { type: 'video/mp4' });
                  onExport(blob);
                }}
                className="w-full py-4 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                <Download size={18} />
                EXPORT VIDEO
              </button>
              <button
                onClick={resetProduction}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 bg-white/10 text-gray-300 hover:bg-white/20"
              >
                <RotateCcw size={16} />
                New Animation
              </button>
            </div>
          ) : production.phase === 'error' ? (
            <div className="space-y-3">
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                <AlertCircle size={16} className="inline mr-2" />
                {production.error}
              </div>
              <button
                onClick={resetProduction}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white/10 text-gray-300"
              >
                <RotateCcw size={16} />
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="text-brand-400 animate-spin" />
                <span className="text-sm text-gray-300">{production.currentStep}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${production.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{production.framesGenerated} / {production.totalFrames} frames</span>
                <span>{Math.round(production.progress)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        {/* Preview Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Preview</h3>
            {previewFrames.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <span className="text-xs text-gray-400 font-mono">
                  Frame {currentFrame + 1} / {previewFrames.length}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Sparkles size={14} className="text-brand-400" />
            <span>{selectedMode.name}</span>
            <span className="text-gray-600">•</span>
            <span>{duration}s @ 24fps</span>
          </div>
        </div>

        {/* Preview Canvas */}
        <div className="flex-1 flex items-center justify-center p-8 bg-black/20">
          <div className="relative max-w-2xl w-full aspect-video bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            {sourceImage ? (
              <img
                src={previewFrames[currentFrame] || sourceImage}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Image size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No source image</p>
                </div>
              </div>
            )}

            {/* Overlay indicators */}
            {production.phase !== 'idle' && production.phase !== 'complete' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 size={48} className="text-brand-400 animate-spin mx-auto mb-4" />
                  <p className="text-white font-bold">{production.currentStep}</p>
                  <p className="text-gray-400 text-sm mt-2">{Math.round(production.progress)}% complete</p>
                </div>
              </div>
            )}

            {production.phase === 'complete' && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-full">
                <Check size={14} className="text-green-400" />
                <span className="text-green-300 text-xs font-bold">Ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline (placeholder) */}
        <div className="h-24 border-t border-white/10 bg-black/40 p-4">
          <div className="h-full bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
            <span className="text-gray-500 text-sm">Timeline visualization coming soon...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationStudio;
