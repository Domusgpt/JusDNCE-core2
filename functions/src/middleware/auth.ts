/**
 * jusDNCE AI - Authentication Middleware
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

import { auth } from "firebase-admin";
import { https } from "firebase-functions/v2";

/**
 * Verify Firebase Auth token from callable function context
 */
export async function verifyAuth(request: https.CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new https.HttpsError(
      "unauthenticated",
      "User must be authenticated to generate dance videos"
    );
  }

  return request.auth.uid;
}

/**
 * Get authenticated user's email
 */
export async function getUserEmail(uid: string): Promise<string> {
  try {
    const userRecord = await auth().getUser(uid);
    return userRecord.email || "";
  } catch (error) {
    console.error("Error fetching user email:", error);
    return "";
  }
}
