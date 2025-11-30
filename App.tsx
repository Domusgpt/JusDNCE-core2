/**
 * jusDNCE AI - Main Application
 * A Paul Phillips Manifestation
 *
 * Full Firebase Auth + Stripe Checkout + SuperMode Generation
 * Production-ready with real payment processing
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */

import React, { useState, useEffect } from 'react';
import { Zap, Layers, LogIn, Activity, FastForward, Upload, FileJson, Gift, Sparkles } from 'lucide-react';
import { AppState, AppStep, DEFAULT_STATE, AuthUser, SavedProject } from './types';
import { STYLE_PRESETS, CREDITS_PER_PACK, CREDIT_COSTS } from './constants';
import { Step1Assets, Step2Director } from './components/Steps';
import { Step4Preview } from './components/Step4Preview';
import { generateDanceFrames, fileToGenericBase64 } from './services/gemini';
import { AuthModal, PaymentModal } from './components/Modals';
import { GlobalBackground } from './components/GlobalBackground';
import { Onboarding } from './components/Onboarding';
import { auth, googleProvider, functions, signInWithGoogle } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  createUserDocument,
  getUserDocument,
  subscribeToCredits,
  updateUserCredits,
  claimDailyCredit
} from './services/firestore';

const triggerImpulse = (type: 'click' | 'hover' | 'type', intensity: number = 1.0) => {
    const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
    window.dispatchEvent(event);
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [importRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());

  // Firebase Authentication Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // User signed in - create/update Firestore document
        const { uid, displayName, email, photoURL } = firebaseUser;

        try {
          await createUserDocument(
            uid,
            email || 'no-email@example.com',
            displayName || 'Anonymous User',
            photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`
          );

          // Fetch user document to get credits and tier
          const userDoc = await getUserDocument(uid);

          const authUser: AuthUser = {
            uid,
            name: displayName || 'Anonymous User',
            email: email || 'no-email@example.com',
            photoURL: photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`
          };

          setAppState(prev => ({
            ...prev,
            user: authUser,
            credits: userDoc?.credits || 0,
            showAuthModal: false
          }));

        } catch (error) {
          console.error('Error creating user document:', error);
        }
      } else {
        // User signed out
        setAppState(prev => ({
          ...prev,
          user: null,
          credits: 0
        }));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time Credit Subscription
  useEffect(() => {
    if (!appState.user) return;

    const unsubscribeCredits = subscribeToCredits(appState.user.uid, (credits) => {
      setAppState(prev => ({
        ...prev,
        credits
      }));
    });

    return () => unsubscribeCredits();
  }, [appState.user]);

  const handleImageUpload = async (file: File) => {
    try {
        const base64 = await fileToGenericBase64(file);
        setAppState(prev => ({
          ...prev,
          imageFile: file,
          imagePreviewUrl: base64,
          generatedFrames: []
        }));
    } catch (e: any) {
        console.error("Image upload processing failed:", e);
        alert(`Failed to load image: ${e.message || "Unknown error"}`);
    }
  };

  const handleAudioUpload = async (file: File) => {
    if (!file) {
        setAppState(prev => ({ ...prev, audioFile: null, audioPreviewUrl: null }));
        return;
    }
    const previewUrl = URL.createObjectURL(file);
    setAppState(prev => ({
      ...prev,
      audioFile: file,
      audioPreviewUrl: previewUrl
    }));
  };

  const updateConfig = (key: string, value: any) => {
    setAppState(prev => ({ ...prev, [key]: value }));
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle the rest automatically
      triggerImpulse('click', 1.0);
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}`);
      setAppState(prev => ({ ...prev, showAuthModal: false }));
    }
  };

  const handleBuyCredits = () => {
     setAppState(prev => ({ ...prev, showPaymentModal: true }));
  };

  // Payment success is handled by Stripe webhook which adds credits to Firestore
  // The real-time credit subscription will automatically update the UI
  const handlePaymentSuccess = () => {
    // Credits are added server-side via webhook, UI updates via Firestore subscription
    // Just close the modal - subscription handles the rest
    setAppState(prev => ({ ...prev, showPaymentModal: false }));
  };

  const handleSpendCredit = async (amount: number): Promise<boolean> => {
    if (!appState.user) {
      setAppState(prev => ({ ...prev, showAuthModal: true }));
      return false;
    }

    if (appState.credits >= amount) {
      try {
        await updateUserCredits(appState.user.uid, -amount);
        // Real-time listener will update the UI automatically
        return true;
      } catch (error: any) {
        console.error('Error spending credit:', error);
        // Show error to user instead of failing silently
        alert(`Failed to process credits: ${error.message || 'Database error'}. Please try again.`);
        return false;
      }
    } else {
      // Insufficient credits - show payment modal (no alert, cleaner UX)
      setAppState(prev => ({ ...prev, showPaymentModal: true }));
      return false;
    }
  };

  // Handle daily credit claim
  const handleClaimDailyCredit = async () => {
    if (!appState.user) {
      setAppState(prev => ({ ...prev, showAuthModal: true }));
      return;
    }

    try {
      const result = await claimDailyCredit(appState.user.uid);
      triggerImpulse('click', result.claimed > 0 ? 2.0 : 0.5);
      // Show result to user - could use toast notification instead
      if (result.claimed > 0) {
        // Success animation/feedback handled by impulse
      }
    } catch (error) {
      console.error('Error claiming daily credit:', error);
    }
  };

  const handleGenerateClick = (isMock: boolean = false) => {
      handleGenerate(isMock);
  };

  const handleInstantGenerate = () => {
      triggerImpulse('click', 1.5);
      // Ensure defaults for quick start
      setAppState(prev => ({
          ...prev,
          useTurbo: true,
          motionPreset: 'auto',
          step: AppStep.DIRECTOR // Briefly switch state logic
      }));
      // Need a small timeout to let state update or just call directly with overrides
      setTimeout(() => handleGenerate(), 100);
  };

  // Calculate credit cost based on generation mode
  const getGenerationCost = (): number => {
    if (appState.superMode) return CREDIT_COSTS.SUPER_MODE; // 4 credits
    if (!appState.useTurbo) return CREDIT_COSTS.QUALITY;     // 2 credits (Quality mode)
    return CREDIT_COSTS.TURBO;                               // 1 credit (Turbo mode)
  };

  const handleGenerate = async (isMock: boolean = false) => {
    if (!appState.imagePreviewUrl) return;

    // Require auth for real generation (allow mock/test mode without auth)
    if (!isMock && !appState.user) {
      setAppState(prev => ({ ...prev, showAuthModal: true }));
      return;
    }

    // Credit check BEFORE generation - show payment modal if insufficient
    const cost = getGenerationCost();
    if (!isMock && appState.credits < cost) {
      // User doesn't have enough credits - show payment modal
      setAppState(prev => ({ ...prev, showPaymentModal: true }));
      return;
    }

    // Deduct credits before generation starts
    if (!isMock && appState.user) {
      const success = await handleSpendCredit(cost);
      if (!success) return; // handleSpendCredit already shows modal if needed
    }

    setAppState(prev => ({ ...prev, isGenerating: true, step: AppStep.PREVIEW }));

    const style = STYLE_PRESETS.find(s => s.id === appState.selectedStyleId);
    const imageBase64 = appState.imagePreviewUrl;

    let effectiveMotionPrompt = appState.motionPrompt;
    if (appState.motionPreset !== 'custom' && appState.motionPreset !== 'auto') {
        if (appState.motionPreset === 'bounce') effectiveMotionPrompt = "Bouncy, energetic, rhythmic jumping";
        if (appState.motionPreset === 'flow') effectiveMotionPrompt = "Smooth, fluid, liquid motion, floating";
        if (appState.motionPreset === 'glitch') effectiveMotionPrompt = "Twitchy, glitchy, rapid robotic movements";
    }

    // Super Mode Override
    if (appState.superMode && appState.superModeMotionPreset) {
        if (appState.superModeMotionPreset === 'triplet-flow') effectiveMotionPrompt += ". Movements locked to triplet rhythm (1-2-3). Waltz style flows.";
        if (appState.superModeMotionPreset === 'vocal-chop') effectiveMotionPrompt += ". Rapid facial expression changes. Mouth open/closed syncopation.";
        if (appState.superModeMotionPreset === 'char-spin') effectiveMotionPrompt += ". Full 360 degree character rotation. Front, side, back, side views.";
        if (appState.superModeMotionPreset === 'slow-mo-impact') effectiveMotionPrompt += ". Fast buildup moves leading to sudden frozen impact poses.";
        if (appState.superModeMotionPreset === 'liquid-morph') effectiveMotionPrompt += ". Continuous shape-shifting fluid motion. No static poses.";
    }

    try {
        const { frames, category } = await generateDanceFrames(
            imageBase64,
            style?.promptModifier || 'artistic style',
            effectiveMotionPrompt,
            appState.useTurbo,
            appState.superMode,
            isMock
        );

        setAppState(prev => ({
            ...prev,
            generatedFrames: frames,
            subjectCategory: category, // Store detection result
            isGenerating: false
        }));
    } catch (e: any) {
        console.error("Generation Failed:", e);
        const msg = e.message || "Unknown error";
        if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
            alert("API Permission Denied (403). Please ensure your API Key has access to 'gemini-2.5-flash-image'.");
        } else {
            alert(`Generation failed: ${msg}`);
        }
        setAppState(prev => ({ ...prev, isGenerating: false, step: AppStep.DIRECTOR }));
    }
  };

  // --- PROJECT SAVING / LOADING ---
  const saveProject = () => {
      if (appState.generatedFrames.length === 0) return;

      const project: SavedProject = {
          id: crypto.randomUUID(),
          name: `Rig_${Date.now()}`,
          createdAt: Date.now(),
          frames: appState.generatedFrames,
          styleId: appState.selectedStyleId,
          subjectCategory: appState.subjectCategory
      };

      const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.jusdnce`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const project = JSON.parse(event.target?.result as string) as SavedProject;
              // Validation simple
              if (!project.frames || !project.styleId) throw new Error("Invalid Project File");

              setAppState(prev => ({
                  ...prev,
                  generatedFrames: project.frames,
                  selectedStyleId: project.styleId,
                  subjectCategory: project.subjectCategory || 'CHARACTER',
                  imagePreviewUrl: project.frames[0].url, // Set base image
                  stutterPreset: 'auto', // Reset preset if undefined
                  step: AppStep.PREVIEW // Jump straight to preview
              }));
              triggerImpulse('click', 1.5);
          } catch (err) {
              alert("Failed to load project file.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const canProceed = () => {
    switch (appState.step) {
      case AppStep.ASSETS: return !!appState.imagePreviewUrl; // Audio is now optional
      case AppStep.DIRECTOR: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (appState.step === AppStep.DIRECTOR) {
      handleGenerateClick();
    } else {
      setAppState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  return (
    <div className="min-h-screen relative text-gray-100 font-sans overflow-hidden selection:bg-brand-500/30 selection:text-white">

      {/* 1. Global Holographic Background */}
      <GlobalBackground appState={appState} />

      {/* 2. Overlay Content */}
      <div className="relative z-10 flex flex-col h-screen flex-1">

        {/* MODALS */}
        <AuthModal
            isOpen={appState.showAuthModal}
            onClose={() => setAppState(prev => ({ ...prev, showAuthModal: false }))}
            onLogin={handleLogin}
        />
        <PaymentModal
            isOpen={appState.showPaymentModal}
            onClose={() => setAppState(prev => ({ ...prev, showPaymentModal: false }))}
            onSuccess={handlePaymentSuccess}
        />

        {/* HEADER */}
        <header className="border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

            {/* BRANDING */}
            <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => window.location.reload()}
                onMouseEnter={() => triggerImpulse('hover', 0.5)}
            >
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-brand-500 rounded-lg blur-lg opacity-40 group-hover:opacity-100 group-hover:animate-pulse transition-opacity" />
                    <div className="relative bg-black border border-white/20 p-2 rounded-lg backdrop-blur-md group-hover:scale-110 transition-transform duration-300">
                        <Activity size={24} className="text-white group-hover:text-brand-300 transition-colors" />
                    </div>
                </div>

                <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-200 to-white animate-text-shimmer drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] italic hover:scale-105 transition-transform origin-left">
                  jus<span className="text-brand-400 not-italic font-bold">DNCE</span>
                </h1>
            </div>

            {/* RIGHT SIDE CONTROLS */}
            <div className="flex items-center gap-4">
                {/* IMPORT BUTTON */}
                <button
                    onClick={() => importRef.current?.click()}
                    className="glass-button px-4 py-2 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/10 hover:border-brand-400/50"
                >
                    <FileJson size={14} className="text-brand-300" /> IMPORT RIG
                </button>
                <input ref={importRef} type="file" accept=".jusdnce" onChange={loadProject} className="hidden" />

                {/* Daily Credit Claim Button */}
                {appState.user && (
                    <button
                        onClick={handleClaimDailyCredit}
                        onMouseEnter={() => triggerImpulse('hover', 0.3)}
                        className="hidden md:flex items-center gap-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-4 py-2 rounded-full border border-green-500/30 cursor-pointer hover:border-green-400/50 transition-all hover:bg-green-500/10 hover:scale-105 group"
                        title="Claim your daily free credit"
                    >
                        <Gift size={16} className="text-green-400 group-hover:animate-bounce" />
                        <span className="text-xs font-bold text-green-300 tracking-wide">DAILY</span>
                    </button>
                )}

                <button
                    className="flex items-center gap-2 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 px-4 md:px-5 py-2 rounded-full border border-yellow-500/30 cursor-pointer hover:border-yellow-400/50 transition-all hover:bg-yellow-500/10 hover:scale-105 group shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                    onMouseEnter={() => triggerImpulse('hover', 0.3)}
                    onClick={() => setAppState(prev => ({ ...prev, showPaymentModal: true }))}
                    title="Click to buy more credits"
                >
                    <Zap size={16} className="text-yellow-400 fill-yellow-400 group-hover:animate-bounce" />
                    <span className="text-sm font-bold text-yellow-100 tracking-wide font-mono">{appState.credits}</span>
                    <span className="hidden sm:inline text-xs text-yellow-300/60 font-bold">CR</span>
                </button>

                {appState.user ? (
                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-white leading-tight tracking-wider">{appState.user.name}</p>
                            <p className="text-[10px] text-brand-300 font-mono uppercase">PRO TIER</p>
                        </div>
                        <img src={appState.user.photoURL} alt="Profile" className="w-10 h-10 rounded-full ring-2 ring-brand-500/50 hover:ring-brand-400 transition-all cursor-pointer" />
                    </div>
                ) : (
                    <button
                        onClick={() => setAppState(prev => ({ ...prev, showAuthModal: true }))}
                        onMouseEnter={() => triggerImpulse('hover', 0.4)}
                        className="glass-button px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold text-white tracking-wide shadow-lg"
                    >
                        <LogIn size={16} /> SIGN IN
                    </button>
                )}
            </div>
            </div>
        </header>

        {/* PROMOTIONAL BANNER FOR NON-LOGGED USERS */}
        {!appState.user && (
            <div className="bg-gradient-to-r from-brand-600/80 via-purple-600/80 to-pink-600/80 backdrop-blur-md border-b border-white/10 px-4 py-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMjBMMjAgMEwyMCAyMEwwIDIwTDIwIDIwTDQwIDIwTDIwIDIwTDIwIDQwTDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')] opacity-30" />
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
                    <div className="flex items-center gap-2 text-white text-sm font-medium">
                        <Sparkles size={16} className="animate-pulse" />
                        <span className="hidden sm:inline">Sign up for <strong className="font-black">FREE credits</strong> and unlock full dance generation!</span>
                        <span className="sm:hidden text-center"><strong>FREE credits</strong> when you sign up!</span>
                    </div>
                    <button
                        onClick={() => setAppState(prev => ({ ...prev, showAuthModal: true }))}
                        onMouseEnter={() => triggerImpulse('hover', 0.5)}
                        className="px-5 py-2 bg-white text-brand-700 rounded-full text-xs font-black tracking-wide hover:bg-brand-50 hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                    >
                        <LogIn size={14} /> GET STARTED FREE
                    </button>
                </div>
            </div>
        )}

        {/* ONBOARDING OVERLAY - Idle-triggered guidance */}
        <Onboarding currentStep={appState.step + 1} />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-6 overflow-y-auto scrollbar-hide relative">

            {appState.step === AppStep.ASSETS && (
                <div className="animate-fade-in">
                    <Step1Assets
                        state={appState}
                        onUploadImage={handleImageUpload}
                        onUploadAudio={handleAudioUpload}
                    />
                </div>
            )}

            {appState.step === AppStep.DIRECTOR && (
                <div className="animate-fade-in">
                    <Step2Director
                        config={appState}
                        onUpdate={updateConfig}
                        onBuyCredits={handleBuyCredits}
                        onTestMode={() => handleGenerateClick(true)}
                        onBack={() => setAppState(prev => ({ ...prev, step: AppStep.ASSETS }))}
                    />
                </div>
            )}

            {appState.step === AppStep.PREVIEW && (
                <div className="animate-holo-reveal">
                    <Step4Preview
                        state={appState}
                        onGenerateMore={() => handleGenerateClick(false)}
                        onSpendCredit={handleSpendCredit}
                        onUploadAudio={handleAudioUpload}
                        onSaveProject={saveProject}
                        onNewDance={() => setAppState(prev => ({ ...DEFAULT_STATE, user: prev.user, credits: prev.credits, step: AppStep.ASSETS }))}
                        onBackToDirector={() => setAppState(prev => ({ ...prev, step: AppStep.DIRECTOR }))}
                        onOpenAuth={() => setAppState(prev => ({ ...prev, showAuthModal: true }))}
                    />
                </div>
            )}
        </main>

        {/* FOOTER NAV */}
        <footer className="border-t border-white/5 bg-black/20 backdrop-blur-lg p-5 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">

                {/* Steps Indicator */}
                <div className="flex gap-4 items-center">
                    <span className="text-xs font-mono text-gray-500 font-bold hidden md:block tracking-widest">PROGRESSION //</span>
                    {[AppStep.ASSETS, AppStep.DIRECTOR, AppStep.PREVIEW].map(step => (
                        <div
                        key={step}
                        className={`
                            h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]
                            ${appState.step >= step ? 'w-12 bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'w-3 bg-white/10'}
                        `}
                        />
                    ))}
                </div>

                {appState.step !== AppStep.PREVIEW && (
                    <div className="flex items-center gap-4">
                        {appState.step === AppStep.ASSETS && canProceed() && (
                            <button
                                onClick={handleInstantGenerate}
                                onMouseEnter={() => triggerImpulse('hover', 0.6)}
                                className="px-6 py-4 rounded-full font-black text-sm tracking-widest flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_30px_rgba(219,39,119,0.4)] hover:shadow-[0_0_50px_rgba(219,39,119,0.7)] hover:scale-105 transition-all duration-300"
                            >
                                <FastForward size={18} fill="white" /> QUICK DANCE
                            </button>
                        )}

                        <button
                            disabled={!canProceed()}
                            onClick={nextStep}
                            onMouseEnter={() => canProceed() && triggerImpulse('hover', 0.6)}
                            className={`
                            px-10 py-4 rounded-full font-black text-sm tracking-widest flex items-center gap-3 transition-all duration-300 backdrop-blur-md
                            ${canProceed()
                                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] border border-brand-400/50 hover:scale-105'
                                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}
                            `}
                        >
                            {appState.step === AppStep.DIRECTOR ? (
                                appState.isGenerating ? (
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full animate-ping"/> PROCESSING</span>
                                ) : 'INITIALIZE GENERATION'
                            ) : (
                                'CONTINUE SEQUENCE'
                            )}
                            {appState.step === AppStep.DIRECTOR && !appState.isGenerating && <Zap size={18} className={canProceed() ? 'fill-white animate-pulse' : ''} />}
                        </button>
                    </div>
                )}
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
