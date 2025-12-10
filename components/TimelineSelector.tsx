/**
 * TimelineSelector.tsx
 * 
 * Visual timeline component for selecting export segments
 * Free users: 30-second window | Paid users: Full song
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Music,
  Lock,
  Unlock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Sparkles,
  Crown,
  Clock,
  AlertCircle
} from 'lucide-react';

// Types
export interface TimelineSegment {
  startTime: number;
  endTime: number;
  startPercent: number;
  endPercent: number;
}

export interface TimelineSelectorProps {
  audioFile: File | null;
  audioDuration: number;
  waveformData?: Float32Array;
  isPaidUser: boolean;
  onSegmentChange: (segment: TimelineSegment) => void;
  onUpgradeClick: () => void;
  className?: string;
}

// Constants
const FREE_TIER_LIMIT = 30; // seconds
const TIMELINE_HEIGHT = 120;
const WAVEFORM_HEIGHT = 80;
const HANDLE_WIDTH = 12;

// Helper function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

// Trigger impulse for Quantum Visualizer integration
const triggerImpulse = (type: 'click' | 'hover', intensity: number = 1.0) => {
  const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
  window.dispatchEvent(event);
};

export const TimelineSelector: React.FC<TimelineSelectorProps> = ({
  audioFile,
  audioDuration,
  waveformData,
  isPaidUser,
  onSegmentChange,
  onUpgradeClick,
  className = ''
}) => {
  // State
  const [segment, setSegment] = useState<TimelineSegment>({
    startTime: 0,
    endTime: Math.min(FREE_TIER_LIMIT, audioDuration),
    startPercent: 0,
    endPercent: Math.min((FREE_TIER_LIMIT / audioDuration) * 100, 100)
  });
  
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'segment' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !waveformData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = WAVEFORM_HEIGHT * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    const width = canvas.offsetWidth;
    const height = WAVEFORM_HEIGHT;
    const samples = waveformData.length;
    const samplesPerPixel = Math.floor(samples / width);
    
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    
    for (let x = 0; x < width; x++) {
      const sampleIndex = x * samplesPerPixel;
      const amplitude = waveformData[sampleIndex] || 0;
      const y = (height / 2) + (amplitude * height / 2);
      ctx.lineTo(x, y);
    }
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Fill below line
    ctx.lineTo(width, height / 2);
    ctx.lineTo(0, height / 2);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
    ctx.fill();
    
  }, [waveformData]);
  
  // Handle segment dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'segment') => {
    if (!timelineRef.current) return;
    
    setIsDragging(type);
    triggerImpulse('click', 0.8);
    
    // Check if trying to exceed free tier limit
    if (!isPaidUser && type === 'segment') {
      const segmentDuration = segment.endTime - segment.startTime;
      if (segmentDuration >= FREE_TIER_LIMIT) {
        setShowUpgradePrompt(true);
        setTimeout(() => setShowUpgradePrompt(false), 3000);
      }
    }
  }, [isPaidUser, segment]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = (percent / 100) * audioDuration;
    
    const segmentDuration = segment.endTime - segment.startTime;
    const maxDuration = isPaidUser ? audioDuration : FREE_TIER_LIMIT;
    
    if (isDragging === 'start') {
      // Move start handle
      const newStartTime = Math.min(time, segment.endTime - 1);
      const newDuration = segment.endTime - newStartTime;
      
      if (newDuration <= maxDuration) {
        setSegment(prev => ({
          ...prev,
          startTime: newStartTime,
          startPercent: (newStartTime / audioDuration) * 100
        }));
      }
    } else if (isDragging === 'end') {
      // Move end handle
      const newEndTime = Math.max(time, segment.startTime + 1);
      const newDuration = newEndTime - segment.startTime;
      
      if (newDuration <= maxDuration) {
        setSegment(prev => ({
          ...prev,
          endTime: newEndTime,
          endPercent: (newEndTime / audioDuration) * 100
        }));
      }
    } else if (isDragging === 'segment') {
      // Move entire segment
      const halfDuration = segmentDuration / 2;
      let newStartTime = time - halfDuration;
      let newEndTime = time + halfDuration;
      
      // Constrain to bounds
      if (newStartTime < 0) {
        newStartTime = 0;
        newEndTime = segmentDuration;
      } else if (newEndTime > audioDuration) {
        newEndTime = audioDuration;
        newStartTime = audioDuration - segmentDuration;
      }
      
      setSegment({
        startTime: newStartTime,
        endTime: newEndTime,
        startPercent: (newStartTime / audioDuration) * 100,
        endPercent: (newEndTime / audioDuration) * 100
      });
    }
    
  }, [isDragging, audioDuration, isPaidUser, segment]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(null);
      onSegmentChange(segment);
      triggerImpulse('click', 0.5);
    }
  }, [isDragging, segment, onSegmentChange]);
  
  // Add event listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  // Update segment when duration changes
  useEffect(() => {
    onSegmentChange(segment);
  }, [segment]);
  
  // Playback controls
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      audioRef.current.currentTime = segment.startTime;
      audioRef.current.play();
      setIsPlaying(true);
      
      const updateTime = () => {
        if (audioRef.current) {
          const time = audioRef.current.currentTime;
          setCurrentTime(time);
          
          // Loop within segment
          if (time >= segment.endTime) {
            audioRef.current.currentTime = segment.startTime;
          }
          
          if (isPlaying) {
            animationRef.current = requestAnimationFrame(updateTime);
          }
        }
      };
      
      animationRef.current = requestAnimationFrame(updateTime);
    }
  }, [isPlaying, segment]);
  
  // Quick segment presets
  const selectPreset = (preset: 'intro' | 'chorus' | 'full') => {
    triggerImpulse('click', 1.0);
    
    switch (preset) {
      case 'intro':
        setSegment({
          startTime: 0,
          endTime: Math.min(FREE_TIER_LIMIT, audioDuration),
          startPercent: 0,
          endPercent: Math.min((FREE_TIER_LIMIT / audioDuration) * 100, 100)
        });
        break;
      case 'chorus':
        // Assume chorus is around 1/3 into the song
        const chorusStart = audioDuration / 3;
        const chorusEnd = Math.min(chorusStart + FREE_TIER_LIMIT, audioDuration);
        setSegment({
          startTime: chorusStart,
          endTime: chorusEnd,
          startPercent: (chorusStart / audioDuration) * 100,
          endPercent: (chorusEnd / audioDuration) * 100
        });
        break;
      case 'full':
        if (isPaidUser) {
          setSegment({
            startTime: 0,
            endTime: audioDuration,
            startPercent: 0,
            endPercent: 100
          });
        } else {
          setShowUpgradePrompt(true);
          onUpgradeClick();
        }
        break;
    }
  };
  
  const segmentDuration = segment.endTime - segment.startTime;
  const currentPercent = (currentTime / audioDuration) * 100;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-lg">
            <Music size={20} className="text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Timeline Selection
            </h3>
            <p className="text-xs text-gray-400">
              {isPaidUser ? (
                <span className="flex items-center gap-1">
                  <Crown size={12} className="text-yellow-400" />
                  Full song access
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-cyan-400" />
                  Select any 30-second segment
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Preset Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectPreset('intro')}
            className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            onMouseEnter={() => triggerImpulse('hover', 0.2)}
          >
            Intro
          </button>
          <button
            onClick={() => selectPreset('chorus')}
            className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            onMouseEnter={() => triggerImpulse('hover', 0.2)}
          >
            Chorus
          </button>
          <button
            onClick={() => selectPreset('full')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isPaidUser 
                ? 'bg-brand-500/20 hover:bg-brand-500/30 text-brand-300'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
            }`}
            onMouseEnter={() => triggerImpulse('hover', 0.3)}
          >
            {isPaidUser ? 'Full Song' : '🔒 Full Song'}
          </button>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="relative bg-black/40 rounded-xl border border-white/10 p-4">
        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
          style={{ height: WAVEFORM_HEIGHT }}
        />
        
        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-20 bg-white/5 rounded-lg overflow-hidden cursor-pointer"
          style={{ height: TIMELINE_HEIGHT }}
        >
          {/* Selected Segment */}
          <div
            className="absolute top-0 h-full bg-brand-500/20 border-x-2 border-brand-500"
            style={{
              left: `${segment.startPercent}%`,
              width: `${segment.endPercent - segment.startPercent}%`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'segment')}
          >
            {/* Segment Info */}
            <div className="absolute top-2 left-2 right-2 flex justify-between text-xs">
              <span className="bg-black/60 px-2 py-0.5 rounded text-brand-300">
                {formatTime(segment.startTime)}
              </span>
              <span className="bg-black/60 px-2 py-0.5 rounded text-white font-bold">
                {segmentDuration.toFixed(1)}s
              </span>
              <span className="bg-black/60 px-2 py-0.5 rounded text-brand-300">
                {formatTime(segment.endTime)}
              </span>
            </div>
          </div>
          
          {/* Start Handle */}
          <div
            className="absolute top-0 h-full cursor-ew-resize group"
            style={{ left: `${segment.startPercent}%`, width: HANDLE_WIDTH }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          >
            <div className="h-full w-1 bg-brand-400 group-hover:bg-brand-300 transition-colors" />
            <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-8 bg-brand-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* End Handle */}
          <div
            className="absolute top-0 h-full cursor-ew-resize group"
            style={{ left: `${segment.endPercent}%`, width: HANDLE_WIDTH, marginLeft: -HANDLE_WIDTH }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          >
            <div className="h-full w-1 bg-brand-400 group-hover:bg-brand-300 transition-colors" />
            <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-8 bg-brand-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Playhead */}
          {isPlaying && (
            <div
              className="absolute top-0 h-full w-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.5)] pointer-events-none"
              style={{ left: `${currentPercent}%` }}
            />
          )}
          
          {/* Time Grid */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/40 flex items-center justify-between px-2">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="text-xs text-gray-500 font-mono">
                {formatTime((audioDuration / 10) * i).split('.')[0]}
              </div>
            ))}
          </div>
        </div>
        
        {/* Upgrade Prompt */}
        {showUpgradePrompt && !isPaidUser && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center animate-pulse">
            <div className="text-center">
              <Lock size={48} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-white font-bold mb-2">Unlock Full Song Export</p>
              <button
                onClick={onUpgradeClick}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-full hover:scale-105 transition-transform"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => audioRef.current && (audioRef.current.currentTime = segment.startTime)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            onMouseEnter={() => triggerImpulse('hover', 0.2)}
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlayback}
            className="p-3 bg-brand-500/20 hover:bg-brand-500/30 rounded-lg transition-colors"
            onMouseEnter={() => triggerImpulse('hover', 0.3)}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => audioRef.current && (audioRef.current.currentTime = segment.endTime - 0.1)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            onMouseEnter={() => triggerImpulse('hover', 0.2)}
          >
            <SkipForward size={16} />
          </button>
        </div>
        
        {/* Segment Info */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-gray-400">Selected:</span>
            <span className="text-white font-bold">{segmentDuration.toFixed(1)}s</span>
          </div>
          
          {!isPaidUser && segmentDuration > FREE_TIER_LIMIT - 5 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <AlertCircle size={14} />
              <span className="text-xs">Near 30s limit</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden Audio Element */}
      {audioFile && (
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audioFile)}
          className="hidden"
        />
      )}
    </div>
  );
};

export default TimelineSelector;