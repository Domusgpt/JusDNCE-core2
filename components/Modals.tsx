/**
 * jusDNCE AI - Modal Components
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 *
 * Authentication and Payment modals with real Stripe Checkout integration.
 * Industry-standard secure payment flow.
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */

import React, { useState, useEffect } from 'react';
import { X, Lock, CreditCard, Sparkles, Shield, User, Mail, ArrowLeft, ExternalLink, AlertCircle, CheckCircle, Play, Crown, Zap, Gift, Loader2 } from 'lucide-react';
import { CREDIT_PACKS, SUBSCRIPTION, FREE_TIER } from '../constants';
import { signInWithEmail, createAccountWithEmail, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * PromoCodeInput - Inline promo code redemption widget
 * Can be used inside PaymentModal or standalone
 */
export const PromoCodeInput: React.FC<{
    onSuccess?: (credits: number, newBalance: number) => void;
    compact?: boolean;
}> = ({ onSuccess, compact = false }) => {
    const [code, setCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; credits?: number } | null>(null);

    const handleRedeem = async () => {
        if (!code.trim()) return;

        setIsRedeeming(true);
        setResult(null);
        triggerImpulse('click', 1.0);

        try {
            const redeemPromoCode = httpsCallable(functions, 'redeemPromoCode');
            const response = await redeemPromoCode({ code: code.trim().toUpperCase() }) as {
                data: { success: boolean; credits: number; newBalance: number; message: string }
            };

            setResult({
                success: true,
                message: response.data.message,
                credits: response.data.credits,
            });

            triggerImpulse('click', 2.0);

            if (onSuccess) {
                onSuccess(response.data.credits, response.data.newBalance);
            }

            // Clear input after success
            setCode('');

        } catch (err: any) {
            console.error('Promo code error:', err);
            let errorMessage = 'Failed to redeem code';

            if (err.message?.includes('not-found') || err.message?.includes('Invalid')) {
                errorMessage = 'Invalid or expired promo code';
            } else if (err.message?.includes('already-exists') || err.message?.includes('already redeemed')) {
                errorMessage = 'You already redeemed this code';
            } else if (err.message?.includes('resource-exhausted') || err.message?.includes('maximum')) {
                errorMessage = 'This code has reached its limit';
            } else if (err.message?.includes('unauthenticated')) {
                errorMessage = 'Please sign in to redeem codes';
            }

            setResult({ success: false, message: errorMessage });
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && code.trim()) {
            handleRedeem();
        }
    };

    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        placeholder="PROMO CODE"
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-white text-sm uppercase tracking-wider focus:border-green-500/50 outline-none placeholder:text-gray-500"
                        maxLength={20}
                    />
                    <button
                        onClick={handleRedeem}
                        disabled={isRedeeming || !code.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                    >
                        {isRedeeming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                    </button>
                </div>
                {result && (
                    <div className={`text-xs flex items-center gap-1 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {result.message}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 p-4 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
                <Gift size={18} className="text-green-400" />
                <span className="text-sm font-bold text-white">Have a Promo Code?</span>
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter code here..."
                    className="flex-1 bg-black/40 border border-green-500/30 rounded-lg py-2.5 px-3 text-white text-sm uppercase tracking-wider focus:border-green-400 outline-none placeholder:text-gray-500"
                    maxLength={20}
                />
                <button
                    onClick={handleRedeem}
                    disabled={isRedeeming || !code.trim()}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                >
                    {isRedeeming ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        'Redeem'
                    )}
                </button>
            </div>
            {result && (
                <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${
                    result.success
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                    {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {result.message}
                    {result.credits && <span className="ml-auto font-bold">+{result.credits} credits!</span>}
                </div>
            )}
        </div>
    );
};

const triggerImpulse = (type: 'click' | 'hover' | 'type', intensity: number = 1.0) => {
    const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
    window.dispatchEvent(event);
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    useEffect(() => {
        if (isOpen) triggerImpulse('click', 0.8);
    }, [isOpen]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { triggerImpulse('click', 0.5); onClose(); }} />
            <div className="relative bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-zoom-out overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-dark-border bg-dark-bg/50">
                    <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                    <button
                        onClick={() => { triggerImpulse('click', 0.5); onClose(); }}
                        className="text-gray-400 hover:text-white transition-colors hover:rotate-90 duration-300"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: () => void }> = ({ isOpen, onClose, onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleGoogleLogin = () => {
        triggerImpulse('click', 1.2);
        setIsLoading(true);
        onLogin();
        setIsLoading(false);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        triggerImpulse('click', 1.2);

        try {
            if (isSignUp) {
                await createAccountWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
            // Auth state listener in App.tsx will handle the rest
            onClose();
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found. Try signing up!');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email already in use. Try signing in!');
            } else if (err.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters.');
            } else {
                setError(err.message || 'Authentication failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setShowEmailForm(false);
        setEmail('');
        setPassword('');
        setError('');
        setIsSignUp(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title={showEmailForm ? (isSignUp ? "Create Account" : "Sign In") : "Create Account"}>
            {showEmailForm ? (
                <div className="space-y-4">
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-black/30 border border-gray-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-brand-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-black/30 border border-gray-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-brand-500 outline-none"
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>{isSignUp ? 'Create Account' : 'Sign In'}</>
                            )}
                        </button>

                        <p className="text-center text-sm text-gray-400">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                                className="text-brand-400 hover:text-brand-300"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </form>
                </div>
            ) : (
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto text-brand-400 border border-brand-500/30 shadow-lg">
                        <User size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-white mb-2">Save Your Masterpiece</h4>
                        <p className="text-gray-400 text-sm">Sign in to save your generated videos and claim your <span className="text-brand-300 font-bold">{FREE_TIER.signupCredits} Free Credits</span>.</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            onMouseEnter={() => triggerImpulse('hover', 0.2)}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-[1.02]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowEmailForm(true)}
                            onMouseEnter={() => triggerImpulse('hover', 0.2)}
                            className="w-full bg-gray-800 text-white font-medium py-3 rounded-xl hover:bg-gray-700 transition-colors border border-white/5 flex items-center justify-center gap-2"
                        >
                            <Mail size={18} />
                            Continue with Email
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
                </div>
            )}
        </Modal>
    );
};

/**
 * PaymentModal - Real Stripe Checkout Integration
 * Uses Stripe hosted checkout for PCI-compliant payment processing
 * Updated with new pricing tiers: $1/1cr, $5/10cr, $10/25cr, $20/60cr, $30/100cr
 * Plus $8/month subscription option
 */
export const PaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'ready' | 'processing' | 'redirecting'>('ready');
    const [selectedPack, setSelectedPack] = useState<string>('pack_10'); // Default to popular option
    const [showSubscription, setShowSubscription] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep('ready');
            setError(null);
            setIsProcessing(false);
            setSelectedPack('pack_10');
            setShowSubscription(false);
        }
    }, [isOpen]);

    // Check for success/cancel URL params on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const canceled = urlParams.get('canceled');
        const sessionId = urlParams.get('session_id');

        if (success === 'true' && sessionId) {
            // Verify the session and trigger success
            verifyPaymentSession(sessionId);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (canceled === 'true') {
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const verifyPaymentSession = async (sessionId: string) => {
        try {
            const verifySession = httpsCallable(functions, 'verifyCheckoutSession');
            const result = await verifySession({ sessionId }) as { data: { paid: boolean; credits?: number } };

            if (result.data.paid) {
                triggerImpulse('click', 3.0);
                onSuccess();
            }
        } catch (err) {
            console.error('Failed to verify session:', err);
        }
    };

    const handleCheckout = async (packId: string, isSubscription: boolean = false) => {
        setError(null);
        setIsProcessing(true);
        setStep('processing');
        triggerImpulse('click', 1.5);

        try {
            // Call Firebase Function to create Stripe Checkout session
            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');

            const currentUrl = window.location.origin + window.location.pathname;

            const result = await createCheckoutSession({
                packId,
                isSubscription,
                successUrl: currentUrl,
                cancelUrl: currentUrl,
            }) as { data: { sessionId: string; url: string } };

            const { url } = result.data;

            if (!url) {
                throw new Error('No checkout URL returned');
            }

            setStep('redirecting');

            // Log for debugging
            console.log('[Stripe] Redirecting to checkout:', url);

            // Redirect to Stripe Checkout
            window.location.href = url;

        } catch (err: any) {
            console.error('[Stripe] Checkout error:', err);
            setIsProcessing(false);
            setStep('ready');

            // Handle specific error messages
            if (err.message?.includes('unauthenticated')) {
                setError('Please sign in to purchase credits.');
            } else if (err.message?.includes('not configured')) {
                setError('Payment system is being set up. Please try again later.');
            } else {
                setError(err.message || 'Failed to start checkout. Please try again.');
            }
        }
    };

    const selectedPackData = CREDIT_PACKS.find(p => p.id === selectedPack);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Get Credits">
            <div className="space-y-4">
                {/* Tab Toggle: Credits vs Subscription */}
                <div className="flex gap-2 p-1 bg-black/30 rounded-lg">
                    <button
                        onClick={() => setShowSubscription(false)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                            !showSubscription
                                ? 'bg-brand-600 text-white'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Zap size={14} className="inline mr-1" /> Credit Packs
                    </button>
                    <button
                        onClick={() => setShowSubscription(true)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                            showSubscription
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Crown size={14} className="inline mr-1" /> Pro Monthly
                    </button>
                </div>

                {!showSubscription ? (
                    <>
                        {/* Credit Pack Selection Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {CREDIT_PACKS.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => setSelectedPack(pack.id)}
                                    onMouseEnter={() => triggerImpulse('hover', 0.2)}
                                    className={`relative p-3 rounded-lg border-2 transition-all ${
                                        selectedPack === pack.id
                                            ? 'border-brand-500 bg-brand-500/20'
                                            : 'border-white/10 bg-black/20 hover:border-white/30'
                                    }`}
                                >
                                    {pack.popular && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">
                                            POPULAR
                                        </span>
                                    )}
                                    {pack.bestValue && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                                            BEST VALUE
                                        </span>
                                    )}
                                    <div className="text-lg font-bold text-white">{pack.credits}</div>
                                    <div className="text-[10px] text-gray-400">credits</div>
                                    <div className="text-sm font-bold text-brand-300 mt-1">${pack.price}</div>
                                </button>
                            ))}
                        </div>

                        {/* Selected Pack Summary */}
                        {selectedPackData && (
                            <div className="bg-gradient-to-br from-brand-900/50 to-purple-900/50 p-4 rounded-xl border border-brand-500/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-white font-bold">{selectedPackData.credits} Credits</p>
                                        <p className="text-brand-300 text-xs">
                                            ${(selectedPackData.price / selectedPackData.credits).toFixed(2)} per credit
                                        </p>
                                    </div>
                                    <div className="text-2xl font-bold text-white">${selectedPackData.price}</div>
                                </div>
                            </div>
                        )}

                        {/* Watch Ad Option Placeholder */}
                        <button
                            onClick={() => triggerImpulse('click', 0.5)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                        >
                            <Play size={16} />
                            <span className="text-sm font-bold">Watch Ad for Free Credit</span>
                            <span className="text-[10px] bg-green-500/30 px-2 py-0.5 rounded">Coming Soon</span>
                        </button>

                        {/* Promo Code Input */}
                        <PromoCodeInput
                            onSuccess={(credits, newBalance) => {
                                triggerImpulse('click', 2.5);
                                onSuccess();
                            }}
                        />
                    </>
                ) : (
                    /* Subscription Option */
                    <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 p-5 rounded-xl border border-yellow-500/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                                <Crown size={24} className="text-black" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">Pro Subscription</p>
                                <p className="text-yellow-300 text-sm">${SUBSCRIPTION.price}/month</p>
                            </div>
                        </div>
                        <ul className="space-y-2 mb-4">
                            {SUBSCRIPTION.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                    <CheckCircle size={14} className="text-green-400" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <p className="text-[11px] text-gray-500 mb-2">
                            Get {SUBSCRIPTION.dailyCredits} free credits every day, plus an ad-free experience!
                        </p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {/* Checkout Button */}
                <button
                    onClick={() => handleCheckout(showSubscription ? SUBSCRIPTION.id : selectedPack, showSubscription)}
                    disabled={isProcessing}
                    onMouseEnter={() => !isProcessing && triggerImpulse('hover', 0.3)}
                    className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-[1.02] ${
                        showSubscription
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400'
                            : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20 hover:shadow-brand-600/40'
                    }`}
                >
                    {step === 'ready' && (
                        <>
                            <CreditCard size={20} />
                            {showSubscription ? `Subscribe for $${SUBSCRIPTION.price}/mo` : `Buy ${selectedPackData?.credits} Credits`}
                            <ExternalLink size={14} className="opacity-60" />
                        </>
                    )}
                    {step === 'processing' && (
                        <>
                            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Creating checkout session...
                        </>
                    )}
                    {step === 'redirecting' && (
                        <>
                            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Redirecting to Stripe...
                        </>
                    )}
                </button>

                {/* Security Notice */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <Lock size={12} />
                        <span>Secure payment powered by</span>
                        <svg className="h-4" viewBox="0 0 60 25" fill="currentColor">
                            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.12 12.12 0 0 1-4.56.83c-4.14 0-6.94-2.4-6.94-6.94 0-4.3 2.64-7.06 6.4-7.06 3.65 0 5.96 2.66 5.96 6.74 0 .5-.04 1.06-.05 1.51zm-4.38-5.18c0-.92-.39-2.4-2.05-2.4-1.49 0-2.15 1.38-2.27 2.4h4.32zM38.23 6.47c1.56 0 2.78.27 3.75.79V11a6.82 6.82 0 0 0-3.15-.78c-.98 0-1.47.32-1.47.87 0 .58.57.8 1.49 1.12l.8.27c2.58.87 3.58 2.1 3.58 4.1 0 2.97-2.35 4.66-5.94 4.66-1.62 0-3.15-.34-4.35-.99v-3.94a8.43 8.43 0 0 0 4.2 1.25c1.08 0 1.62-.32 1.62-.9 0-.55-.49-.84-1.68-1.26l-.65-.23c-2.39-.83-3.66-2.07-3.66-4.21 0-2.72 2.2-4.49 5.46-4.49zM25.64 6.47c1.56 0 2.78.27 3.75.79V11a6.82 6.82 0 0 0-3.15-.78c-.98 0-1.47.32-1.47.87 0 .58.57.8 1.49 1.12l.8.27c2.58.87 3.58 2.1 3.58 4.1 0 2.97-2.35 4.66-5.94 4.66-1.62 0-3.15-.34-4.35-.99v-3.94a8.43 8.43 0 0 0 4.2 1.25c1.08 0 1.62-.32 1.62-.9 0-.55-.49-.84-1.68-1.26l-.65-.23c-2.39-.83-3.66-2.07-3.66-4.21 0-2.72 2.2-4.49 5.46-4.49zM14.67 20.98V6.87H19v14.11h-4.33zM16.83 5.5c-1.37 0-2.47-.98-2.47-2.2 0-1.23 1.1-2.21 2.47-2.21 1.38 0 2.48.98 2.48 2.2 0 1.23-1.1 2.22-2.48 2.22zM6.39 11.42V20.98H2.06V6.87h4.16v1.75c.8-1.23 2.32-2.14 4.35-2.14v4.13c-2.25-.04-4.18.74-4.18 2.81z" />
                        </svg>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
