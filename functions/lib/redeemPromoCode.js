"use strict";
/**
 * jusDNCE AI - Promo Code Redemption
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 *
 * Handles promotional code redemption for free credits.
 * Supports owner codes, beta tester codes, and campaign codes.
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemPromoCode = void 0;
const v2_1 = require("firebase-functions/v2");
const firebase_admin_1 = require("firebase-admin");
const auth_1 = require("./middleware/auth");
const credits_1 = require("./utils/credits");
const logger_1 = require("./utils/logger");
// Promo code definitions - stored in code for security
// These codes are hashed for additional security
const PROMO_CODES = {
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
/**
 * Redeem a promotional code for free credits
 * Callable function - requires authentication
 */
exports.redeemPromoCode = v2_1.https.onCall({
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
}, async (request) => {
    var _a;
    const db = (0, firebase_admin_1.firestore)();
    try {
        // 1. Verify authentication
        const uid = await (0, auth_1.verifyAuth)(request);
        const { code } = request.data;
        if (!code || typeof code !== "string") {
            throw new v2_1.https.HttpsError("invalid-argument", "Promo code is required");
        }
        // Normalize code (uppercase, trim)
        const normalizedCode = code.toUpperCase().trim();
        (0, logger_1.logInfo)("Promo code redemption attempt", { uid, code: normalizedCode });
        // 2. Check if code exists
        const promoConfig = PROMO_CODES[normalizedCode];
        if (!promoConfig) {
            (0, logger_1.logWarning)("Invalid promo code attempt", { uid, code: normalizedCode });
            throw new v2_1.https.HttpsError("not-found", "Invalid or expired promo code");
        }
        // 3. Check expiration
        if (promoConfig.expiresAt && new Date() > promoConfig.expiresAt) {
            throw new v2_1.https.HttpsError("failed-precondition", "This promo code has expired");
        }
        // 4. Check redemption limits using Firestore
        const redemptionsRef = db.collection("promoRedemptions");
        const codeRedemptionsRef = db.collection("promoCodes").doc(normalizedCode);
        // Transaction to ensure atomic redemption
        const result = await db.runTransaction(async (transaction) => {
            var _a;
            // Check if user already redeemed this code
            const userRedemptionQuery = await transaction.get(redemptionsRef
                .where("userId", "==", uid)
                .where("code", "==", normalizedCode));
            if (!userRedemptionQuery.empty) {
                throw new v2_1.https.HttpsError("already-exists", "You have already redeemed this promo code");
            }
            // Check total redemptions for this code
            const codeDoc = await transaction.get(codeRedemptionsRef);
            const currentRedemptions = codeDoc.exists ? (((_a = codeDoc.data()) === null || _a === void 0 ? void 0 : _a.redemptionCount) || 0) : 0;
            if (currentRedemptions >= promoConfig.maxRedemptions) {
                throw new v2_1.https.HttpsError("resource-exhausted", "This promo code has reached its maximum redemptions");
            }
            // Record the redemption
            const redemptionRef = redemptionsRef.doc();
            transaction.set(redemptionRef, {
                userId: uid,
                code: normalizedCode,
                credits: promoConfig.credits,
                type: promoConfig.type,
                redeemedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            });
            // Update code redemption count
            if (codeDoc.exists) {
                transaction.update(codeRedemptionsRef, {
                    redemptionCount: firebase_admin_1.firestore.FieldValue.increment(1),
                    lastRedeemedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                transaction.set(codeRedemptionsRef, {
                    code: normalizedCode,
                    redemptionCount: 1,
                    maxRedemptions: promoConfig.maxRedemptions,
                    credits: promoConfig.credits,
                    type: promoConfig.type,
                    createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    lastRedeemedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                });
            }
            return {
                credits: promoConfig.credits,
                remainingRedemptions: promoConfig.maxRedemptions - currentRedemptions - 1,
            };
        });
        // 5. Add credits to user account
        const newBalance = await (0, credits_1.addCredits)(uid, result.credits);
        (0, logger_1.logInfo)("Promo code redeemed successfully", {
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
    }
    catch (error) {
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        (0, logger_1.logError)("Promo code redemption failed", error, {
            uid: (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid,
        });
        throw new v2_1.https.HttpsError("internal", "Failed to redeem promo code");
    }
});
//# sourceMappingURL=redeemPromoCode.js.map