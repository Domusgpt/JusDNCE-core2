/**
 * jusDNCE AI - Firebase Functions Entry Point
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 *
 * Production-grade Cloud Functions with:
 * - Secure Gemini AI integration
 * - Stripe payment processing
 * - Authentication & rate limiting
 * - Credit management
 * - Structured logging
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all functions
export { generateDanceFrames } from "./generateDance";
export { handleStripeWebhook } from "./stripeWebhook";
export { createCheckoutSession, verifyCheckoutSession } from "./createCheckoutSession";
export { testStripeConnection } from "./testStripeConnection";
export { redeemPromoCode } from "./redeemPromoCode";
