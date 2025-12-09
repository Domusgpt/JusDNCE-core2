"use strict";
/**
 * jusDNCE AI - Credit Management Utility
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndDeductCredits = checkAndDeductCredits;
exports.addCredits = addCredits;
const firebase_admin_1 = require("firebase-admin");
const v2_1 = require("firebase-functions/v2");
const logger_1 = require("./logger");
/**
 * Check and deduct credits for a user
 * @param uid User ID
 * @param amount Credits to deduct
 * @returns Remaining credits after deduction
 * @throws HttpsError if insufficient credits
 */
async function checkAndDeductCredits(uid, amount) {
    const db = (0, firebase_admin_1.firestore)();
    const userRef = db.collection("users").doc(uid);
    try {
        const result = await db.runTransaction(async (transaction) => {
            var _a;
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new v2_1.https.HttpsError("not-found", "User document not found");
            }
            const currentCredits = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.credits) || 0;
            if (currentCredits < amount) {
                (0, logger_1.logWarning)("Insufficient credits", {
                    uid,
                    currentCredits,
                    requiredCredits: amount,
                });
                throw new v2_1.https.HttpsError("failed-precondition", `Insufficient credits. You have ${currentCredits} credits but need ${amount}.`);
            }
            const newCredits = currentCredits - amount;
            transaction.update(userRef, {
                credits: newCredits,
                lastGenerationAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            });
            return newCredits;
        });
        (0, logger_1.logInfo)("Credits deducted", { uid, amount, remaining: result });
        return result;
    }
    catch (error) {
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        throw new v2_1.https.HttpsError("internal", "Failed to process credit deduction");
    }
}
/**
 * Add credits to a user account (for purchases)
 * @param uid User ID
 * @param amount Credits to add
 * @returns New credit balance
 */
async function addCredits(uid, amount) {
    const db = (0, firebase_admin_1.firestore)();
    const userRef = db.collection("users").doc(uid);
    try {
        const result = await db.runTransaction(async (transaction) => {
            var _a;
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new v2_1.https.HttpsError("not-found", "User document not found");
            }
            const currentCredits = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.credits) || 0;
            const newCredits = currentCredits + amount;
            transaction.update(userRef, {
                credits: newCredits,
                lastPurchaseAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            });
            return newCredits;
        });
        (0, logger_1.logInfo)("Credits added", { uid, amount, newBalance: result });
        return result;
    }
    catch (error) {
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        throw new v2_1.https.HttpsError("internal", "Failed to add credits");
    }
}
//# sourceMappingURL=credits.js.map