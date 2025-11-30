/**
 * jusDNCE Onboarding System
 * A Paul Phillips Manifestation
 *
 * Idle-triggered glassmorphic neon guidance windows
 * - 4s idle on first page triggers initial explainer
 * - 10s idle on inputs triggers contextual hints
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Music, Sparkles, ChevronRight, Mic } from 'lucide-react';

interface OnboardingTooltipProps {
  id: string;
  title: string;
  description: string;
  position: { top?: string; left?: string; right?: string; bottom?: string };
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  accentColor?: string;
  onDismiss: () => void;
  onSkipAll: () => void;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  title,
  description,
  position,
  arrowPosition = 'bottom',
  accentColor = 'brand',
  onDismiss,
  onSkipAll
}) => {
  const colorClasses = {
    brand: { border: 'border-brand-500/50', bg: 'bg-brand-500/20', text: 'text-brand-300', glow: 'shadow-brand-500/30' },
    cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/20', text: 'text-cyan-300', glow: 'shadow-cyan-500/30' },
    magenta: { border: 'border-pink-500/50', bg: 'bg-pink-500/20', text: 'text-pink-300', glow: 'shadow-pink-500/30' },
    yellow: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/20', text: 'text-yellow-300', glow: 'shadow-yellow-500/30' },
  };

  const colors = colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.brand;

  const arrowStyles = {
    top: 'before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-white/10',
    bottom: 'before:absolute before:-bottom-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-white/10',
    left: 'before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-white/10',
    right: 'before:absolute before:-right-2 before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-l-white/10',
  };

  return (
    <div
      className={`absolute z-50 animate-fade-in ${arrowStyles[arrowPosition]}`}
      style={position}
    >
      <div className={`
        relative max-w-xs p-4 rounded-2xl
        bg-black/80 backdrop-blur-xl
        border ${colors.border}
        shadow-2xl ${colors.glow}
      `}>
        {/* Neon glow effect */}
        <div className={`absolute inset-0 rounded-2xl ${colors.bg} blur-xl opacity-30 -z-10`} />

        {/* Content */}
        <div className="relative">
          <h4 className={`text-sm font-bold ${colors.text} mb-2 flex items-center gap-2`}>
            <Sparkles size={14} className="animate-pulse" />
            {title}
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed mb-4">
            {description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onSkipAll}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider"
            >
              Skip All
            </button>
            <button
              onClick={onDismiss}
              className={`
                px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                ${colors.bg} ${colors.text} border ${colors.border}
                hover:brightness-125 transition-all
                flex items-center gap-1
              `}
            >
              Got it <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute -top-2 -right-2 p-1.5 bg-black/80 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// First page explainer that appears over the audio upload area
const FirstPageExplainer: React.FC<{
  onDismiss: () => void;
  onSkipAll: () => void;
}> = ({ onDismiss, onSkipAll }) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-md animate-scale-in">
        <div className="
          relative p-6 rounded-3xl
          bg-black/90 backdrop-blur-xl
          border border-brand-500/40
          shadow-2xl shadow-brand-500/20
        ">
          {/* Neon glow layers */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-500/10 via-transparent to-pink-500/10 blur-xl -z-10" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-cyan-500/5 via-transparent to-brand-500/5 -z-10" />

          <div className="text-center space-y-4">
            {/* Logo/Icon */}
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-brand-500/20 to-pink-500/20 border border-brand-500/30">
              <Sparkles size={32} className="text-brand-300 animate-pulse" />
            </div>

            <h2 className="text-xl font-black text-white tracking-wider">
              Welcome to <span className="text-brand-300">jusDNCE</span>
            </h2>

            <p className="text-sm text-gray-300 leading-relaxed">
              Transform any image into a living, audio-reactive dance animation.
              <br/><br/>
              <span className="text-brand-300 font-bold">Just upload a picture</span> and we'll bring it to life!
            </p>

            {/* Steps */}
            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-2">
                  <Upload size={18} className="text-brand-300" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">1. Upload</span>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mb-2">
                  <Music size={18} className="text-pink-300" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">2. Add Music</span>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-2">
                  <Sparkles size={18} className="text-cyan-300" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">3. Dance!</span>
              </div>
            </div>

            {/* Audio hint */}
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-left">
              <p className="text-[11px] text-yellow-300">
                <span className="font-bold">Pro tip:</span> Upload a song for the best experience, or use your <span className="inline-flex items-center gap-1 font-bold"><Mic size={12} /> microphone</span> to dance to live audio!
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onSkipAll}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider font-bold"
              >
                Skip Tutorial
              </button>
              <button
                onClick={onDismiss}
                className="
                  px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider
                  bg-gradient-to-r from-brand-500 to-pink-500 text-white
                  hover:brightness-110 transition-all shadow-lg shadow-brand-500/30
                  flex items-center gap-2
                "
              >
                Let's Go <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main onboarding hook
interface OnboardingStep {
  id: string;
  component: 'explainer' | 'tooltip';
  title: string;
  description: string;
  position?: { top?: string; left?: string; right?: string; bottom?: string };
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  accentColor?: string;
  triggerAfterMs: number;
  targetStep: number; // Which app step this appears on (1, 2, 3, 4)
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    component: 'explainer',
    title: 'Welcome to jusDNCE',
    description: 'Transform any image into a living, audio-reactive dance animation.',
    triggerAfterMs: 4000,
    targetStep: 1,
  },
  {
    id: 'upload-image',
    component: 'tooltip',
    title: 'Start Here',
    description: 'Drag and drop an image or click to browse. Characters, artwork, text - anything works!',
    position: { top: '50%', left: '50%' },
    arrowPosition: 'bottom',
    accentColor: 'brand',
    triggerAfterMs: 10000,
    targetStep: 1,
  },
  {
    id: 'add-song',
    component: 'tooltip',
    title: 'Add Your Soundtrack',
    description: 'Upload an MP3 or audio file. Or skip this and use your microphone for live audio!',
    position: { bottom: '20%', left: '50%' },
    arrowPosition: 'top',
    accentColor: 'magenta',
    triggerAfterMs: 10000,
    targetStep: 1,
  },
  {
    id: 'choose-style',
    component: 'tooltip',
    title: 'Pick Your Vibe',
    description: 'Choose an art style to set the mood. Each style has unique visual effects and motion patterns.',
    position: { top: '30%', left: '20px' },
    arrowPosition: 'left',
    accentColor: 'cyan',
    triggerAfterMs: 10000,
    targetStep: 2,
  },
  {
    id: 'generate',
    component: 'tooltip',
    title: 'Ready to Dance!',
    description: 'Hit Generate to create your dance animation. Choose Turbo for speed or Quality for more poses.',
    position: { bottom: '100px', right: '20px' },
    arrowPosition: 'right',
    accentColor: 'yellow',
    triggerAfterMs: 10000,
    targetStep: 2,
  },
];

export const useOnboarding = (currentStep: number) => {
  const [dismissedSteps, setDismissedSteps] = useState<Set<string>>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('jusdnce-onboarding-dismissed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [activeTooltip, setActiveTooltip] = useState<OnboardingStep | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Save dismissed steps to localStorage
  useEffect(() => {
    localStorage.setItem('jusdnce-onboarding-dismissed', JSON.stringify([...dismissedSteps]));
  }, [dismissedSteps]);

  // Reset idle timer on any user activity
  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now();
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Find next undismissed tooltip for current step
    const nextStep = ONBOARDING_STEPS.find(
      step => step.targetStep === currentStep && !dismissedSteps.has(step.id)
    );

    if (nextStep) {
      idleTimeoutRef.current = setTimeout(() => {
        setActiveTooltip(nextStep);
      }, nextStep.triggerAfterMs);
    }
  };

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Initial timer
    resetIdleTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [currentStep, dismissedSteps]);

  const dismissTooltip = (id: string) => {
    setDismissedSteps(prev => new Set([...prev, id]));
    setActiveTooltip(null);
    resetIdleTimer();
  };

  const skipAll = () => {
    const allIds = ONBOARDING_STEPS.map(s => s.id);
    setDismissedSteps(new Set(allIds));
    setActiveTooltip(null);
  };

  const resetOnboarding = () => {
    setDismissedSteps(new Set());
    localStorage.removeItem('jusdnce-onboarding-dismissed');
  };

  return {
    activeTooltip,
    dismissTooltip,
    skipAll,
    resetOnboarding,
    isFirstTimeUser: dismissedSteps.size === 0,
  };
};

// Onboarding container component
interface OnboardingProps {
  currentStep: number;
}

export const Onboarding: React.FC<OnboardingProps> = ({ currentStep }) => {
  const { activeTooltip, dismissTooltip, skipAll } = useOnboarding(currentStep);

  if (!activeTooltip) return null;

  if (activeTooltip.component === 'explainer') {
    return (
      <FirstPageExplainer
        onDismiss={() => dismissTooltip(activeTooltip.id)}
        onSkipAll={skipAll}
      />
    );
  }

  return (
    <OnboardingTooltip
      id={activeTooltip.id}
      title={activeTooltip.title}
      description={activeTooltip.description}
      position={activeTooltip.position || {}}
      arrowPosition={activeTooltip.arrowPosition}
      accentColor={activeTooltip.accentColor}
      onDismiss={() => dismissTooltip(activeTooltip.id)}
      onSkipAll={skipAll}
    />
  );
};

export default Onboarding;
