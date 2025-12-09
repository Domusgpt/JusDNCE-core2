/**
 * Debug function to test Stripe connectivity
 */

import { https } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { verifyAuth } from "./middleware/auth";
import { logInfo, logError } from "./utils/logger";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const testStripeConnection = https.onCall(
  {
    secrets: [stripeSecretKey],
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    try {
      const uid = await verifyAuth(request);
      logInfo("Testing Stripe connection", { uid });

      const apiKey = stripeSecretKey.value();
      logInfo("API Key loaded", { uid, keyLength: apiKey.length, prefix: apiKey.substring(0, 10) });

      // Test 1: Simple fetch to Stripe
      try {
        const testFetch = await fetch("https://api.stripe.com/v1/balance", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });
        logInfo("Direct fetch result", { uid, status: testFetch.status });
      } catch (fetchError: any) {
        logError("Direct fetch failed", fetchError, { uid });
      }

      // Test 2: Stripe SDK
      const stripe = new Stripe(apiKey, {
        maxNetworkRetries: 2,
        timeout: 30000,
      });

      try {
        const balance = await stripe.balance.retrieve();
        logInfo("Stripe SDK balance retrieved", { uid, available: balance.available });
        return {
          success: true,
          balance: balance.available,
        };
      } catch (sdkError: any) {
        logError("Stripe SDK error", sdkError, { uid });
        return {
          success: false,
          error: sdkError.message,
          type: sdkError.type,
          code: sdkError.code,
        };
      }
    } catch (error: any) {
      logError("Test failed", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);
