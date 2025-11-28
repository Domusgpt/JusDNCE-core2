

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

export const Step4Preview_Archive_V2: React.FC<Step4Props> = ({ state, onGenerateMore, onSpendCredit, onUploadAudio, onSaveProject }) => {
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
  const lastBeatTimeRef = useRef<number>(0);
  const lastFrameUpdateRef = useRef<number>(0); 
  const poseHistoryRef = useRef<string[]>([]); // New: History buffer for smart selection
  
  // Stutter Interval System
  const beatsSinceLastStutterRef = useRef<number>(0);
  const stutterStyleRef = useRef<StutterMode>('auto');

  // Logic State
  const [brainState, setBrainState] = useState({
      intention: 'IDLE',
      nextDir: 'LEFT' as 'LEFT' | 'RIGHT' | 'HOLD',
      flowType: 'WAITING',
      confidence: 0,
      activePoseName: 'BASE',
  });

  // Interpolation & Burst State
  const targetPoseRef = useRef<string>('base'); 
  const burstModeUntilRef = useRef<number>(0);
  const lastMoveDirectionRef = useRef<'left' | 'right'>('right'); 
  
  // CHOREOGRAPHY PATTERN ENGINE
  const patternModeRef = useRef<'linear' | 'pingpong' | 'chaos'>('pingpong');
  const patternIndexRef = useRef<number>(0);
  
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
    
    // --- 1. Audio Analysis ---
    let bass = 0, mid = 0, high = 0;
    
    if (isPlaying && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        bass = dataArray.slice(0, 15).reduce((a,b)=>a+b,0) / 15 / 255;
        mid = dataArray.slice(15, 100).reduce((a,b)=>a+b,0) / 85 / 255;
        high = dataArray.slice(100, 300).reduce((a,b)=>a+b,0) / 200 / 255;
    } else if (isPlaying && !state.audioPreviewUrl && !isMicActive) {
        // Synthetic Clock (Techno)
        const bpm = 128;
        const beatDur = 60 / bpm;
        const now = time / 1000;
        const beatPos = (now % beatDur) / beatDur;
        bass = Math.pow(Math.max(0, 1 - beatPos * 4), 2); 
        mid = (now % (beatDur*2) > beatDur) && (beatPos < 0.2) ? 0.8 : 0; 
        high = Math.random() * 0.2;
    }

    // --- 2. Choreography Brain ---
    const now = time;
    const isBurst = now < burstModeUntilRef.current;
    const isTextSubject = state.subjectCategory === 'TEXT';
    
    const beatThreshold = 0.55; 
    const isBeatHit = bass > beatThreshold && (now - lastBeatTimeRef.current > 300); // 300ms debounce
    
    if (isPlaying) {
        // CARD TILT PHYSICS (2.5D Effect)
        // Bass tilts the card vertically (Headbang)
        const targetTiltX = isHardHit => isHardHit ? 20 : (bass * 10);
        // Pan/Mid tilts the card horizontally (Spin/Sway)
        const targetTiltY = Math.sin(now * 0.003) * 15 + (mid * 20 * (Math.random() > 0.5 ? 1 : -1));

        // Beat Detection & Frame Selection
        if (isBeatHit) {
            lastBeatTimeRef.current = now;
            beatsSinceLastStutterRef.current += 1; // Increment beat counter
            
            const isHardHit = bass > 0.8;
            
            if (!isBurst) {
                // CHOREOGRAPHY PATTERN SEQUENCER
                if (isHardHit) patternModeRef.current = 'chaos';
                else if (mid > 0.6) patternModeRef.current = 'linear';
                else patternModeRef.current = 'pingpong';

                let nextDir: 'left' | 'right' = lastMoveDirectionRef.current === 'left' ? 'right' : 'left';
                
                // Override dir based on pattern
                if (patternModeRef.current === 'pingpong') {
                    // Strict Alternating
                    nextDir = lastMoveDirectionRef.current === 'left' ? 'right' : 'left';
                } else if (patternModeRef.current === 'linear') {
                    // Stay on one side for a bit (build up)
                     patternIndexRef.current++;
                     if (patternIndexRef.current % 4 !== 0) nextDir = lastMoveDirectionRef.current;
                     else nextDir = lastMoveDirectionRef.current === 'left' ? 'right' : 'left';
                } else {
                    // Chaos
                    if (Math.random() < 0.5) nextDir = lastMoveDirectionRef.current;
                }

                // ENERGY MAPPING
                let pool: string[] = [];
                if (isHardHit) pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
                else pool = framesByEnergy.mid.length > 0 ? framesByEnergy.mid : framesByEnergy.low;
                
                if (pool.length === 0) pool = framesByEnergy.low;
                
                // SUPER MODE: Vocal / Face Check
                let forceFace = false;
                if (state.superMode && closeupFrames.length > 0 && mid > 0.6) {
                    if (Math.random() < 0.3) {
                         pool = closeupFrames;
                         forceFace = true;
                    }
                }

                // SMART SELECTION
                const directionalPool = pool.filter(p => p.toLowerCase().includes(nextDir));
                const finalPool = (directionalPool.length > 0 && !isTextSubject && !forceFace) ? directionalPool : pool;
                
                let potentialPoses = finalPool.filter(p => !poseHistoryRef.current.includes(p));
                if (potentialPoses.length === 0) potentialPoses = finalPool;
                
                const nextPose = potentialPoses[Math.floor(Math.random() * potentialPoses.length)] || targetPoseRef.current;
                
                poseHistoryRef.current.push(nextPose);
                if (poseHistoryRef.current.length > 5) poseHistoryRef.current.shift();

                if (nextPose && nextPose !== targetPoseRef.current) {
                    targetPoseRef.current = nextPose;
                    lastMoveDirectionRef.current = nextDir;
                    setBrainState(prev => ({ 
                        ...prev, 
                        intention: forceFace ? 'LIP SYNC' : patternModeRef.current.toUpperCase(),
                        nextDir: nextDir === 'left' ? 'RIGHT' : 'LEFT',
                        activePoseName: nextPose,
                        confidence: Math.round(bass * 100)
                    }));
                }
                
                // PHYSICS IMPULSE
                const shakeScalar = isTextSubject ? 8 : 25; 
                const effBass = Math.max(0, bass - 0.3);
                camShakeXRef.current = shakeScalar * effBass;
                camShakeYRef.current = shakeScalar * effBass;
                
                camZoomRef.current = isHardHit ? 1.25 : (1.0 + effBass * 0.15); 
                
                // Trigger 2.5D Tilt Impulse
                camTiltXRef.current = targetTiltX(isHardHit);
                camTiltYRef.current += (Math.random() - 0.5) * 30 * bass; // Add jitter to Y spin

                if (isHardHit) tearAmountRef.current = 1.0; 
                if (bass > 0.7) moireAmountRef.current = 1.0;
            }
        }
        
        // --- STUTTER SYSTEM (Rhythm Gated) ---
        // Stutter Density Slider (0-100) Maps to Beats Interval
        // 100 = 2 beats (Crazy), 50 = 8 beats (Periodic), 0 = Infinity (Never)
        let stutterIntervalBeats = 9999;
        if (stutterDensity > 0) {
            // Map 1-100 to range 32 down to 2 beats
            stutterIntervalBeats = Math.max(2, Math.round(32 - (stutterDensity / 100) * 30)); 
        }

        // TRIGGER STUTTER
        if (mid > 0.6 && beatsSinceLastStutterRef.current >= stutterIntervalBeats && !isBurst) {
            beatsSinceLastStutterRef.current = 0; // Reset counter
            burstModeUntilRef.current = now + 400; // 400ms burst
            
            // Choose Style
            let style: StutterMode = stutterPreset;
            if (style === 'auto') {
                const opts: StutterMode[] = ['shiver', 'jump', 'smash', 'slice'];
                style = opts[Math.floor(Math.random() * opts.length)];
            }
            stutterStyleRef.current = style;

            setBrainState(prev => ({ ...prev, intention: `STUTTER: ${style.toUpperCase()}`, flowType: 'STUTTER' }));
            ghostAmountRef.current = 1.0;
            
            // Apply Initial Physics based on style
            if (style === 'jump') camTiltXRef.current = -30;
            if (style === 'smash') camZoomRef.current = 1.4;
            if (style === 'slice') tearAmountRef.current = 1.0;
            if (style === 'shiver') camPanXRef.current = 50; 
        }

        // EXECUTE STUTTER BEHAVIOR
        if (isBurst) {
             const burstRate = 60; // 60ms updates
             
             if (now - lastFrameUpdateRef.current > burstRate) {
                lastFrameUpdateRef.current = now;
                const pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
                if(pool.length > 0) targetPoseRef.current = pool[Math.floor(Math.random() * pool.length)];
                
                // PHYSICS PER STYLE
                switch (stutterStyleRef.current) {
                    case 'shiver':
                        camPanXRef.current = (Math.random() - 0.5) * 150; // Violent lateral shake
                        camShakeXRef.current = 50;
                        break;
                    case 'jump':
                        camPanYRef.current = (Math.random() - 0.5) * 150; // Vertical bounce
                        camTiltXRef.current = (Math.random() - 0.5) * 40;
                        break;
                    case 'smash':
                        camZoomRef.current = Math.random() > 0.5 ? 1.3 : 0.9; // Fast zoom in/out
                        break;
                    case 'slice':
                        tearAmountRef.current = 1.0; // Max tear
                        camPanXRef.current = (Math.random() - 0.5) * 20;
                        break;
                    default:
                        camPanXRef.current = (Math.random() - 0.5) * 80;
                        camZoomRef.current = 1.1 + Math.random() * 0.15;
                }
            }
        }
    }

    // --- 3. Render Visualizer ---
    if (hologramRef.current) {
        hologramRef.current.updateAudio({ bass, mid, high, energy: bass+mid });
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
                
                // 2.5D CARD TILT SIMULATION (Using Scale + Rotate)
                // Rotate Z (Tilt Head)
                charCtx.rotate(((camRotationRef.current + rotationOffset) * Math.PI) / 180);
                
                // Simulate 3D Y-Rotation (Card Flip) by squashing width
                const tiltYRad = (camTiltYRef.current * Math.PI) / 180;
                const scaleY3D = Math.abs(Math.cos(tiltYRad)); 
                // Simulate 3D X-Rotation (Lean Forward/Back)
                const tiltXRad = (camTiltXRef.current * Math.PI) / 180;
                const scaleX3D = Math.abs(Math.cos(tiltXRad));

                // Apply Perspective Scale
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
                
                charCtx.save();
                charCtx.globalCompositeOperation = 'multiply';
                charCtx.fillStyle = 'rgba(0,0,0,0.5)';
                for(let i=0; i<ch; i+=4) {
                    charCtx.fillRect(0, i, cw, 1);
                }
                charCtx.restore();

            } else {
                drawChannel('normal', 0, 0, 0, 0);
            }
        }
    }
    
    // Physics & FX Decay
    const dt = 16.6 / 1000;
    const decay = 1 - Math.exp(-10 * dt); 
    const swayDecay = 1 - Math.exp(-2 * dt); // Slower decay for card spin
    
    camShakeXRef.current *= (1 - decay);
    camShakeYRef.current *= (1 - decay);
    camZoomRef.current = 1.0 + (camZoomRef.current - 1.0) * (1 - decay);
    camRotationRef.current *= (1 - decay);
    camPanXRef.current *= (1 - decay); // Reset pan after stutters
    camPanYRef.current *= (1 - decay);
    
    // Decay 2.5D Tilt
    camTiltXRef.current *= (1 - decay); 
    camTiltYRef.current *= (1 - swayDecay); // Continues spinning longer

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
      
      // Reset Abort Controller
      renderAbortController.current = new AbortController();
      setRenderJob({ active: true, progress: 0, status: 'Preparing Assets...' });
      
      try {
          // 1. SETUP EXPORT CANVAS
          const width = exportResolution === '4k' ? 3840 : exportResolution === '1080p' ? 1920 : 1280;
          const height = exportResolution === 'portrait' ? 1920 : (width * 9) / 16;
          
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ctx = exportCanvas.getContext('2d');
          
          if (!ctx) throw new Error("Could not create export canvas");

          // 2. SETUP OFFSCREEN VISUALIZER
          const bgCanvas = document.createElement('canvas');
          bgCanvas.width = width;
          bgCanvas.height = height;
          const viz = new QuantumVisualizer(bgCanvas);
          // Sync params
          if (hologramRef.current) viz.params = { ...hologramRef.current.params };

          // 3. SETUP AUDIO & RECORDER
          const stream = exportCanvas.captureStream(exportFps);
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = audioContext.createMediaStreamDestination();
          const exportAnalyser = audioContext.createAnalyser();
          exportAnalyser.fftSize = 1024;
          
          let source: AudioBufferSourceNode | null = null;
          let audioDuration = 15; // default loop

          if (state.audioFile) {
               const arrayBuffer = await state.audioFile.arrayBuffer();
               const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
               audioDuration = audioBuffer.duration;
               
               source = audioContext.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(dest);
               source.connect(exportAnalyser);
          } else {
               // Synthetic audio gen for export not fully supported in this snippet, defaulting to silent visualizer or mic
               // Ideally we warn user
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

          // 4. RENDER LOOP
          recorder.start();
          if (source) source.start(0);
          
          const startTime = performance.now();
          const duration = exportDuration === 'loop' ? 15 : Math.min(audioDuration, 60); // Max 60s for safety
          const totalMs = duration * 1000;
          
          // Physics State for Export (Separate from main preview)
          const physics = {
              zoom: 1.0, shake: {x:0, y:0}, pan: {x:0, y:0}, rot: 0,
              tiltX: 0, tiltY: 0, 
              lastBeat: 0, lastSnare: 0,
              targetPose: 'base',
              dir: 'right' as 'left' | 'right',
              tear: 0, moire: 0,
              dolly: 0,
              beatsSinceStutter: 0, // NEW: Export sync
          };
          
          // Determine Stutter Interval for Export
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
               // Get Audio
               const freq = new Uint8Array(exportAnalyser.frequencyBinCount);
               exportAnalyser.getByteFrequencyData(freq);
               const bass = freq.slice(0, 15).reduce((a,b)=>a+b,0) / 15 / 255;
               const mid = freq.slice(15, 100).reduce((a,b)=>a+b,0) / 85 / 255;
               const high = freq.slice(100, 300).reduce((a,b)=>a+b,0) / 200 / 255;

               // Step Physics
               if (bass > 0.6 && now - physics.lastBeat > 400) {
                    physics.lastBeat = now;
                    physics.beatsSinceStutter++;
                    
                    const isHard = bass > 0.8;
                    
                    // Select Pose
                    let pool = framesByEnergy.mid;
                    if (isHard) pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
                    else pool = framesByEnergy.mid.length > 0 ? framesByEnergy.mid : framesByEnergy.low;
                    
                    if (pool.length === 0) pool = framesByEnergy.low;
                    
                    // Simple logic for export
                    physics.dir = physics.dir === 'left' ? 'right' : 'left';
                    const dirPool = pool.filter(p => p.includes(physics.dir));
                    const finalPool = dirPool.length > 0 ? dirPool : pool;
                    physics.targetPose = finalPool[Math.floor(Math.random() * finalPool.length)] || 'base';

                    physics.shake = { x: (Math.random()-0.5)*30*bass, y: (Math.random()-0.5)*30*bass };
                    physics.zoom = isHard ? 1.2 : 1.05;
                    physics.tiltX = isHard ? 20 : 10;
                    physics.tiltY = (Math.random()-0.5)*30;
                    if(isHard) physics.tear = 1.0;
               }

               // STUTTER EXPORT LOGIC
               if (mid > 0.6 && physics.beatsSinceStutter >= exportStutterBeats) {
                    physics.beatsSinceStutter = 0;
                    // Apply preset style effects
                    if (stutterPreset === 'shiver' || stutterPreset === 'auto') physics.pan.x = 50;
                    if (stutterPreset === 'jump') physics.pan.y = 50;
                    if (stutterPreset === 'smash') physics.zoom = 1.4;
                    if (stutterPreset === 'slice') physics.tear = 1.0;
               }
               
               // Decay
               const dt = 1/exportFps; // Approx
               const decay = 0.9;
               physics.shake.x *= decay; physics.shake.y *= decay;
               physics.pan.x *= decay; physics.pan.y *= decay;
               physics.zoom += (1.0 - physics.zoom) * 0.1;
               physics.tiltX *= decay; physics.tiltY *= decay;
               physics.tear *= 0.8;

               // -- DRAW --
               // 1. BG
               viz.updateAudio({ bass, mid, high, energy: bass+mid });
               viz.render(-(physics.dolly * 1.5));
               ctx.drawImage(bgCanvas, 0, 0);
               
               // 2. Char
               const img = poseImagesRef.current[physics.targetPose] || poseImagesRef.current['base'];
               if (img && ctx) {
                   // Calculate transforms based on export resolution
                   const cx = width/2 + physics.shake.x + physics.pan.x;
                   const cy = height/2 + physics.shake.y + physics.pan.y;
                   const scale = physics.zoom;
                   
                   ctx.save();
                   ctx.translate(cx, cy);
                   // Apply tilts (simulated 2.5D)
                   const scaleY = Math.cos(physics.tiltY * Math.PI / 180);
                   const scaleX = Math.cos(physics.tiltX * Math.PI / 180);
                   ctx.scale(scale * scaleY, scale * scaleX);
                   
                   // Draw Image
                   const aspect = img.width / img.height;
                   let dw = width * 0.9;
                   let dh = dw / aspect;
                   if (dh > height * 0.9) { dh = height * 0.9; dw = dh * aspect; }
                   
                   // Draw
                   if (physics.tear > 0.1) {
                       // Tearing FX
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
  }, [imagesReady, exportResolution, exportFps, exportBitrate, exportDuration, state.audioFile, framesByEnergy, state.selectedStyleId, stutterDensity, stutterPreset]);

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
                          <span className={`transition-colors ${brainState.nextDir === 'LEFT' ? 'text-white' : 'text-gray-600'}`}>L</span>
                          <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 transition-all duration-100" style={{ width: `${brainState.confidence}%` }} />
                          </div>
                          <span className={`transition-colors ${brainState.nextDir === 'RIGHT' ? 'text-white' : 'text-gray-600'}`}>R</span>
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
