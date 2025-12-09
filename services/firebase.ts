/**
 * jusDNCE Firebase Configuration
 * A Paul Phillips Manifestation
 *
 * Firebase initialization and service exports for jusDNCE AI Platform
 * Handles Authentication, Firestore, and Cloud Functions
 *
 * © 2025 Paul Phillips - Clear Seas Solutions LLC
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Firebase configuration for jusdnce-ai project
// Configuration loaded from environment variables (.env.local)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for better UX
googleProvider.setCustomParameters({
  prompt: 'select_account'  // Always show account picker
});

// Email/Password auth helper functions
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const createAccountWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

// Google auth helper
export const signInWithGoogle = () =>
  signInWithPopup(auth, googleProvider);

export default app;
