/**
 * jusDNCE AI - Stripe Webhook Handler
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

import { https } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { addCredits } from "./utils/credits";
import { logInfo, logWarning, logError } from "./utils/logger";

// Secrets from Secret Manager
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

/**
 * Stripe Webhook Handler
 * Handles checkout.session.completed events to add credits after successful payment
 */
export const handleStripeWebhook = https.onRequest(
  {
    secrets: [stripeSecretKey, stripeWebhookSecret],
    region: "us-central1",
  },
  async (request, response) => {
    try {
      // 1. Verify webhook signature
      const sig = request.headers["stripe-signature"];

      if (!sig || typeof sig !== "string") {
        logWarning("Missing Stripe signature header");
        response.status(400).send("Missing signature");
        return;
      }

      const webhookSecret = stripeWebhookSecret.value();
      if (!webhookSecret) {
        logError("Stripe webhook secret not configured", new Error("Missing secret"));
        response.status(500).send("Webhook secret not configured");
        return;
      }

      // 2. Initialize Stripe (using default API version from SDK)
      const stripe = new Stripe(stripeSecretKey.value());

      // 3. Construct and verify event
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        logError("Webhook signature verification failed", err);
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      logInfo("Stripe webhook received", {
        type: event.type,
        id: event.id,
      });

      // 4. Handle specific events
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          // Extract user ID and credit amount from metadata
          const userId = session.metadata?.userId;
          const creditsStr = session.metadata?.credits;

          if (!userId || !creditsStr) {
            logWarning("Missing metadata in checkout session", {
              sessionId: session.id,
              metadata: session.metadata,
            });
            response.status(400).send("Missing metadata");
            return;
          }

          const credits = parseInt(creditsStr, 10);

          if (isNaN(credits) || credits <= 0) {
            logWarning("Invalid credit amount", {
              sessionId: session.id,
              credits: creditsStr,
            });
            response.status(400).send("Invalid credit amount");
            return;
          }

          // 5. Add credits to user account
          try {
            const newBalance = await addCredits(userId, credits);

            logInfo("Credits added via Stripe payment", {
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
          } catch (error: any) {
            logError("Failed to add credits", error, {
              userId,
              credits,
              sessionId: session.id,
            });
            response.status(500).send("Failed to add credits");
          }
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logInfo("Payment succeeded", {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
          });
          response.json({ received: true });
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logWarning("Payment failed", {
            paymentIntentId: paymentIntent.id,
            lastError: paymentIntent.last_payment_error,
          });
          response.json({ received: true });
          break;
        }

        default:
          logInfo("Unhandled webhook event type", { type: event.type });
          response.json({ received: true });
      }
    } catch (error: any) {
      logError("Webhook handler error", error);
      response.status(500).send("Internal server error");
    }
  }
);
