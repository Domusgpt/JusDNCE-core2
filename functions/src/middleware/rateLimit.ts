/**
 * jusDNCE AI - Rate Limiting Middleware
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

import { firestore } from "firebase-admin";
import { https } from "firebase-functions/v2";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 generations per minute max

interface RateLimitDoc {
  count: number;
  windowStart: number;
}

/**
 * Check if user has exceeded rate limit
 * @param uid User ID to check
 * @throws HttpsError if rate limit exceeded
 */
export async function checkRateLimit(uid: string): Promise<void> {
  const db = firestore();
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

      const data = doc.data() as RateLimitDoc;
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
        throw new https.HttpsError(
          "resource-exhausted",
          `Rate limit exceeded. Please wait ${timeRemaining} seconds before trying again.`
        );
      }

      // Increment counter
      transaction.update(rateLimitRef, {
        count: data.count + 1,
      });
    });
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    console.error("Rate limit check error:", error);
    // Don't block request on rate limit storage errors
  }
}
