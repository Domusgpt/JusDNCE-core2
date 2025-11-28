
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Video, Settings, Mic, MicOff, Maximize2, Minimize2, Upload, X, Loader2, Sliders, Package, Music, ChevronDown, ChevronUp, Activity, Download, FileVideo, Radio, Star, BarChart2 } from 'lucide-react';
import { AppState, EnergyLevel, StutterMode } from '../types';
import { QuantumVisualizer } from './Visualizer/HolographicVisualizer';
import { generatePlayerHTML } from '../services/playerExport';
import { STYLE_PRESETS } from '../constants';

interface Step4Props {
  state: AppState;
  onGenerateMore: () => void;
  onSpendCredit: (amount: number) => boolean;
  onUploadAudio: (file: File) => void;
  onSaveProject: () => void;
}

// PATTERN ENGINE CONSTANTS
type PatternType = 'ABAB' | 'AABB' | 'ABAC' | 'SNARE_ROLL' | 'CHAOS';

const PATTERNS: Record<PatternType, ('A' | 'B' | 'C')[]> = {
    'ABAB': ['A', 'B', 'A', 'B'],
    'AABB': ['A', 'A', 'B', 'B'],
    'ABAC': ['A', 'B', 'A', 'C'], // C usually high energy or unique
    'SNARE_ROLL': ['B', 'B', 'B', 'B'],
    'CHAOS': ['A', 'C', 'B', 'C']
};

export const Step4Preview: React.FC<Step4Props> = ({ state, onGenerateMore, onSpendCredit, onUploadAudio, onSaveProject }) => {
  // Canvases
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const charCanvasRef = useRef<HTMLCanvasElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Systems
  const hologramRef = useRef<QuantumVisualizer | null>(null);
  
  // Audio Graph
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // Animation State
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  
  // RHYTHM & BEAT TRACKING
  const lastBeatTimeRef = useRef<number>(0);
  const lastSnareTimeRef = useRef<number>(0);
  const lastFrameUpdateRef = useRef<number>(0); 
  const beatCounterRef = useRef<number>(0); // 1-4
  const barCounterRef = useRef<number>(0);
  
  const poseHistoryRef = useRef<string[]>([]); 
  
  // Stutter Interval System
  const beatsSinceLastStutterRef = useRef<number>(0);
  const stutterStyleRef = useRef<StutterMode>('auto');

  // Logic State
  const [brainState, setBrainState] = useState({
      intention: 'IDLE',
      currentPattern: 'ABAB' as PatternType,
      activePoseName: 'BASE',
      confidence: 0,
  });

  // Interpolation & Burst State
  const targetPoseRef = useRef<string>('base'); 
  const burstModeUntilRef = useRef<number>(0);
  const activePatternRef = useRef<PatternType>('ABAB');
  
  // Virtual Camera & Physics
  const camZoomRef = useRef<number>(1.0);
  const camShakeXRef = useRef<number>(0);
  const camShakeYRef = useRef<number>(0);
  const camRotationRef = useRef<number>(0);
  const camPanXRef = useRef<number>(0); 
  const camPanYRef = useRef<number>(0);

  // 2.5D CARD TILT PHYSICS
  const camTiltXRef = useRef<number>(0); // Vertical Tilt (Headbang)
  const camTiltYRef = useRef<number>(0); // Horizontal Tilt (Card Spin)
  
  // New FX Refs
  const dollyZoomRef = useRef<number>(0); // Contra-zoom effect (-1 to 1)
  const moireAmountRef = useRef<number>(0); // 0 to 1 intensity
  
  // Rhythmic Tearing & FX
  const tearAmountRef = useRef<number>(0); // 0 to 1
  const ghostAmountRef = useRef<number>(0); // 0 to 1
  
  // Dynamic Frame Pools
  const [framesByEnergy, setFramesByEnergy] = useState<Record<EnergyLevel, string[]>>({ low: [], mid: [], high: [] });
  const [closeupFrames, setCloseupFrames] = useState<string[]>([]); // NEW: Close up pool

  // Assets
  const poseImagesRef = useRef<Record<string, HTMLImageElement>>({}); 
  const [imagesReady, setImagesReady] = useState(false);
  
  // UI State
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // EXPORT STATE
  const [renderJob, setRenderJob] = useState<{ active: boolean, progress: number, status: string }>({ active: false, progress: 0, status: 'Idle' });
  const [showAdvancedExport, setShowAdvancedExport] = useState(false);
  
  // Advanced Export Options
  const [exportDuration, setExportDuration] = useState<'loop' | 'full'>('loop'); 
  const [exportFps, setExportFps] = useState<30 | 60 | 24>(30);
  const [exportResolution, setExportResolution] = useState<'720p' | '1080p' | '4k' | 'portrait'>('720p');
  const [exportBitrate, setExportBitrate] = useState<number>(5000000); // 5Mbps default (Good for sharing)

  const renderAbortController = useRef<AbortController | null>(null);

  // Local Settings
  const [smoothness, setSmoothness] = useState(state.smoothness);
  const [stutterDensity, setStutterDensity] = useState(state.stutter);
  const [stutterPreset, setStutterPreset] = useState<StutterMode>(state.stutterPreset || 'auto');
  
  // ---------------------------------------------------------------------------
  // 1. Initialize Hologram & Assets & Sort Frames
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Init Visualizer
    if (bgCanvasRef.current && !hologramRef.current) {
        try {
            hologramRef.current = new QuantumVisualizer(bgCanvasRef.current);
            // Apply current style params
            const style = STYLE_PRESETS.find(s => s.id === state.selectedStyleId);
            if(style && style.hologramParams) {
                hologramRef.current.params = {...style.hologramParams};
            }
        } catch (e) {
            console.error("Failed to init hologram:", e);
        }
    }

    // Sort Frames
    const sorted: Record<EnergyLevel, string[]> = { low: [], mid: [], high: [] };
    const closeups: string[] = [];

    const framesToLoad = state.generatedFrames.length > 0 
      ? state.generatedFrames 
      : (state.imagePreviewUrl ? [{ url: state.imagePreviewUrl, pose: 'base', energy: 'low' as EnergyLevel }] : []);

    framesToLoad.forEach(f => {
        if (f.type === 'closeup') {
            closeups.push(f.pose);
        } else {
            if (sorted[f.energy]) sorted[f.energy].push(f.pose);
        }
    });
    
    // Fallbacks
    if (sorted.low.length === 0 && framesToLoad.length > 0) sorted.low.push(framesToLoad[0].pose);
    if (sorted.mid.length === 0) sorted.mid = [...sorted.low]; 
    if (sorted.high.length === 0) sorted.high = [...sorted.mid]; 
    
    setFramesByEnergy(sorted);
    setCloseupFrames(closeups);

    // Load Images
    let loaded = 0;
    const newMap: Record<string, HTMLImageElement> = {};
    const total = framesToLoad.length;
    
    if (total === 0) {
        setImagesReady(true);
        return;
    }

    framesToLoad.forEach(f => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = f.url;
        img.onload = () => {
            newMap[f.pose] = img;
            loaded++;
            if (loaded === total) {
                poseImagesRef.current = newMap;
                setImagesReady(true);
            }
        };
        img.onerror = () => {
            console.warn(`Failed to load frame: ${f.pose}`);
            loaded++;
            if (loaded === total) {
                poseImagesRef.current = newMap;
                setImagesReady(true);
            }
        };
    });
  }, [state.generatedFrames, state.imagePreviewUrl, state.selectedStyleId]);

  useEffect(() => {
    return () => {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (renderAbortController.current) renderAbortController.current.abort();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Audio Engine
  // ---------------------------------------------------------------------------
  
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    setIsPlaying(false);
  }, [state.audioPreviewUrl]);

  const initAudioContext = () => {
      if (audioCtxRef.current) return audioCtxRef.current;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      analyser.connect(ctx.destination); 

      return ctx;
  };

  const toggleMic = async () => {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      if (isMicActive) {
          micStreamRef.current?.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
          setIsMicActive(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              micStreamRef.current = stream;
              const source = ctx.createMediaStreamSource(stream);
              
              if (analyserRef.current) {
                  source.connect(analyserRef.current);
                  analyserRef.current.disconnect(); // No feedback
              }
              
              setIsMicActive(true);
              setIsPlaying(true);
              if (audioRef.current) audioRef.current.pause(); 
          } catch (e) {
              console.error("Mic Access Denied", e);
              alert("Microphone access denied.");
          }
      }
  };

  const togglePlay = async () => {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      if (isMicActive) {
          setIsPlaying(!isPlaying);
          return;
      }

      if (state.audioPreviewUrl) {
          if (!audioRef.current) {
              const audio = new Audio();
              audio.crossOrigin = "anonymous";
              audio.src = state.audioPreviewUrl;
              audio.loop = true;
              
              const source = ctx.createMediaElementSource(audio);
              if (analyserRef.current) {
                  analyserRef.current.disconnect(); 
                  analyserRef.current.connect(ctx.destination);
                  source.connect(analyserRef.current);
              }
              audioRef.current = audio;
          }

          if (isPlaying) {
              audioRef.current.pause();
          } else {
              audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
      } else {
          // Synthetic Mode
          setIsPlaying(!isPlaying);
      }
  };

  // ---------------------------------------------------------------------------
  // 3. MAIN RENDER LOOP (Display)
  // ---------------------------------------------------------------------------
  const animate = useCallback((time: number) => {
    requestRef.current = requestAnimationFrame(animate);
    
    if (!startTimeRef.current) startTimeRef.current = time;
    
    // --- 1. Audio Analysis (Split Bands) ---
    // Refined for 44.1kHz sample rate, 1024 fftSize -> ~43Hz per bin
    let subBass = 0, bass = 0, snare = 0, hat = 0;
    
    if (isPlaying && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Bins 0-2: 0 - 86Hz (Sub Bass)
        subBass = dataArray.slice(0, 3).reduce((a,b)=>a+b,0) / 3 / 255;
        
        // Bins 2-6: 86 - 258Hz (Punchy Kick Fundamental) - Main Beat Driver
        bass = dataArray.slice(2, 7).reduce((a,b)=>a+b,0) / 5 / 255;
        
        // Bins 40-90: ~1.7k - 3.8k Hz (Snare Crack / Clap)
        snare = dataArray.slice(40, 90).reduce((a,b)=>a+b,0) / 50 / 255; 
        
        // Bins 200+: 8k+ Hz (Air / Hats)
        hat = dataArray.slice(200, 400).reduce((a,b)=>a+b,0) / 200 / 255;
        
    } else if (isPlaying && !state.audioPreviewUrl && !isMicActive) {
        // Synthetic Techno Clock
        const bpm = 128;
        const beatDur = 60 / bpm;
        const now = time / 1000;
        const beatPos = (now % beatDur) / beatDur;
        bass = Math.pow(Math.max(0, 1 - beatPos * 4), 2); // Kick on 1
        snare = (now % (beatDur*2) > beatDur) && (beatPos < 0.2) ? 0.8 : 0; // Snare on 2
        hat = Math.random() * 0.2;
    }

    // --- 2. Choreography Brain ---
    const now = time;
    const isBurst = now < burstModeUntilRef.current;
    
    // BEAT GATES
    // Kick detection needs to be solid
    const kickThreshold = 0.65; 
    const snareThreshold = 0.50; 
    
    // Debounce: 250ms = 240BPM limit.
    const beatDebounce = 250; 
    
    // Detect Kick
    if (bass > kickThreshold && (now - lastBeatTimeRef.current > beatDebounce)) {
        lastBeatTimeRef.current = now;
        beatsSinceLastStutterRef.current += 1;
        beatCounterRef.current = (beatCounterRef.current + 1) % 4; // 0,1,2,3
        
        if (beatCounterRef.current === 0) {
            barCounterRef.current++;
            // Switch Pattern every 4 bars
            if (barCounterRef.current % 4 === 0) {
                const patterns: PatternType[] = ['ABAB', 'AABB', 'ABAC'];
                activePatternRef.current = patterns[Math.floor(Math.random() * patterns.length)];
            }
        }
        
        if (!isBurst) {
            // PATTERN EXECUTION (KICK)
            const seq = PATTERNS[activePatternRef.current];
            const type = seq[beatCounterRef.current]; // 'A' or 'B'
            
            // Map Type to Frame
            let pool: string[] = [];
            if (type === 'A') pool = framesByEnergy.low.length > 0 ? framesByEnergy.low : framesByEnergy.mid;
            else if (type === 'B') pool = framesByEnergy.mid.length > 0 ? framesByEnergy.mid : framesByEnergy.high;
            else if (type === 'C') pool = framesByEnergy.high; // High Energy
            
            // Fallback
            if (pool.length === 0) pool = framesByEnergy.low;

            // Pick frame (excluding current if possible)
            const possibleFrames = pool.filter(f => f !== targetPoseRef.current);
            const nextPose = possibleFrames.length > 0 
                ? possibleFrames[Math.floor(Math.random() * possibleFrames.length)]
                : pool[Math.floor(Math.random() * pool.length)];
            
            if (nextPose && nextPose !== targetPoseRef.current) {
                targetPoseRef.current = nextPose;
                setBrainState(prev => ({ 
                    ...prev, 
                    intention: `PATTERN: ${activePatternRef.current}`,
                    activePoseName: nextPose,
                    confidence: Math.round(bass * 100)
                }));
                
                // KICK PHYSICS: PUSH/EXPAND
                // In Super Mode, make this snappier
                const intensity = state.superMode ? 1.15 : 1.08;
                camZoomRef.current = intensity; // Zoom IN on kick
                camTiltXRef.current = state.superMode ? 20 : 15; // Headbang forward
                camShakeYRef.current = 10;
                moireAmountRef.current = 0.5;
            }
        }
    }

    // Detect Snare (Independent of Kick)
    if (snare > snareThreshold && (now - lastSnareTimeRef.current > beatDebounce)) {
        lastSnareTimeRef.current = now;
        
        if (!isBurst) {
            // SNARE OVERRIDE - Use 'B' or 'High' frames usually
            const pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
            if (pool.length > 0) {
                const nextPose = pool[Math.floor(Math.random() * pool.length)];
                targetPoseRef.current = nextPose;
                
                 setBrainState(prev => ({ 
                    ...prev, 
                    intention: 'SNARE HIT',
                    activePoseName: nextPose
                }));
            }
            
            // SNARE PHYSICS: PULL/CONTRACT
            // Instead of expanding like a kick, we "Snap Back" or Contract
            // This creates a "Push-Pull" breathing effect
            const contract = state.superMode ? 0.90 : 0.95; 
            camZoomRef.current = contract; // Zoom OUT on snare (Contract)
            camTiltXRef.current = -15; // Look up/back (Opposite of kick)
            tearAmountRef.current = 0.8; // Glitch on snare
        }
    }

    // Hi-Hats (Continuous Tweak)
    if (hat > 0.4 && isPlaying) {
        camShakeXRef.current += (Math.random() - 0.5) * 4; // Jitter
        if (Math.random() < 0.1) ghostAmountRef.current = 0.5;
    }
    
    // --- STUTTER SYSTEM ---
    let stutterIntervalBeats = 9999;
    if (stutterDensity > 0) {
        stutterIntervalBeats = Math.max(2, Math.round(32 - (stutterDensity / 100) * 30)); 
    }

    // Trigger Stutter on SNARE hit only
    if (snare > 0.6 && beatsSinceLastStutterRef.current >= stutterIntervalBeats && !isBurst) {
        beatsSinceLastStutterRef.current = 0; 
        burstModeUntilRef.current = now + 400; 
        
        let style: StutterMode = stutterPreset;
        if (style === 'auto') {
            const opts: StutterMode[] = ['shiver', 'jump', 'smash', 'slice'];
            style = opts[Math.floor(Math.random() * opts.length)];
        }
        stutterStyleRef.current = style;

        setBrainState(prev => ({ ...prev, intention: `STUTTER: ${style.toUpperCase()}` }));
        ghostAmountRef.current = 1.0;
        
        if (style === 'jump') camTiltXRef.current = -30;
        if (style === 'smash') camZoomRef.current = 1.4;
        if (style === 'slice') tearAmountRef.current = 1.0;
        if (style === 'shiver') camPanXRef.current = 50; 
    }

    if (isBurst && now - lastFrameUpdateRef.current > 60) {
        lastFrameUpdateRef.current = now;
        const pool = framesByEnergy.high;
        if(pool.length > 0) targetPoseRef.current = pool[Math.floor(Math.random() * pool.length)];
        
        switch (stutterStyleRef.current) {
            case 'shiver': camPanXRef.current = (Math.random() - 0.5) * 150; break;
            case 'jump': camPanYRef.current = (Math.random() - 0.5) * 150; break;
            case 'smash': camZoomRef.current = Math.random() > 0.5 ? 1.3 : 0.9; break;
            case 'slice': tearAmountRef.current = 1.0; break;
        }
    }

    // --- 3. Render Visualizer ---
    if (hologramRef.current) {
        hologramRef.current.updateAudio({ bass: subBass, mid: snare, high: hat, energy: subBass+snare });
        const dollyBgOffset = -(dollyZoomRef.current * 1.5); 
        hologramRef.current.render(dollyBgOffset); 
    }
    
    // --- 4. Render Character with FX ---
    const charCtx = charCanvasRef.current?.getContext('2d');
    const charCanvas = charCanvasRef.current;
    
    if (charCtx && charCanvas) {
        charCtx.clearRect(0, 0, charCanvas.width, charCanvas.height);
        
        const dpr = window.devicePixelRatio || 1;
        const rect = charCanvas.getBoundingClientRect();
        if (charCanvas.width !== rect.width * dpr || charCanvas.height !== rect.height * dpr) {
             charCanvas.width = rect.width * dpr;
             charCanvas.height = rect.height * dpr;
             charCtx.scale(dpr, dpr);
        }

        const img = poseImagesRef.current[targetPoseRef.current] || poseImagesRef.current['base'];
        
        if (img) {
            const dollyCharScale = 1.0 + dollyZoomRef.current * 0.2; 
            const finalZoom = camZoomRef.current * dollyCharScale;

            const cw = rect.width;
            const ch = rect.height;
            const cx = cw / 2;
            const cy = ch / 2;
            
            const drawChannel = (channelColor: string, offsetX: number, offsetY: number, rotationOffset: number, scaleOffset: number) => {
                charCtx.save();
                charCtx.translate(cx + camShakeXRef.current + camPanXRef.current, cy + camShakeYRef.current + camPanYRef.current);
                
                // 2.5D CARD TILT SIMULATION
                charCtx.rotate(((camRotationRef.current + rotationOffset) * Math.PI) / 180);
                const tiltYRad = (camTiltYRef.current * Math.PI) / 180;
                const scaleY3D = Math.abs(Math.cos(tiltYRad)); 
                const tiltXRad = (camTiltXRef.current * Math.PI) / 180;
                const scaleX3D = Math.abs(Math.cos(tiltXRad));

                charCtx.scale((finalZoom + scaleOffset) * scaleY3D, (finalZoom + scaleOffset) * scaleX3D);

                const aspect = img.width / img.height;
                let drawW = cw * 0.9;
                let drawH = drawW / aspect;
                if (drawH > ch * 0.9) { drawH = ch * 0.9; drawW = drawH * aspect; }
                
                if (channelColor !== 'normal') {
                    charCtx.globalCompositeOperation = 'screen';
                    charCtx.globalAlpha = 0.8 * moireAmountRef.current;
                }

                if (channelColor === 'red') {
                    charCtx.fillStyle = '#FF0000';
                } else if (channelColor === 'blue') {
                    charCtx.fillStyle = '#0000FF';
                }

                if (tearAmountRef.current > 0.05) {
                    const slices = 10;
                    const sliceH = drawH / slices;
                    const imgSliceH = img.height / slices;
                    for(let i=0; i<slices; i++) {
                        const shift = (Math.random() - 0.5) * 50 * tearAmountRef.current;
                        charCtx.drawImage(img, 0, i * imgSliceH, img.width, imgSliceH, -drawW/2 + shift + offsetX, -drawH/2 + (i * sliceH) + offsetY, drawW, sliceH);
                    }
                } else {
                    charCtx.drawImage(img, -drawW/2 + offsetX, -drawH/2 + offsetY, drawW, drawH);
                }
                charCtx.restore();
            }

            if (moireAmountRef.current > 0.05) {
                drawChannel('red', -4 * moireAmountRef.current, 0, -1 * moireAmountRef.current, 0.02 * moireAmountRef.current);
                drawChannel('blue', 4 * moireAmountRef.current, 0, 1 * moireAmountRef.current, -0.02 * moireAmountRef.current);
                drawChannel('normal', 0, 0, 0, 0);
            } else {
                drawChannel('normal', 0, 0, 0, 0);
            }
        }
    }
    
    // Physics & FX Decay
    const dt = 16.6 / 1000;
    // Tighter decay for Super Mode for cleaner hits
    const decaySpeed = state.superMode ? 14 : 10;
    const decay = 1 - Math.exp(-decaySpeed * dt); 
    const swayDecay = 1 - Math.exp(-2 * dt);
    
    camShakeXRef.current *= (1 - decay);
    camShakeYRef.current *= (1 - decay);
    
    // IMPORTANT: Return to 1.0 (Neutral Zoom)
    camZoomRef.current = 1.0 + (camZoomRef.current - 1.0) * (1 - decay);
    
    camRotationRef.current *= (1 - decay);
    camPanXRef.current *= (1 - decay); 
    camPanYRef.current *= (1 - decay);
    
    camTiltXRef.current *= (1 - decay); 
    camTiltYRef.current *= (1 - swayDecay);

    tearAmountRef.current *= 0.8;
    ghostAmountRef.current *= 0.9;
    moireAmountRef.current *= 0.95; 
    
  }, [isPlaying, framesByEnergy, closeupFrames, stutterDensity, stutterPreset, isMicActive, state.audioPreviewUrl, state.subjectCategory, state.superMode]);

  useEffect(() => {
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // ---------------------------------------------------------------------------
  // 4. REAL-TIME BACKGROUND EXPORT
  // ---------------------------------------------------------------------------
  const startBackgroundRender = useCallback(async () => {
      if (!imagesReady) {
          alert("Assets are still loading. Please wait a moment.");
          return;
      }
      
      renderAbortController.current = new AbortController();
      setRenderJob({ active: true, progress: 0, status: 'Preparing Assets...' });
      
      try {
          const width = exportResolution === '4k' ? 3840 : exportResolution === '1080p' ? 1920 : 1280;
          const height = exportResolution === 'portrait' ? 1920 : (width * 9) / 16;
          
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ctx = exportCanvas.getContext('2d');
          
          if (!ctx) throw new Error("Could not create export canvas");

          const bgCanvas = document.createElement('canvas');
          bgCanvas.width = width;
          bgCanvas.height = height;
          const viz = new QuantumVisualizer(bgCanvas);
          if (hologramRef.current) viz.params = { ...hologramRef.current.params };

          const stream = exportCanvas.captureStream(exportFps);
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = audioContext.createMediaStreamDestination();
          const exportAnalyser = audioContext.createAnalyser();
          exportAnalyser.fftSize = 1024;
          
          let source: AudioBufferSourceNode | null = null;
          let audioDuration = 15;

          if (state.audioFile) {
               const arrayBuffer = await state.audioFile.arrayBuffer();
               const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
               audioDuration = audioBuffer.duration;
               
               source = audioContext.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(dest);
               source.connect(exportAnalyser);
          }
          
          if (dest.stream.getAudioTracks().length > 0) {
              stream.addTrack(dest.stream.getAudioTracks()[0]);
          }

          const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs=avc1') ? 'video/mp4; codecs=avc1' : 'video/webm';
          const recorder = new MediaRecorder(stream, {
              mimeType,
              videoBitsPerSecond: exportBitrate
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          
          recorder.onstop = () => {
               const blob = new Blob(chunks, { type: mimeType });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `jusDNCE_${state.selectedStyleId}_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               URL.revokeObjectURL(url);
               
               setRenderJob({ active: false, progress: 100, status: 'Done' });
               if(source) source.stop();
               audioContext.close();
          };

          recorder.start();
          if (source) source.start(0);
          
          const startTime = performance.now();
          const duration = exportDuration === 'loop' ? 15 : Math.min(audioDuration, 60); // Max 60s for safety
          const totalMs = duration * 1000;
          
          // EXPORT PHYSICS
          const physics = {
              zoom: 1.0, shake: {x:0, y:0}, pan: {x:0, y:0}, rot: 0,
              tiltX: 0, tiltY: 0, 
              lastBeat: 0, lastSnare: 0,
              targetPose: 'base',
              tear: 0, moire: 0,
              dolly: 0,
              beatsSinceStutter: 0,
              beatCounter: 0,
              barCounter: 0,
              pattern: 'ABAB' as PatternType,
          };
          
          let exportStutterBeats = 9999;
          if (stutterDensity > 0) {
            exportStutterBeats = Math.max(2, Math.round(32 - (stutterDensity / 100) * 30));
          }

          const drawFrame = () => {
               if (renderAbortController.current?.signal.aborted) {
                   recorder.stop();
                   return;
               }

               const now = performance.now();
               const elapsed = now - startTime;
               
               if (elapsed >= totalMs) {
                   recorder.stop();
                   return;
               }

               setRenderJob(prev => ({ ...prev, progress: Math.floor((elapsed/totalMs)*100), status: 'Recording...' }));

               // -- LOGIC --
               const freq = new Uint8Array(exportAnalyser.frequencyBinCount);
               exportAnalyser.getByteFrequencyData(freq);
               
               // EXACT MATCH of Live Preview Logic
               // Bins 2-6: 86 - 258Hz (Punchy Kick Fundamental) - Main Beat Driver
               const bass = freq.slice(2, 7).reduce((a,b)=>a+b,0) / 5 / 255;
               const subBass = freq.slice(0, 3).reduce((a,b)=>a+b,0) / 3 / 255;
               const snare = freq.slice(40, 90).reduce((a,b)=>a+b,0) / 50 / 255;
               const hat = freq.slice(200, 400).reduce((a,b)=>a+b,0) / 200 / 255;

               // EXPORT BEAT LOGIC (Synchronized with Preview)
               // 250ms debounce
               if (bass > 0.65 && now - physics.lastBeat > 250) { 
                    physics.lastBeat = now;
                    physics.beatsSinceStutter++;
                    physics.beatCounter = (physics.beatCounter + 1) % 4;
                    
                    if (physics.beatCounter === 0) {
                        physics.barCounter++;
                        if (physics.barCounter % 4 === 0) {
                            const patterns: PatternType[] = ['ABAB', 'AABB', 'ABAC'];
                            physics.pattern = patterns[Math.floor(Math.random() * patterns.length)];
                        }
                    }

                    const seq = PATTERNS[physics.pattern];
                    const type = seq[physics.beatCounter];

                    let pool = framesByEnergy.low;
                    if(type==='A') pool = framesByEnergy.low.length > 0 ? framesByEnergy.low : framesByEnergy.mid;
                    else if(type==='B') pool = framesByEnergy.mid.length > 0 ? framesByEnergy.mid : framesByEnergy.high;
                    else if(type==='C') pool = framesByEnergy.high;
                    
                    if(pool.length === 0) pool = framesByEnergy.low;
                    
                    const possible = pool.filter(p => p !== physics.targetPose);
                    physics.targetPose = possible.length > 0 
                        ? possible[Math.floor(Math.random() * possible.length)]
                        : pool[Math.floor(Math.random() * pool.length)];

                    physics.shake = { x: (Math.random()-0.5)*15, y: (Math.random()-0.5)*15 };
                    
                    // EXPORT PUSH PHYSICS (KICK)
                    physics.zoom = state.superMode ? 1.15 : 1.08;
                    physics.tiltX = state.superMode ? 20 : 15;
               }
               
               // EXPORT SNARE LOGIC
               if (snare > 0.50 && now - physics.lastSnare > 250) {
                   physics.lastSnare = now;
                   const pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
                   if (pool.length > 0) physics.targetPose = pool[Math.floor(Math.random() * pool.length)];
                   
                   // EXPORT PULL PHYSICS (SNARE)
                   physics.zoom = state.superMode ? 0.90 : 0.95; // Contract
                   physics.tiltX = -15; // Look up
                   physics.tear = 0.8;
               }

               // STUTTER
               if (snare > 0.6 && physics.beatsSinceStutter >= exportStutterBeats) {
                    physics.beatsSinceStutter = 0;
                    if (stutterPreset === 'shiver' || stutterPreset === 'auto') physics.pan.x = 50;
                    if (stutterPreset === 'jump') physics.pan.y = 50;
                    if (stutterPreset === 'smash') physics.zoom = 1.4;
                    if (stutterPreset === 'slice') physics.tear = 1.0;
               }
               
               const dt = 1/exportFps;
               const decaySpeed = state.superMode ? 14 : 10;
               const decay = 1 - Math.exp(-decaySpeed * dt);
               
               physics.shake.x *= decay; physics.shake.y *= decay;
               physics.pan.x *= decay; physics.pan.y *= decay;
               
               // Decay back to 1.0
               physics.zoom += (1.0 - physics.zoom) * decay;
               
               physics.tiltX *= decay; physics.tiltY *= decay;
               physics.tear *= 0.8;

               viz.updateAudio({ bass: subBass, mid: snare, high: hat, energy: subBass+snare });
               viz.render(-(physics.dolly * 1.5));
               ctx.drawImage(bgCanvas, 0, 0);
               
               const img = poseImagesRef.current[physics.targetPose] || poseImagesRef.current['base'];
               if (img && ctx) {
                   const cx = width/2 + physics.shake.x + physics.pan.x;
                   const cy = height/2 + physics.shake.y + physics.pan.y;
                   const scale = physics.zoom;
                   
                   ctx.save();
                   ctx.translate(cx, cy);
                   const scaleY = Math.cos(physics.tiltY * Math.PI / 180);
                   const scaleX = Math.cos(physics.tiltX * Math.PI / 180);
                   ctx.scale(scale * scaleY, scale * scaleX);
                   
                   const aspect = img.width / img.height;
                   let dw = width * 0.9;
                   let dh = dw / aspect;
                   if (dh > height * 0.9) { dh = height * 0.9; dw = dh * aspect; }
                   
                   if (physics.tear > 0.1) {
                        const slices = 10;
                        const sh = dh/slices;
                        const ish = img.height/slices;
                        for(let i=0; i<slices; i++) {
                            const shift = (Math.random()-0.5)*50*physics.tear;
                            ctx.drawImage(img, 0, i*ish, img.width, ish, -dw/2+shift, -dh/2+(i*sh), dw, sh);
                        }
                   } else {
                       ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
                   }
                   ctx.restore();
               }

               requestAnimationFrame(drawFrame);
          };
          drawFrame();

      } catch (e) {
          console.error(e);
          setRenderJob({ active: false, progress: 0, status: 'Error' });
          alert("Export failed: " + e);
      }
  }, [imagesReady, exportResolution, exportFps, exportBitrate, exportDuration, state.audioFile, framesByEnergy, state.selectedStyleId, stutterDensity, stutterPreset, state.superMode]);

  const handleExportPlayer = () => {
      const style = STYLE_PRESETS.find(s => s.id === state.selectedStyleId);
      const framesToExport = state.generatedFrames.length > 0 
          ? state.generatedFrames 
          : [{ url: state.imagePreviewUrl || '', pose: 'base', energy: 'low' as EnergyLevel, type: 'body' as const }];

      const html = generatePlayerHTML(
          framesToExport, 
          style?.hologramParams || {}, 
          state.subjectCategory
      );
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'My_DNCER_Rig.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full relative" ref={containerRef}>
      
      {/* TOOLBAR */}
      {!isZenMode && (
          <div className="flex flex-col xl:flex-row items-center justify-between p-4 bg-black/80 border-b border-white/10 backdrop-blur-xl z-20 gap-4">
             
             {/* LEFT: SOURCES */}
             <div className="flex items-center gap-3 w-full xl:w-auto justify-center bg-white/5 p-2 rounded-xl border border-white/5">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden md:block">INPUT</span>
                 <button 
                    onClick={toggleMic}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-xs ${isMicActive ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                 >
                     {isMicActive ? <><MicOff size={16} /> LIVE MIC ACTIVE</> : <><Mic size={16} /> ENABLE MIC</>}
                 </button>
                 <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-xs"
                 >
                     <Upload size={16} /> CHANGE SONG
                 </button>
                 <input type="file" ref={audioInputRef} onChange={(e) => { if(e.target.files?.[0]) onUploadAudio(e.target.files[0]) }} className="hidden" accept="audio/*"/>
             </div>

             {/* CENTER: PLAYBACK */}
             <div className="flex items-center gap-4 w-full xl:w-auto justify-center">
                 <button 
                    onClick={togglePlay} 
                    className={`
                        px-10 py-3 rounded-full font-black text-white shadow-lg transition-transform hover:scale-105 flex items-center gap-3 tracking-wider
                        ${isPlaying ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-brand-600 hover:bg-brand-500'}
                    `}
                 >
                     {isPlaying ? <><Pause size={24} fill="currentColor" /> PAUSE STREAM</> : <><Play size={24} fill="currentColor" /> START PLAYBACK</>}
                 </button>
                 
                 <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-full hover:bg-white/10 transition-all ${showSettings ? 'bg-white/10 text-white' : 'text-gray-400'}`}
                    title="Motion & Physics"
                 >
                     <Sliders size={20} />
                 </button>
                 <button onClick={() => setIsZenMode(true)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-full" title="Zen Mode">
                     <Maximize2 size={20} />
                 </button>
             </div>

             {/* RIGHT: EXPORT STATION */}
             <div className="flex items-center gap-3 w-full xl:w-auto justify-center bg-black/40 p-2 rounded-xl border border-white/10">
                 
                 {/* DOWNLOAD VIDEO */}
                 <button 
                    onClick={startBackgroundRender}
                    disabled={renderJob.active}
                    className={`
                        px-6 py-2.5 rounded-lg font-black flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105 border border-brand-500/20
                        ${renderJob.active ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:brightness-110'}
                    `}
                 >
                     {renderJob.active ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                     DOWNLOAD VIDEO
                 </button>

                 {/* SETTINGS TOGGLE */}
                 <div className="relative">
                    <button 
                        onClick={() => setShowAdvancedExport(!showAdvancedExport)} 
                        className={`px-3 py-2.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors flex items-center gap-2 text-xs font-bold border border-transparent hover:border-white/10 ${showAdvancedExport ? 'bg-white/10 text-white' : ''}`}
                    >
                        <Settings size={14} /> OPTIONS
                    </button>
                    
                    {/* DROPDOWN MENU */}
                    {showAdvancedExport && (
                         <div className="absolute top-full right-0 mt-3 w-72 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl p-5 shadow-2xl z-50 animate-fade-in">
                             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                <h4 className="text-white text-xs font-bold flex items-center gap-2"><FileVideo size={14}/> FORMAT SETTINGS</h4>
                                <button onClick={() => setShowAdvancedExport(false)}><X size={14} className="text-gray-400 hover:text-white"/></button>
                             </div>
                             
                             <div className="space-y-4">
                                 {/* DURATION */}
                                 <div>
                                     <label className="text-[10px] text-gray-400 font-bold block mb-1.5 uppercase">Output Duration</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         <button onClick={() => setExportDuration('loop')} className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${exportDuration==='loop'?'bg-brand-500/20 border-brand-500 text-white':'border-white/10 text-gray-400 hover:bg-white/5'}`}>15s LOOP</button>
                                         <button onClick={() => setExportDuration('full')} className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${exportDuration==='full'?'bg-brand-500/20 border-brand-500 text-white':'border-white/10 text-gray-400 hover:bg-white/5'}`}>FULL SONG</button>
                                     </div>
                                 </div>
                                 
                                 {/* RESOLUTION */}
                                 <div>
                                     <label className="text-[10px] text-gray-400 font-bold block mb-1.5 uppercase">Resolution</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         {['720p', '1080p', '4k', 'portrait'].map(res => (
                                             <button 
                                                key={res}
                                                onClick={() => setExportResolution(res as any)}
                                                className={`py-1.5 text-[10px] font-bold rounded border transition-all uppercase ${exportResolution===res ? 'bg-brand-500/20 border-brand-500 text-white' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}
                                             >
                                                 {res}
                                             </button>
                                         ))}
                                     </div>
                                 </div>

                                 {/* FPS */}
                                 <div>
                                     <label className="text-[10px] text-gray-400 font-bold block mb-1.5 uppercase">Frame Rate</label>
                                     <div className="flex bg-white/5 rounded-lg p-1">
                                         {[24, 30, 60].map(fps => (
                                             <button key={fps} onClick={() => setExportFps(fps as any)} className={`flex-1 py-1 text-[10px] font-bold rounded ${exportFps===fps?'bg-brand-600 text-white shadow-md':'text-gray-400 hover:text-white'}`}>{fps} FPS</button>
                                         ))}
                                     </div>
                                 </div>

                                 {/* BITRATE */}
                                 <div>
                                     <div className="flex justify-between mb-1">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase">Quality (Bitrate)</label>
                                        <span className="text-[10px] text-brand-300 font-mono">{(exportBitrate/1000000).toFixed(1)} Mbps</span>
                                     </div>
                                     <input 
                                        type="range" min="1000000" max="20000000" step="1000000" 
                                        value={exportBitrate} 
                                        onChange={(e) => setExportBitrate(Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-500"
                                     />
                                 </div>
                             </div>
                         </div>
                     )}
                 </div>

                 {/* STANDALONE PLAYER */}
                <button 
                    onClick={handleExportPlayer}
                    className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-brand-300 transition-all border border-white/10 hover:border-brand-500/30 flex items-center gap-2 text-xs font-bold"
                    title="Download offline HTML player"
                 >
                     <Package size={16} /> SAVE WIDGET
                 </button>
             </div>
          </div>
      )}

      {/* VIEWPORT */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
          <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />
          
          <div className="relative z-10 w-full max-w-2xl aspect-[9/16] pointer-events-none flex items-center justify-center">
              <canvas ref={charCanvasRef} className="w-full h-full" />
          </div>
          
          {isZenMode && (
              <button 
                onClick={() => setIsZenMode(false)}
                className="absolute top-4 right-4 z-50 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
              >
                  <Minimize2 size={24} />
              </button>
          )}

          {!isZenMode && showSettings && (
              <div className="absolute top-20 right-4 z-40 w-72 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl animate-slide-in-right">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <h4 className="text-white font-bold flex items-center gap-2"><Sliders size={18}/> PHYSICS & LOGIC</h4>
                      <button onClick={() => setShowSettings(false)}><X size={18} className="text-gray-400 hover:text-white"/></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="text-xs text-gray-400 font-bold mb-2 block">MOTION SMOOTHNESS</label>
                          <input type="range" min="0" max="200" value={smoothness} onChange={(e) => setSmoothness(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"/>
                      </div>
                      
                      {/* PREVIEW STUTTER CONTROLS */}
                      <div className="p-3 bg-white/5 rounded-xl">
                          <label className="text-xs text-gray-400 font-bold mb-2 flex justify-between">
                              <span>STUTTER RHYTHM</span>
                              <span className="text-red-400 font-mono">{stutterDensity}%</span>
                          </label>
                          <input type="range" min="0" max="100" value={stutterDensity} onChange={(e) => setStutterDensity(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500 mb-3"/>
                          
                          <label className="text-xs text-gray-400 font-bold mb-2 block">STYLE</label>
                          <div className="grid grid-cols-2 gap-2">
                             {['auto', 'shiver', 'jump', 'smash'].map(s => (
                                 <button 
                                    key={s} 
                                    onClick={() => setStutterPreset(s as any)}
                                    className={`text-[10px] font-bold py-1 rounded border ${stutterPreset===s ? 'bg-red-500/20 border-red-500 text-white' : 'border-white/10 text-gray-500'}`}
                                 >
                                     {s.toUpperCase()}
                                 </button>
                             ))}
                          </div>
                      </div>
                      
                      {state.superMode && (
                        <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg">
                            <h5 className="text-brand-300 font-bold text-xs flex items-center gap-2 mb-1"><Star size={10} /> SUPER MODE ACTIVE</h5>
                            <p className="text-[10px] text-gray-400">Lip Sync & Triplets enabled.</p>
                        </div>
                      )}

                      <div className="pt-4 border-t border-white/10">
                           <button onClick={onSaveProject} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 border border-white/10">
                               <Music size={14} /> SAVE PROJECT FILE
                           </button>
                      </div>
                  </div>
              </div>
          )}

          {!isZenMode && (
              <div className="absolute bottom-4 left-4 z-30 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs font-mono space-y-1">
                      <div className="flex items-center gap-2 text-brand-300 font-bold">
                          <Activity size={12} /> {brainState.activePoseName}
                      </div>
                      <div className="text-gray-400">{brainState.intention}</div>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-600">BAR {barCounterRef.current % 4 + 1}</span>
                          <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 transition-all duration-100" style={{ width: `${brainState.confidence}%` }} />
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
      
      {/* EXPORT PROGRESS TOAST */}
      {renderJob.active && (
          <div className="absolute bottom-6 right-6 z-50 bg-gray-900/95 backdrop-blur-xl border border-brand-500/30 p-5 rounded-2xl shadow-2xl flex items-center gap-5 animate-slide-in-right max-w-sm">
              <div className="relative">
                  <div className="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
                  <Loader2 size={32} className="text-brand-400 animate-spin relative z-10" />
              </div>
              <div className="flex-1 min-w-[200px]">
                  <h4 className="text-white font-bold text-sm mb-1 flex justify-between">
                      <span>RENDERING VIDEO</span>
                      <span className="text-brand-300">{renderJob.progress}%</span>
                  </h4>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${renderJob.progress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 font-mono">{renderJob.status}</p>
              </div>
              <button 
                onClick={() => { renderAbortController.current?.abort(); setRenderJob({ active: false, progress: 0, status: 'Cancelled' }); }}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                  <X size={18} />
              </button>
          </div>
      )}
    </div>
  );
};
