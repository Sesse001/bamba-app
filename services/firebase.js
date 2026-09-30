// services/firebase.js
// Bamba V2 — Firebase initialization.
//
// Config is read from environment variables (EXPO_PUBLIC_*).
// These are safe to expose in the client bundle — Firebase client
// config is not a secret. Security comes from Firestore rules.
//
// See .env for values. .env is git-ignored.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Guard against re-initialization during hot reload (Expo Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence on first boot.
// On hot reload, Firebase is already initialized — just grab the instance.
export const auth =
  getApps().length === 1 && getApps()[0] === app
    ? (() => {
        try {
          return initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
        } catch {
          // Already initialized (Fast Refresh) — fall back to getAuth
          return getAuth(app);
        }
      })()
    : getAuth(app);

export const db = getFirestore(app);