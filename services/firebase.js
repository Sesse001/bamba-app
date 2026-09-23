// services/firebase.js
// Bamba V2 — Firebase initialization
// Hardcoded config for dev. Move to .env with EXPO_PUBLIC_ prefix before public release.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDtK1tggcJkQcLQUJ7fANsSBbRhHzw3U28",
  authDomain: "linguacore-45ee6.firebaseapp.com",
  projectId: "linguacore-45ee6",
  storageBucket: "linguacore-45ee6.firebasestorage.app",
  messagingSenderId: "1074135238590",
  appId: "1:1074135238590:web:5bac09ccc5df75891a1bef",
};

// Guard against re-initialization during hot reload (Expo Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Simple connection test.
 * Writes a timestamped doc to `_healthcheck/latest` and reads it back.
 * Returns { ok: true, data } on success, { ok: false, error } on failure.
 */
export async function testConnection() {
  try {
    const ref = doc(db, '_healthcheck', 'latest');

    await setDoc(ref, {
      lastPing: serverTimestamp(),
      client: 'bamba-v2',
      platform: 'expo',
    });

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, error: 'Doc written but read returned empty' };
    }

    return { ok: true, data: snap.data() };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}