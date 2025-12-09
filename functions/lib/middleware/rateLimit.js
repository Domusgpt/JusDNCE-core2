"use strict";
/**
 * jusDNCE AI - Rate Limiting Middleware
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const firebase_admin_1 = require("firebase-admin");
const v2_1 = require("firebase-functions/v2");
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 generations per minute max
/**
 * Check if user has exceeded rate limit
 * @param uid User ID to check
 * @throws HttpsError if rate limit exceeded
 */
async function checkRateLimit(uid) {
    const db = (0, firebase_admin_1.firestore)();
    const rateLimitRef = db.collection("rateLimits").doc(uid);
    const now = Date.now();
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(rateLimitRef);
            if (!doc.exists) {
                // First request - create new rate limit doc
                transaction.set(rateLimitRef, {
                    count: 1,
                    windowStart: now,
                });
                return;
            }
            const data = doc.data();
            const windowElapsed = now - data.windowStart;
            if (windowElapsed > RATE_LIMIT_WINDOW) {
                // Window expired - reset counter
                transaction.set(rateLimitRef, {
                    count: 1,
                    windowStart: now,
                });
                return;
            }
            // Within current window
            if (data.count >= MAX_REQUESTS_PER_WINDOW) {
                const timeRemaining = Math.ceil((RATE_LIMIT_WINDOW - windowElapsed) / 1000);
                throw new v2_1.https.HttpsError("resource-exhausted", `Rate limit exceeded. Please wait ${timeRemaining} seconds before trying again.`);
            }
            // Increment counter
            transaction.update(rateLimitRef, {
                count: data.count + 1,
            });
        });
    }
    catch (error) {
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        console.error("Rate limit check error:", error);
        // Don't block request on rate limit storage errors
    }
}
//# sourceMappingURL=rateLimit.js.map