"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemPromoCode = exports.testStripeConnection = exports.verifyCheckoutSession = exports.createCheckoutSession = exports.handleStripeWebhook = exports.generateDanceFrames = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export all functions
var generateDance_1 = require("./generateDance");
Object.defineProperty(exports, "generateDanceFrames", { enumerable: true, get: function () { return generateDance_1.generateDanceFrames; } });
var stripeWebhook_1 = require("./stripeWebhook");
Object.defineProperty(exports, "handleStripeWebhook", { enumerable: true, get: function () { return stripeWebhook_1.handleStripeWebhook; } });
var createCheckoutSession_1 = require("./createCheckoutSession");
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return createCheckoutSession_1.createCheckoutSession; } });
Object.defineProperty(exports, "verifyCheckoutSession", { enumerable: true, get: function () { return createCheckoutSession_1.verifyCheckoutSession; } });
var testStripeConnection_1 = require("./testStripeConnection");
Object.defineProperty(exports, "testStripeConnection", { enumerable: true, get: function () { return testStripeConnection_1.testStripeConnection; } });
var redeemPromoCode_1 = require("./redeemPromoCode");
Object.defineProperty(exports, "redeemPromoCode", { enumerable: true, get: function () { return redeemPromoCode_1.redeemPromoCode; } });
//# sourceMappingURL=index.js.map