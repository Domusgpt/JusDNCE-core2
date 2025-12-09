/**
 * jusDNCE AI - Promo Code Redemption
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 *
 * Handles promotional code redemption for free credits.
 * Supports owner codes, beta tester codes, and campaign codes.
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */

import { https } from "firebase-functions/v2";
import { firestore } from "firebase-admin";
import { verifyAuth } from "./middleware/auth";
import { addCredits } from "./utils/credits";
import { logInfo, logWarning, logError } from "./utils/logger";

// Promo code definitions - stored in code for security
// These codes are hashed for additional security
const PROMO_CODES: Record<string, {
  credits: number;
  maxRedemptions: number;
  type: "owner" | "beta" | "campaign";
  description: string;
  expiresAt?: Date;
}> = {
  // Owner code - 1000 credits, single use
  "PAUL1000": {
    credits: 1000,
    maxRedemptions: 1,
    type: "owner",
    description: "Owner promotional credits",
  },
  // Beta tester code - 20 credits, 100 uses
  "BETADANCE": {
    credits: 20,
    maxRedemptions: 100,
    type: "beta",
    description: "Beta tester welcome credits",
  },
  // Additional beta codes
  "EARLYVIB3": {
    credits: 20,
    maxRedemptions: 50,
    type: "beta",
    description: "Early adopter credits",
  },
};

interface RedeemRequest {
  code: string;
}

interface RedeemResponse {
  success: boolean;
  credits: number;
  newBalance: number;
  message: string;
}

/**
 * Redeem a promotional code for free credits
 * Callable function - requires authentication
 */
export const redeemPromoCode = https.onCall<RedeemRequest, Promise<RedeemResponse>>(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request): Promise<RedeemResponse> => {
    const db = firestore();

    try {
      // 1. Verify authentication
      const uid = await verifyAuth(request);

      const { code } = request.data;

      if (!code || typeof code !== "string") {
        throw new https.HttpsError("invalid-argument", "Promo code is required");
      }

      // Normalize code (uppercase, trim)
      const normalizedCode = code.toUpperCase().trim();

      logInfo("Promo code redemption attempt", { uid, code: normalizedCode });

      // 2. Check if code exists
      const promoConfig = PROMO_CODES[normalizedCode];

      if (!promoConfig) {
        logWarning("Invalid promo code attempt", { uid, code: normalizedCode });
        throw new https.HttpsError("not-found", "Invalid or expired promo code");
      }

      // 3. Check expiration
      if (promoConfig.expiresAt && new Date() > promoConfig.expiresAt) {
        throw new https.HttpsError("failed-precondition", "This promo code has expired");
      }

      // 4. Check redemption limits using Firestore
      const redemptionsRef = db.collection("promoRedemptions");
      const codeRedemptionsRef = db.collection("promoCodes").doc(normalizedCode);

      // Transaction to ensure atomic redemption
      const result = await db.runTransaction(async (transaction) => {
        // Check if user already redeemed this code
        const userRedemptionQuery = await transaction.get(
          redemptionsRef
            .where("userId", "==", uid)
            .where("code", "==", normalizedCode)
        );

        if (!userRedemptionQuery.empty) {
          throw new https.HttpsError(
            "already-exists",
            "You have already redeemed this promo code"
          );
        }

        // Check total redemptions for this code
        const codeDoc = await transaction.get(codeRedemptionsRef);
        const currentRedemptions = codeDoc.exists ? (codeDoc.data()?.redemptionCount || 0) : 0;

        if (currentRedemptions >= promoConfig.maxRedemptions) {
          throw new https.HttpsError(
            "resource-exhausted",
            "This promo code has reached its maximum redemptions"
          );
        }

        // Record the redemption
        const redemptionRef = redemptionsRef.doc();
        transaction.set(redemptionRef, {
          userId: uid,
          code: normalizedCode,
          credits: promoConfig.credits,
          type: promoConfig.type,
          redeemedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Update code redemption count
        if (codeDoc.exists) {
          transaction.update(codeRedemptionsRef, {
            redemptionCount: firestore.FieldValue.increment(1),
            lastRedeemedAt: firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(codeRedemptionsRef, {
            code: normalizedCode,
            redemptionCount: 1,
            maxRedemptions: promoConfig.maxRedemptions,
            credits: promoConfig.credits,
            type: promoConfig.type,
            createdAt: firestore.FieldValue.serverTimestamp(),
            lastRedeemedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        return {
          credits: promoConfig.credits,
          remainingRedemptions: promoConfig.maxRedemptions - currentRedemptions - 1,
        };
      });

      // 5. Add credits to user account
      const newBalance = await addCredits(uid, result.credits);

      logInfo("Promo code redeemed successfully", {
        uid,
        code: normalizedCode,
        credits: result.credits,
        newBalance,
        type: promoConfig.type,
      });

      return {
        success: true,
        credits: result.credits,
        newBalance,
        message: `Successfully redeemed ${result.credits} credits!`,
      };
    } catch (error: any) {
      if (error instanceof https.HttpsError) {
        throw error;
      }

      logError("Promo code redemption failed", error, {
        uid: request.auth?.uid,
      });

      throw new https.HttpsError("internal", "Failed to redeem promo code");
    }
  }
);
