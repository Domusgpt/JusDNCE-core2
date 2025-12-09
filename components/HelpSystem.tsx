/**
 * HelpSystem.tsx - UFO Helper Widgets
 * A Paul Phillips Manifestation
 *
 * Floating UFO-style help widgets:
 * - "Don't Panic" UFO - general help, floats around
 * - "Boogie Breakdown" UFO - Director page specific
 * - Smart guidance for users who need clear directions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft, Sparkles, Zap, Download, Play, Upload, Music, Palette, Settings, Star, Crown, ArrowUp, MousePointer } from 'lucide-react';

// ============================================
// TYPES
// ============================================

type HelpStep = 1 | 2 | 3 | 4;

interface HelpContent {
  title: string;
  subtitle: string;
  sections: {
    heading: string;
    icon: React.ReactNode;
    content: string;
    tip?: string;
  }[];
  upsell?: {
    title: string;
    features: string[];
  };
}

// ============================================
// HELP CONTENT PER STEP
// ============================================

const HELP_CONTENT: Record<HelpStep, HelpContent> = {
  1: {
    title: "Let's Get You Dancing!",
    subtitle: "Upload Any Image",
    sections: [
      {
        heading: "Drop Your Image Here",
        icon: <Upload className="w-5 h-5" />,
        content: "Any picture works! A photo, a drawing, a logo, text - we'll make it dance to your music.",
        tip: "Pictures with a clear subject on a dark background work best!"
      },
      {
        heading: "What Can Dance?",
        icon: <Star className="w-5 h-5" />,
        content: "Characters with arms and legs dance the best. Logos and text will pulse and glitch to the beat. Anything works - try it!",
      },
      {
        heading: "It's Easy!",
        icon: <Zap className="w-5 h-5" />,
        content: "Just drag your picture into the box, or tap to browse. That's it! We handle everything else.",
      }
    ]
  },
  2: {
    title: "Pick a Look",
    subtitle: "Choose Your Style",
    sections: [
      {
        heading: "Styles Change Everything",
        icon: <Palette className="w-5 h-5" />,
        content: "Each style transforms your image differently. Neon adds glow, Anime adds cartoon effects, Glitch adds distortion.",
        tip: "'Cinematic Realism' keeps your picture looking the same - great for photos!"
      },
      {
        heading: "Try Different Styles",
        icon: <Sparkles className="w-5 h-5" />,
        content: "Don't like one? Try another! There's Cinematic (movie looks), Anime (cartoon), Digital (effects), and Artistic (painted).",
      }
    ]
  },
  3: {
    title: "The Boogie Breakdown",
    subtitle: "Control the Dance",
    sections: [
      {
        heading: "Quality Levels",
        icon: <Zap className="w-5 h-5" />,
        content: "TURBO = Fast & cheap (1 credit). QUALITY = Better moves (2 credits). SUPER MODE = Premium choreography (4 credits).",
        tip: "Quality mode is the best balance - smoother moves, good price."
      },
      {
        heading: "Motion Controls",
        icon: <Play className="w-5 h-5" />,
        content: "Smoothness = How fluid the dance is. Stutter = How much it snaps to the beat. Play with these!",
      },
      {
        heading: "Super Mode Extras",
        icon: <Crown className="w-5 h-5" />,
        content: "Super Mode unlocks special choreography: Triplet Flow, Character Spin, Slow-Mo Impact, and more!",
      }
    ],
    upsell: {
      title: "Go Pro - $8/month",
      features: [
        "No watermarks on videos",
        "2 free credits every day",
        "Unlimited re-exports",
        "Priority queue (faster!)",
        "No ads"
      ]
    }
  },
  4: {
    title: "Your Dance is Ready!",
    subtitle: "Download & Share",
    sections: [
      {
        heading: "Download Your Video",
        icon: <Download className="w-5 h-5" />,
        content: "Choose how long: 15 seconds (great for TikTok!), 30 seconds, 1 minute, or the full song.",
        tip: "15 second clips are perfect for social media!"
      },
      {
        heading: "What Does It Cost?",
        icon: <Star className="w-5 h-5" />,
        content: "Short clips = 1 credit. Full song = 2 credits. Remove watermark = double the cost (or free with Pro!).",
      },
      {
        heading: "Use It Again!",
        icon: <Music className="w-5 h-5" />,
        content: "Same dance moves, different song? Re-export is only 1 credit. Your dancer works with any music!",
      }
    ]
  }
};

// ============================================
// UFO FLOATING WIDGET - "DON'T PANIC"
// ============================================

interface UFOWidgetProps {
  onClick: () => void;
  label: string;
  isHighlighted?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  variant?: 'help' | 'boogie';
}

export const UFOWidget: React.FC<UFOWidgetProps> = ({
  onClick,
  label,
  isHighlighted = false,
  position = 'bottom-right',
  variant = 'help'
}) => {
  const [bobOffset, setBobOffset] = useState(0);
  const [wobble, setWobble] = useState(0);

  // Floating animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBobOffset(Math.sin(Date.now() / 800) * 8);
      setWobble(Math.sin(Date.now() / 600) * 3);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const positionClass = position === 'bottom-right'
    ? 'right-4 md:right-6'
    : 'left-4 md:left-6';

  const gradients = variant === 'help'
    ? 'from-cyan-400 via-purple-500 to-pink-500'
    : 'from-yellow-400 via-orange-500 to-red-500';

  const glowColor = variant === 'help'
    ? 'rgba(139, 92, 246, 0.6)'
    : 'rgba(251, 146, 60, 0.6)';

  return (
    <button
      onClick={onClick}
      className={`
        fixed ${positionClass} z-[60]
        group flex flex-col items-center
        transition-all duration-300
        hover:scale-110
        ${isHighlighted ? 'animate-pulse' : ''}
      `}
      style={{
        bottom: `${24 + bobOffset}px`,
        transform: `rotate(${wobble}deg)`,
      }}
    >
      {/* UFO Body */}
      <div
        className={`
          relative w-20 h-10 md:w-24 md:h-12
          bg-gradient-to-r ${gradients}
          rounded-full
          shadow-2xl
          flex items-center justify-center
          border-2 border-white/30
        `}
        style={{
          boxShadow: `0 10px 40px ${glowColor}, 0 0 60px ${glowColor}`,
        }}
      >
        {/* UFO Dome */}
        <div className="absolute -top-4 md:-top-5 w-10 h-6 md:w-12 md:h-7 bg-white/20 backdrop-blur-sm rounded-t-full border border-white/30" />

        {/* UFO Lights */}
        <div className="absolute bottom-1 flex gap-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
        </div>

        {/* Help Icon */}
        <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" />
      </div>

      {/* Beam Effect */}
      <div
        className="w-16 md:w-20 h-8 md:h-10 bg-gradient-to-b from-white/40 to-transparent rounded-b-full -mt-1 opacity-60 group-hover:opacity-100 transition-opacity"
        style={{
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)'
        }}
      />

      {/* Label */}
      <span
        className={`
          mt-1 px-3 py-1
          bg-black/80 backdrop-blur-sm
          rounded-full
          text-xs md:text-sm font-black text-white
          border border-white/20
          whitespace-nowrap
        `}
        style={{ fontFamily: 'Rajdhani, sans-serif' }}
      >
        {label}
      </span>
    </button>
  );
};

// ============================================
// SMART UPLOAD GUIDE - Shows when no image
// ============================================

interface SmartUploadGuideProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const SmartUploadGuide: React.FC<SmartUploadGuideProps> = ({ isVisible, onDismiss }) => {
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setPulseIntensity(Math.sin(Date.now() / 500) * 0.5 + 0.5);
    }, 50);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Pulsing highlight around upload area - positioned roughly */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-60 md:w-96 md:h-72 rounded-3xl pointer-events-none"
        style={{
          boxShadow: `0 0 ${40 + pulseIntensity * 40}px ${20 + pulseIntensity * 20}px rgba(139, 92, 246, ${0.3 + pulseIntensity * 0.3})`,
          border: `3px solid rgba(139, 92, 246, ${0.5 + pulseIntensity * 0.5})`,
        }}
      />

      {/* Big Friendly Arrow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce pointer-events-auto">
        <div className="bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-4 rounded-2xl shadow-2xl border-2 border-white/30">
          <p className="text-white text-lg md:text-xl font-black text-center" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            TAP HERE TO START!
          </p>
          <p className="text-white/80 text-sm text-center mt-1">
            Drop an image or tap to browse
          </p>
        </div>
        <ArrowUp className="w-12 h-12 text-purple-400 mt-2 rotate-180" />
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white/60 rounded-full text-sm hover:text-white transition-colors pointer-events-auto"
      >
        I got it, thanks!
      </button>
    </div>
  );
};

// ============================================
// HELP MODAL
// ============================================

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: HelpStep;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, currentStep }) => {
  const [activeSection, setActiveSection] = useState(0);
  const content = HELP_CONTENT[currentStep];

  useEffect(() => {
    setActiveSection(0);
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const nextSection = () => {
    if (activeSection < content.sections.length - 1) {
      setActiveSection(prev => prev + 1);
    }
  };

  const prevSection = () => {
    if (activeSection > 0) {
      setActiveSection(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2
            className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            {content.title}
          </h2>
          <p className="text-white/60 mt-1 text-lg">{content.subtitle}</p>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step === currentStep
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-400'
                    : step < currentStep
                      ? 'bg-white/40'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[45vh]">
          {/* Section Navigation */}
          {content.sections.length > 1 && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevSection}
                disabled={activeSection === 0}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-2">
                {content.sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSection(idx)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      idx === activeSection ? 'bg-cyan-400' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextSection}
                disabled={activeSection === content.sections.length - 1}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Active Section */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30">
                {content.sections[activeSection].icon}
              </div>
              <h3 className="text-xl font-bold">{content.sections[activeSection].heading}</h3>
            </div>

            <p className="text-white/80 text-lg leading-relaxed">
              {content.sections[activeSection].content}
            </p>

            {content.sections[activeSection].tip && (
              <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <p className="text-cyan-300 flex items-start gap-2">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-base">{content.sections[activeSection].tip}</span>
                </p>
              </div>
            )}
          </div>

          {/* Upsell Section */}
          {content.upsell && (
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h4 className="font-bold text-lg text-yellow-300">{content.upsell.title}</h4>
              </div>
              <ul className="space-y-2">
                {content.upsell.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-white/80">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/30">
          <span className="text-white/40 text-sm">
            Step {currentStep} of 4
          </span>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 font-black text-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// INTRO ANIMATION - jusDNCE Branding
// ============================================

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'logo' | 'tagline' | 'fade'>('logo');
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    setTimeout(() => setOpacity(1), 100);

    // Show tagline
    setTimeout(() => setPhase('tagline'), 1500);

    // Start fade out
    setTimeout(() => setPhase('fade'), 3500);

    // Complete
    setTimeout(() => {
      setOpacity(0);
      setTimeout(onComplete, 500);
    }, 4500);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-500"
      style={{ opacity }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-black to-cyan-900/50" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-500/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative text-center z-10">
        {/* Logo */}
        <h1
          className={`text-6xl md:text-8xl font-black tracking-tighter transition-all duration-1000 ${
            phase === 'logo' ? 'scale-100 opacity-100' : 'scale-95 opacity-90'
          }`}
          style={{
            fontFamily: 'Rajdhani, sans-serif',
          }}
        >
          <span className="text-white italic">jus</span>
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            DNCE
          </span>
        </h1>

        {/* Tagline */}
        <p className={`mt-4 text-xl md:text-2xl text-white/70 transition-all duration-500 ${
          phase === 'tagline' || phase === 'fade' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          Make anything dance to any music
        </p>

        {/* UFO hint */}
        <div className={`mt-8 flex items-center justify-center gap-2 transition-all duration-500 ${
          phase === 'tagline' || phase === 'fade' ? 'opacity-100' : 'opacity-0'
        }`}>
          <HelpCircle className="w-5 h-5 text-cyan-400" />
          <span className="text-white/50 text-sm">Need help? Look for the floating UFO!</span>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 text-white/40 hover:text-white/80 transition-colors text-lg"
      >
        Skip →
      </button>
    </div>
  );
};

// ============================================
// GENERATION COMPLETE POPUP
// ============================================

interface GenerationPopupProps {
  isVisible: boolean;
  onClose: () => void;
  type: 'audition' | 'reexport';
}

export const GenerationCompletePopup: React.FC<GenerationPopupProps> = ({ isVisible, onClose, type }) => {
  if (!isVisible) return null;

  const messages = {
    audition: {
      title: "Your Dance is Ready!",
      subtitle: "Download it and share with the world!",
      icon: <Sparkles className="w-8 h-8 text-cyan-400" />
    },
    reexport: {
      title: "New Song, Same Moves!",
      subtitle: "Your dancer killed it again!",
      icon: <Music className="w-8 h-8 text-pink-400" />
    }
  };

  const msg = messages[type];

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[80] animate-bounce-in">
      <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border-2 border-white/30 backdrop-blur-xl shadow-2xl">
        {msg.icon}
        <div>
          <h3 className="font-black text-xl">{msg.title}</h3>
          <p className="text-white/70">{msg.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============================================
// TOOLTIP COMPONENT
// ============================================

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute ${positionClasses[position]} z-50 px-4 py-2 text-sm text-white bg-black/95 rounded-xl border border-white/20 whitespace-nowrap pointer-events-none shadow-xl`}>
          {content}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN HELP SYSTEM HOOK
// ============================================

export const useHelpSystem = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [showGenerationPopup, setShowGenerationPopup] = useState(false);
  const [popupType, setPopupType] = useState<'audition' | 'reexport'>('audition');

  // Check for first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('jusdnce_hasVisited');
    if (!hasVisited) {
      setShowIntro(true);
    }
  }, []);

  const completeIntro = useCallback(() => {
    setShowIntro(false);
    setIsHighlighted(true);
    setShowUploadGuide(true); // Show upload guide after intro
    localStorage.setItem('jusdnce_hasVisited', 'true');

    // Remove highlight after 3 seconds
    setTimeout(() => setIsHighlighted(false), 3000);
  }, []);

  const dismissUploadGuide = useCallback(() => {
    setShowUploadGuide(false);
  }, []);

  const openHelp = useCallback(() => {
    setIsHelpOpen(true);
    setShowUploadGuide(false);
  }, []);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const showAuditionComplete = useCallback(() => {
    setPopupType('audition');
    setShowGenerationPopup(true);
    setTimeout(() => setShowGenerationPopup(false), 5000);
  }, []);

  const showReexportComplete = useCallback(() => {
    setPopupType('reexport');
    setShowGenerationPopup(true);
    setTimeout(() => setShowGenerationPopup(false), 5000);
  }, []);

  const resetIntro = useCallback(() => {
    localStorage.removeItem('jusdnce_hasVisited');
    setShowIntro(true);
  }, []);

  // Hide upload guide when image is uploaded
  const onImageUploaded = useCallback(() => {
    setShowUploadGuide(false);
  }, []);

  return {
    isHelpOpen,
    isHighlighted,
    showIntro,
    showUploadGuide,
    showGenerationPopup,
    popupType,
    openHelp,
    closeHelp,
    completeIntro,
    dismissUploadGuide,
    showAuditionComplete,
    showReexportComplete,
    resetIntro,
    onImageUploaded
  };
};

// Legacy exports for backward compatibility
export const DontPanicButton = UFOWidget;

export default {
  UFOWidget,
  SmartUploadGuide,
  HelpModal,
  IntroAnimation,
  Tooltip,
  GenerationCompletePopup,
  useHelpSystem
};
