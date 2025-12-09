"use strict";
/**
 * jusDNCE AI - Stripe Checkout Session Creator
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 *
 * Creates Stripe Checkout sessions for credit purchases.
 * Industry-standard secure payment flow using Stripe hosted checkout.
 * Uses native fetch instead of Stripe SDK to work around Cloud Run network issues.
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCheckoutSession = exports.createCheckoutSession = void 0;
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const auth_1 = require("./middleware/auth");
const logger_1 = require("./utils/logger");
// Secrets from Secret Manager
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// Credit pack configuration - matches frontend constants.ts
const CREDIT_PACKS = {
    pack_1: { credits: 1, priceCents: 100, name: "1 Credit" },
    pack_10: { credits: 10, priceCents: 500, name: "10 Credits" },
    pack_25: { credits: 25, priceCents: 1000, name: "25 Credits" },
    pack_60: { credits: 60, priceCents: 2000, name: "60 Credits" },
    pack_100: { credits: 100, priceCents: 3000, name: "100 Credits" },
};
// Subscription configuration
const SUBSCRIPTION_CONFIG = {
    priceCents: 800, // $8/month
    name: "Pro Subscription",
    dailyCredits: 2,
};
/**
 * Create a Stripe Checkout Session using raw fetch
 * This bypasses the Stripe SDK's HTTP client which can have issues in Cloud Run
 * Supports both one-time payments (credit packs) and subscriptions
 */
async function createStripeSession(apiKey, params) {
    var _a;
    const formData = new URLSearchParams();
    const isSubscription = params.mode === "subscription";
    // Mode: payment (one-time) or subscription
    formData.append("mode", isSubscription ? "subscription" : "payment");
    if (isSubscription) {
        // Subscription mode - $8/month Pro subscription
        formData.append("line_items[0][price_data][currency]", "usd");
        formData.append("line_items[0][price_data][unit_amount]", SUBSCRIPTION_CONFIG.priceCents.toString());
        formData.append("line_items[0][price_data][product_data][name]", SUBSCRIPTION_CONFIG.name);
        formData.append("line_items[0][price_data][product_data][description]", "No Ads + 2 Free Credits Daily + Priority Generation");
        formData.append("line_items[0][price_data][recurring][interval]", "month");
        formData.append("line_items[0][quantity]", "1");
        // Metadata for subscription
        formData.append("metadata[userId]", params.uid);
        formData.append("metadata[productType]", "subscription");
        formData.append("metadata[dailyCredits]", SUBSCRIPTION_CONFIG.dailyCredits.toString());
        formData.append("metadata[timestamp]", new Date().toISOString());
    }
    else {
        // One-time payment mode - credit packs
        const packId = params.packId || "pack_10"; // Default to 10-credit pack
        const pack = CREDIT_PACKS[packId];
        if (!pack) {
            throw new Error(`Invalid pack ID: ${packId}. Valid options: ${Object.keys(CREDIT_PACKS).join(", ")}`);
        }
        formData.append("line_items[0][price_data][currency]", "usd");
        formData.append("line_items[0][price_data][unit_amount]", pack.priceCents.toString());
        formData.append("line_items[0][price_data][product_data][name]", `jusDNCE ${pack.name}`);
        formData.append("line_items[0][price_data][product_data][description]", `${pack.credits} AI Dance Generation${pack.credits > 1 ? "s" : ""}`);
        formData.append("line_items[0][quantity]", "1");
        // Metadata for credits
        formData.append("metadata[userId]", params.uid);
        formData.append("metadata[credits]", pack.credits.toString());
        formData.append("metadata[packId]", packId);
        formData.append("metadata[productType]", "credits");
        formData.append("metadata[timestamp]", new Date().toISOString());
    }
    // URLs
    formData.append("success_url", `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`);
    formData.append("cancel_url", `${params.cancelUrl}?canceled=true`);
    // Customer email if available
    if (params.email) {
        formData.append("customer_email", params.email);
    }
    // Expiration (30 minutes) - only for one-time payments
    if (!isSubscription) {
        formData.append("expires_at", Math.floor(Date.now() / 1000 + 30 * 60).toString());
    }
    // Allow promo codes
    formData.append("allow_promotion_codes", "true");
    // Billing address
    formData.append("billing_address_collection", "auto");
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Stripe-Version": "2024-10-28.acacia",
        },
        body: formData.toString(),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Stripe API error: ${((_a = errorData.error) === null || _a === void 0 ? void 0 : _a.message) || response.statusText}`);
    }
    const data = await response.json();
    return { id: data.id, url: data.url };
}
/**
 * Create Stripe Checkout Session
 * Callable function - requires authentication
 */
exports.createCheckoutSession = v2_1.https.onCall({
    secrets: [stripeSecretKey],
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (request) => {
    var _a, _b, _c;
    const startTime = Date.now();
    try {
        // 1. Verify authentication - REQUIRED
        const uid = await (0, auth_1.verifyAuth)(request);
        (0, logger_1.logInfo)("Checkout session request started", {
            uid,
            timestamp: new Date().toISOString(),
        });
        // 2. Validate input URLs
        const { successUrl, cancelUrl } = request.data;
        if (!successUrl || !cancelUrl) {
            (0, logger_1.logWarning)("Missing redirect URLs", { uid, successUrl, cancelUrl });
            throw new v2_1.https.HttpsError("invalid-argument", "Success and cancel URLs are required");
        }
        // Validate URLs are from allowed domains
        const allowedDomains = [
            "jusdnce-ai.web.app",
            "jusdnce-ai.firebaseapp.com",
            "localhost",
            "127.0.0.1",
        ];
        const validateUrl = (url) => {
            try {
                const parsed = new URL(url);
                return allowedDomains.some((domain) => parsed.hostname === domain ||
                    parsed.hostname.endsWith(`.${domain}`));
            }
            catch (_a) {
                return false;
            }
        };
        if (!validateUrl(successUrl) || !validateUrl(cancelUrl)) {
            (0, logger_1.logWarning)("Invalid redirect URLs - domain not allowed", {
                uid,
                successUrl,
                cancelUrl,
            });
            throw new v2_1.https.HttpsError("invalid-argument", "Redirect URLs must be from allowed domains");
        }
        // 3. Get Stripe secret key
        const apiKey = stripeSecretKey.value();
        if (!apiKey) {
            (0, logger_1.logError)("Stripe API key not configured", new Error("Missing secret"));
            throw new v2_1.https.HttpsError("internal", "Payment system not configured");
        }
        // 4. Create Checkout Session using raw fetch
        (0, logger_1.logInfo)("Creating checkout session with Stripe (fetch)", {
            uid,
            keyPrefix: apiKey.substring(0, 12),
        });
        const session = await createStripeSession(apiKey, {
            uid,
            email: (_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email,
            successUrl,
            cancelUrl,
        });
        const duration = Date.now() - startTime;
        const packId = request.data.packId || "pack_10";
        const pack = CREDIT_PACKS[packId] || CREDIT_PACKS.pack_10;
        (0, logger_1.logInfo)("Checkout session created", {
            uid,
            sessionId: session.id,
            amount: pack.priceCents,
            credits: pack.credits,
            packId,
            duration: `${duration}ms`,
        });
        if (!session.url) {
            (0, logger_1.logError)("Stripe session created without URL", new Error("Missing session URL"), { uid, sessionId: session.id });
            throw new v2_1.https.HttpsError("internal", "Failed to create checkout session");
        }
        return {
            sessionId: session.id,
            url: session.url,
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        (0, logger_1.logError)("Checkout session creation failed", error, {
            uid: (_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid,
            duration: `${duration}ms`,
        });
        throw new v2_1.https.HttpsError("internal", "Failed to create checkout session. Please try again.");
    }
});
/**
 * Retrieve a Stripe Checkout Session using raw fetch
 */
async function getStripeSession(apiKey, sessionId) {
    var _a;
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Stripe-Version": "2024-10-28.acacia",
        },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Stripe API error: ${((_a = errorData.error) === null || _a === void 0 ? void 0 : _a.message) || response.statusText}`);
    }
    return response.json();
}
/**
 * Verify Checkout Session Status
 * Used by frontend to confirm payment completion
 */
exports.verifyCheckoutSession = v2_1.https.onCall({
    secrets: [stripeSecretKey],
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "128MiB",
}, async (request) => {
    var _a, _b, _c, _d;
    try {
        // 1. Verify authentication
        const uid = await (0, auth_1.verifyAuth)(request);
        const { sessionId } = request.data;
        if (!sessionId) {
            throw new v2_1.https.HttpsError("invalid-argument", "Session ID is required");
        }
        // 2. Get Stripe secret key
        const apiKey = stripeSecretKey.value();
        if (!apiKey) {
            throw new v2_1.https.HttpsError("internal", "Payment system not configured");
        }
        // 3. Retrieve session from Stripe using fetch
        const session = await getStripeSession(apiKey, sessionId);
        // 4. Verify the session belongs to this user
        if (((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId) !== uid) {
            (0, logger_1.logWarning)("Session user mismatch", {
                uid,
                sessionUserId: (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.userId,
                sessionId,
            });
            throw new v2_1.https.HttpsError("permission-denied", "Session does not belong to this user");
        }
        (0, logger_1.logInfo)("Checkout session verified", {
            uid,
            sessionId,
            status: session.payment_status,
            paid: session.payment_status === "paid",
        });
        return {
            status: session.payment_status,
            paid: session.payment_status === "paid",
            credits: session.payment_status === "paid"
                ? parseInt(((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.credits) || "0", 10)
                : undefined,
        };
    }
    catch (error) {
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        (0, logger_1.logError)("Session verification failed", error, {
            uid: (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid,
        });
        throw new v2_1.https.HttpsError("internal", "Failed to verify session");
    }
});
//# sourceMappingURL=createCheckoutSession.js.map