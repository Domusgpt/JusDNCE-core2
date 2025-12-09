/**
 * jusDNCE Firestore Helper Functions
 * A Paul Phillips Manifestation
 *
 * Firestore database operations for user management and credits
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { db } from "./firebase";
import { UserTier } from "../types";
import { FREE_TIER, SUBSCRIPTION } from "../constants";

export interface UserDocument {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  credits: number;
  tier: UserTier;
  isSubscriber: boolean;
  lastDailyCreditClaim: any;  // Firestore Timestamp - when user last claimed daily credit
  createdAt: any;  // Firestore Timestamp
  lastLogin: any;  // Firestore Timestamp
}

/**
 * Check if user can claim daily credit
 * Returns true if more than 24 hours since last claim
 */
const canClaimDailyCredit = (lastClaim: any): boolean => {
  if (!lastClaim) return true;

  const lastClaimDate = lastClaim.toDate ? lastClaim.toDate() : new Date(lastClaim);
  const now = new Date();
  const hoursSinceClaim = (now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60);

  return hoursSinceClaim >= 24;
};

/**
 * Create a new user document in Firestore
 * Grants 5 free credits on signup (updated from 3)
 */
export const createUserDocument = async (
  uid: string,
  email: string,
  name: string,
  photoURL: string
): Promise<void> => {
  const userRef = doc(db, "users", uid);

  // Check if user already exists
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    // Update last login
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
    return;
  }

  // Create new user with 5 free credits (updated from 3)
  await setDoc(userRef, {
    uid,
    email,
    name,
    photoURL,
    credits: FREE_TIER.signupCredits,  // 5 credits on signup
    tier: 'free' as UserTier,
    isSubscriber: false,
    lastDailyCreditClaim: null,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  });
};

/**
 * Claim daily free credit
 * Returns the number of credits claimed (0 if not eligible, 1 for free users, 2 for subscribers)
 */
export const claimDailyCredit = async (uid: string): Promise<{ claimed: number; message: string }> => {
  const userRef = doc(db, "users", uid);
  const userDoc = await getUserDocument(uid);

  if (!userDoc) {
    return { claimed: 0, message: "User not found" };
  }

  // Check if eligible for daily credit
  if (!canClaimDailyCredit(userDoc.lastDailyCreditClaim)) {
    const lastClaim = userDoc.lastDailyCreditClaim?.toDate ?
      userDoc.lastDailyCreditClaim.toDate() :
      new Date(userDoc.lastDailyCreditClaim);
    const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
    const hoursLeft = Math.ceil((nextClaim.getTime() - Date.now()) / (1000 * 60 * 60));

    return {
      claimed: 0,
      message: `Daily credit already claimed. Next credit available in ${hoursLeft} hours.`
    };
  }

  // Determine credit amount: subscribers get 2, free users get 1
  const creditAmount = userDoc.isSubscriber ? SUBSCRIPTION.dailyCredits : FREE_TIER.dailyCredits;
  const newCredits = userDoc.credits + creditAmount;

  await updateDoc(userRef, {
    credits: newCredits,
    lastDailyCreditClaim: serverTimestamp()
  });

  return {
    claimed: creditAmount,
    message: `Claimed ${creditAmount} daily credit${creditAmount > 1 ? 's' : ''}!`
  };
};

/**
 * Get user document from Firestore
 */
export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as UserDocument;
};

/**
 * Get user credits
 */
export const getUserCredits = async (uid: string): Promise<number> => {
  const userDoc = await getUserDocument(uid);
  return userDoc?.credits ?? 0;
};

/**
 * Update user credits
 * Use positive amount to add credits, negative to deduct
 */
export const updateUserCredits = async (uid: string, amount: number): Promise<number> => {
  const userRef = doc(db, "users", uid);
  const userDoc = await getUserDocument(uid);

  if (!userDoc) {
    throw new Error("User document not found");
  }

  const newCredits = Math.max(0, userDoc.credits + amount);

  await updateDoc(userRef, {
    credits: newCredits
  });

  return newCredits;
};

/**
 * Subscribe to real-time credit updates
 * Returns unsubscribe function
 */
export const subscribeToCredits = (
  uid: string,
  callback: (credits: number) => void
): Unsubscribe => {
  const userRef = doc(db, "users", uid);

  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data() as UserDocument;
      callback(data.credits);
    }
  });
};

/**
 * Upgrade user to Pro tier
 */
export const upgradeUserToPro = async (uid: string): Promise<void> => {
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    tier: 'pro' as UserTier
  });
};
