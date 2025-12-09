"use strict";
/**
 * Debug function to test Stripe connectivity
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testStripeConnection = void 0;
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const auth_1 = require("./middleware/auth");
const logger_1 = require("./utils/logger");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
exports.testStripeConnection = v2_1.https.onCall({
    secrets: [stripeSecretKey],
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (request) => {
    try {
        const uid = await (0, auth_1.verifyAuth)(request);
        (0, logger_1.logInfo)("Testing Stripe connection", { uid });
        const apiKey = stripeSecretKey.value();
        (0, logger_1.logInfo)("API Key loaded", { uid, keyLength: apiKey.length, prefix: apiKey.substring(0, 10) });
        // Test 1: Simple fetch to Stripe
        try {
            const testFetch = await fetch("https://api.stripe.com/v1/balance", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                },
            });
            (0, logger_1.logInfo)("Direct fetch result", { uid, status: testFetch.status });
        }
        catch (fetchError) {
            (0, logger_1.logError)("Direct fetch failed", fetchError, { uid });
        }
        // Test 2: Stripe SDK
        const stripe = new stripe_1.default(apiKey, {
            maxNetworkRetries: 2,
            timeout: 30000,
        });
        try {
            const balance = await stripe.balance.retrieve();
            (0, logger_1.logInfo)("Stripe SDK balance retrieved", { uid, available: balance.available });
            return {
                success: true,
                balance: balance.available,
            };
        }
        catch (sdkError) {
            (0, logger_1.logError)("Stripe SDK error", sdkError, { uid });
            return {
                success: false,
                error: sdkError.message,
                type: sdkError.type,
                code: sdkError.code,
            };
        }
    }
    catch (error) {
        (0, logger_1.logError)("Test failed", error);
        return {
            success: false,
            error: error.message,
        };
    }
});
//# sourceMappingURL=testStripeConnection.js.map