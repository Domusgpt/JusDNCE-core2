"use strict";
/**
 * jusDNCE AI - Authentication Middleware
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = verifyAuth;
exports.getUserEmail = getUserEmail;
const firebase_admin_1 = require("firebase-admin");
const v2_1 = require("firebase-functions/v2");
/**
 * Verify Firebase Auth token from callable function context
 */
async function verifyAuth(request) {
    if (!request.auth) {
        throw new v2_1.https.HttpsError("unauthenticated", "User must be authenticated to generate dance videos");
    }
    return request.auth.uid;
}
/**
 * Get authenticated user's email
 */
async function getUserEmail(uid) {
    try {
        const userRecord = await (0, firebase_admin_1.auth)().getUser(uid);
        return userRecord.email || "";
    }
    catch (error) {
        console.error("Error fetching user email:", error);
        return "";
    }
}
//# sourceMappingURL=auth.js.map