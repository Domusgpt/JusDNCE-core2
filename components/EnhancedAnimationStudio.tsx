/**
 * EnhancedAnimationStudio.tsx
 *
 * Advanced Animation Production Interface with Chunked Export
 * Integrates TimelineSelector and ChunkedExportService for freemium model
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
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
  Music,
  Image,
  Box,
  BookOpen,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertCircle,
  Crown,
  Lock,
  Clock,
  Zap,
  CreditCard
} from 'lucide-react';

// Import our new services
import { TimelineSelector, TimelineSegment } from './TimelineSelector';
import { 
  chunkedExportService, 
  ExportSegment, 
  ExportProgress,
  createSegmentFromTimeRange,
  PaymentPlans
} from '../services/ChunkedExportService';
import {
  VIB34DIntegration,
  ChoreographyFrame,
  VisualizerState,
  vib34dIntegration,
  createDefaultVIB34DConfig,
  mergeChoreographyWithFrames
} from '../services/VIB34DIntegration';

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

interface EnhancedAnimationStudioProps {
  sourceImage: string;
  audioFile?: File | null;
  generatedFrames: string[];
  isPaidUser: boolean;
  audioDuration: number;
  waveformData?: Float32Array;
  onExport: (videoBlob: Blob) => void;
  onUpgrade: () => void;
  onClose: () => void;
}

const triggerImpulse = (type: 'click' | 'hover', intensity: number = 1.0) => {
  const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
  window.dispatchEvent(event);
};

// Enhanced Animation Modes with VIB34D Integration
const ANIMATION_MODES: AnimationMode[] = [
  {
    id: 'dance-vib34d',
    name: 'VIB34D Dance',
    description: '4D audio-reactive dance with quantum choreography',
    icon: <Music size={20} />,
    frameCount: 24,
    spriteSheets: 1
  },
  {
    id: 'quantum-flow',
    name: 'Quantum Flow',
    description: 'Multi-dimensional particle choreography',
    icon: <Zap size={20} />,
    frameCount: 36,
    spriteSheets: 2
  },
  {
    id: 'holographic',
    name: 'Holographic',
    description: 'Interference patterns with laser precision',
    icon: <Sparkles size={20} />,
    frameCount: 48,
    spriteSheets: 3
  },
  {
    id: 'faceted-crystal',
    name: 'Faceted Crystal',
    description: 'Crystalline structures with dynamic reflections',
    icon: <Box size={20} />,
    frameCount: 30,
    spriteSheets: 2
  },
  {
    id: 'story',
    name: 'Story Animation',
    description: 'Sequential narrative with scene transitions',
    icon: <BookOpen size={20} />,
    frameCount: 120,
    spriteSheets: 5
  }
];

// Camera Motions
const CAMERA_MOTIONS: CameraMotion[] = [
  { id: 'static', name: 'Static', description: 'No camera movement' },
  { id: 'ken-burns', name: 'Ken Burns', description: 'Combined pan and zoom' },
  { id: 'zoom-in', name: 'Zoom In', description: 'Slow zoom into subject' },
  { id: 'orbit', name: 'Orbit', description: 'Circular motion around subject' },
  { id: 'shake', name: 'Impact Shake', description: 'Dramatic shake effect' }
];

// Default Virtual Effects
const DEFAULT_EFFECTS: VirtualEffect[] = [
  { id: 'phase-synthesis', name: 'Phase Synthesis', enabled: true, intensity: 1.0 },
  { id: 'motion-blur', name: 'Motion Blur', enabled: true, intensity: 0.3 },
  { id: 'parallax', name: 'Parallax Depth', enabled: true, intensity: 0.8 },
  { id: 'shadow', name: 'Dynamic Shadows', enabled: true, intensity: 0.4 },
  { id: 'seam-blend', name: 'Seam Blending', enabled: true, intensity: 1.0 }
];

export const EnhancedAnimationStudio: React.FC<EnhancedAnimationStudioProps> = ({
  sourceImage,
  audioFile,
  generatedFrames,
  isPaidUser,
  audioDuration,
  waveformData,
  onExport,
  onUpgrade,
  onClose
}) => {
  // State
  const [selectedMode, setSelectedMode] = useState<AnimationMode>(ANIMATION_MODES[0]);
  const [selectedCamera, setSelectedCamera] = useState<string>('static');
  const [effects, setEffects] = useState<VirtualEffect[]>(DEFAULT_EFFECTS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<TimelineSegment>({
    startTime: 0,
    endTime: Math.min(30, audioDuration),
    startPercent: 0,
    endPercent: Math.min((30 / audioDuration) * 100, 100)
  });
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4K'>(isPaidUser ? '1080p' : '720p');
  const [frameRate, setFrameRate] = useState<24 | 30 | 60>(24);
  
  const [production, setProduction] = useState<ProductionState>({
    phase: 'idle',
    progress: 0,
    currentStep: '',
    framesGenerated: 0,
    totalFrames: 0
  });

  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Preview state
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number>();

  // Animation loop for preview
  useEffect(() => {
    if (isPlaying && previewFrames.length > 0) {
      const fps = frameRate;
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
  }, [isPlaying, previewFrames.length, frameRate]);

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

  // Handle segment selection
  const handleSegmentChange = useCallback((segment: TimelineSegment) => {
    setSelectedSegment(segment);
    
    // Update preview frames based on segment
    if (generatedFrames.length > 0) {
      const totalFrames = generatedFrames.length;
      const exportSegment = createSegmentFromTimeRange(
        segment.startTime,
        segment.endTime,
        totalFrames,
        audioDuration
      );
      
      const segmentFrames = generatedFrames.slice(
        exportSegment.startFrame,
        exportSegment.endFrame + 1
      );
      setPreviewFrames(segmentFrames);
    }
  }, [generatedFrames, audioDuration]);

  // Start production with chunked processing
  const startProduction = useCallback(async () => {
    triggerImpulse('click', 1.5);

    setProduction({
      phase: 'planning',
      progress: 0,
      currentStep: 'Analyzing segment and planning export...',
      framesGenerated: 0,
      totalFrames: selectedMode.frameCount
    });

    try {
      // Create export segment
      const exportSegment = createSegmentFromTimeRange(
        selectedSegment.startTime,
        selectedSegment.endTime,
        generatedFrames.length,
        audioDuration
      );

      // Validate segment
      const validation = chunkedExportService.validateSegment(exportSegment, isPaidUser);
      if (!validation.valid) {
        if (!isPaidUser && selectedSegment.endTime - selectedSegment.startTime > 30) {
          setShowUpgradeModal(true);
          setProduction({ phase: 'idle', progress: 0, currentStep: '', framesGenerated: 0, totalFrames: 0 });
          return;
        }
        throw new Error(validation.error);
      }

      setProduction(prev => ({
        ...prev,
        phase: 'generating',
        progress: 10,
        currentStep: 'Preparing frames for export...'
      }));

      // Start chunked export
      const videoBlob = await chunkedExportService.exportVideo({
        sourceFrames: generatedFrames,
        audioFile,
        segment: exportSegment,
        resolution,
        frameRate,
        isPaidUser,
        onProgress: (progress) => {
          setExportProgress(progress);
          setProduction(prev => ({
            ...prev,
            phase: progress.phase === 'complete' ? 'complete' : 'exporting',
            progress: 20 + (progress.percentComplete * 0.8), // Map to our progress scale
            currentStep: progress.message,
            framesGenerated: Math.floor((progress.percentComplete / 100) * selectedMode.frameCount)
          }));
        }
      });

      setProduction(prev => ({
        ...prev,
        phase: 'complete',
        progress: 100,
        currentStep: 'Export complete! Ready to download.'
      }));

      // Ready for export
      onExport(videoBlob);

    } catch (error: any) {
      setProduction(prev => ({
        ...prev,
        phase: 'error',
        error: error.message || 'Production failed'
      }));
    }
  }, [selectedMode, selectedSegment, generatedFrames, audioDuration, isPaidUser, audioFile, resolution, frameRate, onExport]);

  // Reset production
  const resetProduction = useCallback(() => {
    setProduction({
      phase: 'idle',
      progress: 0,
      currentStep: '',
      framesGenerated: 0,
      totalFrames: 0
    });
    setExportProgress(null);
    setCurrentFrame(0);
    setIsPlaying(false);
    chunkedExportService.cancelExport();
  }, []);

  // Handle upgrade flow
  const handleUpgradeClick = useCallback(() => {
    setShowUpgradeModal(true);
    triggerImpulse('click', 1.0);
  }, []);

  const selectedDuration = selectedSegment.endTime - selectedSegment.startTime;
  const canExportFullSong = isPaidUser || selectedDuration <= 30;

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
                <h2 className="text-xl font-bold text-white">Enhanced Studio</h2>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  {isPaidUser ? (
                    <>
                      <Crown size={12} className="text-yellow-400" />
                      Pro User - Full Access
                    </>
                  ) : (
                    <>
                      <Clock size={12} className="text-cyan-400" />
                      Free Tier - 30s Exports
                    </>
                  )}
                </p>
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
          
          {/* Timeline Selector */}
          <TimelineSelector
            audioFile={audioFile}
            audioDuration={audioDuration}
            waveformData={waveformData}
            isPaidUser={isPaidUser}
            onSegmentChange={handleSegmentChange}
            onUpgradeClick={handleUpgradeClick}
            className="border border-white/10 rounded-xl p-4 bg-black/20"
          />

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
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Export Settings
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as '720p' | '1080p' | '4K')}
                  className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  disabled={!isPaidUser && resolution !== '720p'}
                >
                  <option value="720p">720p (Free)</option>
                  <option value="1080p" disabled={!isPaidUser}>1080p {!isPaidUser && '🔒'}</option>
                  <option value="4K" disabled={!isPaidUser}>4K {!isPaidUser && '🔒'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Frame Rate</label>
                <select
                  value={frameRate}
                  onChange={(e) => setFrameRate(Number(e.target.value) as 24 | 30 | 60)}
                  className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60} disabled={!isPaidUser}>60 fps {!isPaidUser && '🔒'}</option>
                </select>
              </div>
            </div>
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
            <div className="space-y-3">
              {/* Export Info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Export Duration:</span>
                <span className="text-white font-bold">{selectedDuration.toFixed(1)}s</span>
              </div>
              
              {!canExportFullSong && (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-300 text-sm">
                    <Lock size={14} />
                    <span>Segment too long for free tier</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={canExportFullSong ? startProduction : handleUpgradeClick}
                disabled={!sourceImage || generatedFrames.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  canExportFullSong 
                    ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] hover:scale-[1.02]'
                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 text-black hover:scale-[1.02]'
                }`}
              >
                {canExportFullSong ? <Wand2 size={18} /> : <Crown size={18} />}
                {canExportFullSong ? 'START EXPORT' : 'UPGRADE TO EXPORT'}
              </button>
            </div>
          ) : production.phase === 'complete' ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Export already handled in startProduction
                  triggerImpulse('click', 1.0);
                }}
                className="w-full py-4 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                <Download size={18} />
                EXPORT COMPLETE
              </button>
              <button
                onClick={resetProduction}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 bg-white/10 text-gray-300 hover:bg-white/20"
              >
                <RotateCcw size={16} />
                New Export
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
                {exportProgress && (
                  <>
                    <span>Chunk {exportProgress.currentChunk} / {exportProgress.totalChunks}</span>
                    <span>{Math.round(production.progress)}%</span>
                  </>
                )}
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
            <span>{selectedDuration.toFixed(1)}s @ {frameRate}fps</span>
            <span className="text-gray-600">•</span>
            <span className={isPaidUser ? 'text-green-400' : 'text-yellow-400'}>
              {resolution}
            </span>
          </div>
        </div>

        {/* Preview Canvas */}
        <div className="flex-1 flex items-center justify-center p-8 bg-black/20">
          <div className="relative max-w-2xl w-full aspect-video bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            {sourceImage || previewFrames.length > 0 ? (
              <img
                src={previewFrames[currentFrame] || sourceImage}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Image size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No preview available</p>
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
                  {exportProgress && (
                    <p className="text-cyan-300 text-xs mt-1">
                      ETA: {exportProgress.estimatedTimeRemaining}s
                    </p>
                  )}
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
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-black/90 border border-white/10 rounded-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center">
              <Crown size={48} className="text-yellow-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Unlock Full Song Exports</h3>
              <p className="text-gray-400 mb-6">
                Export your complete {audioDuration.toFixed(0)}-second song in high quality
              </p>
              
              <div className="grid grid-cols-1 gap-3 mb-6">
                {Object.entries(PaymentPlans).map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onUpgrade();
                      setShowUpgradeModal(false);
                    }}
                    className="p-4 bg-gradient-to-r from-brand-600 to-purple-600 rounded-xl text-left hover:scale-105 transition-transform"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{plan.name}</div>
                        <div className="text-sm text-gray-300">${plan.price}</div>
                      </div>
                      <CreditCard size={20} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAnimationStudio;