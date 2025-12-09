"use strict";
/**
 * jusDNCE AI - Stripe Webhook Handler
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = void 0;
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const credits_1 = require("./utils/credits");
const logger_1 = require("./utils/logger");
// Secrets from Secret Manager
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
/**
 * Stripe Webhook Handler
 * Handles checkout.session.completed events to add credits after successful payment
 */
exports.handleStripeWebhook = v2_1.https.onRequest({
    secrets: [stripeSecretKey, stripeWebhookSecret],
    region: "us-central1",
}, async (request, response) => {
    var _a, _b;
    try {
        // 1. Verify webhook signature
        const sig = request.headers["stripe-signature"];
        if (!sig || typeof sig !== "string") {
            (0, logger_1.logWarning)("Missing Stripe signature header");
            response.status(400).send("Missing signature");
            return;
        }
        const webhookSecret = stripeWebhookSecret.value();
        if (!webhookSecret) {
            (0, logger_1.logError)("Stripe webhook secret not configured", new Error("Missing secret"));
            response.status(500).send("Webhook secret not configured");
            return;
        }
        // 2. Initialize Stripe (using default API version from SDK)
        const stripe = new stripe_1.default(stripeSecretKey.value());
        // 3. Construct and verify event
        let event;
        try {
            event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
        }
        catch (err) {
            (0, logger_1.logError)("Webhook signature verification failed", err);
            response.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }
        (0, logger_1.logInfo)("Stripe webhook received", {
            type: event.type,
            id: event.id,
        });
        // 4. Handle specific events
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                // Extract user ID and credit amount from metadata
                const userId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId;
                const creditsStr = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.credits;
                if (!userId || !creditsStr) {
                    (0, logger_1.logWarning)("Missing metadata in checkout session", {
                        sessionId: session.id,
                        metadata: session.metadata,
                    });
                    response.status(400).send("Missing metadata");
                    return;
                }
                const credits = parseInt(creditsStr, 10);
                if (isNaN(credits) || credits <= 0) {
                    (0, logger_1.logWarning)("Invalid credit amount", {
                        sessionId: session.id,
                        credits: creditsStr,
                    });
                    response.status(400).send("Invalid credit amount");
                    return;
                }
                // 5. Add credits to user account
                try {
                    const newBalance = await (0, credits_1.addCredits)(userId, credits);
                    (0, logger_1.logInfo)("Credits added via Stripe payment", {
                        userId,
                        credits,
                        newBalance,
                        sessionId: session.id,
                        amountTotal: session.amount_total,
                    });
                    response.json({
                        success: true,
                        userId,
                        credits,
                        newBalance,
                    });
                }
                catch (error) {
                    (0, logger_1.logError)("Failed to add credits", error, {
                        userId,
                        credits,
                        sessionId: session.id,
                    });
                    response.status(500).send("Failed to add credits");
                }
                break;
            }
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                (0, logger_1.logInfo)("Payment succeeded", {
                    paymentIntentId: paymentIntent.id,
                    amount: paymentIntent.amount,
                });
                response.json({ received: true });
                break;
            }
            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                (0, logger_1.logWarning)("Payment failed", {
                    paymentIntentId: paymentIntent.id,
                    lastError: paymentIntent.last_payment_error,
                });
                response.json({ received: true });
                break;
            }
            default:
                (0, logger_1.logInfo)("Unhandled webhook event type", { type: event.type });
                response.json({ received: true });
        }
    }
    catch (error) {
        (0, logger_1.logError)("Webhook handler error", error);
        response.status(500).send("Internal server error");
    }
});
//# sourceMappingURL=stripeWebhook.js.map