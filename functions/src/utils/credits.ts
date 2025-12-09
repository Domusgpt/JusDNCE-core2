/**
 * jusDNCE AI - Credit Management Utility
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

import { firestore } from "firebase-admin";
import { https } from "firebase-functions/v2";
import { logInfo, logWarning } from "./logger";

/**
 * Check and deduct credits for a user
 * @param uid User ID
 * @param amount Credits to deduct
 * @returns Remaining credits after deduction
 * @throws HttpsError if insufficient credits
 */
export async function checkAndDeductCredits(
  uid: string,
  amount: number
): Promise<number> {
  const db = firestore();
  const userRef = db.collection("users").doc(uid);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new https.HttpsError(
          "not-found",
          "User document not found"
        );
      }

      const currentCredits = userDoc.data()?.credits || 0;

      if (currentCredits < amount) {
        logWarning("Insufficient credits", {
          uid,
          currentCredits,
          requiredCredits: amount,
        });
        throw new https.HttpsError(
          "failed-precondition",
          `Insufficient credits. You have ${currentCredits} credits but need ${amount}.`
        );
      }

      const newCredits = currentCredits - amount;

      transaction.update(userRef, {
        credits: newCredits,
        lastGenerationAt: firestore.FieldValue.serverTimestamp(),
      });

      return newCredits;
    });

    logInfo("Credits deducted", { uid, amount, remaining: result });
    return result;
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    throw new https.HttpsError(
      "internal",
      "Failed to process credit deduction"
    );
  }
}

/**
 * Add credits to a user account (for purchases)
 * @param uid User ID
 * @param amount Credits to add
 * @returns New credit balance
 */
export async function addCredits(uid: string, amount: number): Promise<number> {
  const db = firestore();
  const userRef = db.collection("users").doc(uid);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new https.HttpsError(
          "not-found",
          "User document not found"
        );
      }

      const currentCredits = userDoc.data()?.credits || 0;
      const newCredits = currentCredits + amount;

      transaction.update(userRef, {
        credits: newCredits,
        lastPurchaseAt: firestore.FieldValue.serverTimestamp(),
      });

      return newCredits;
    });

    logInfo("Credits added", { uid, amount, newBalance: result });
    return result;
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    throw new https.HttpsError(
      "internal",
      "Failed to add credits"
    );
  }
}
