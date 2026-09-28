// services/languages.js
// Read layer for supported languages + active-language selection.
//
// Languages themselves are seeded via scripts/seed.js.
// This file only reads them and manages which one the current user has active.
//
// Active language persistence:
//   - AsyncStorage: cache for instant startup
//   - Firestore:   source of truth for cross-device sync (users/{uid}.activeLanguageId)

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

const LANG_COL = 'languages';
const USERS_COL = 'users';
const CACHE_KEY = 'bamba.activeLanguageId';

// ─────────────────────────────────────────────────────────────
// LANGUAGE READS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all DEMO-enabled languages, sorted alphabetically by name.
 *
 * Filters to docs where status === 'demo'. V1 docs (af, en, nr, nso, ss, tn,
 * ve, xh) have no `status` field — Firestore's `==` filter excludes docs
 * missing the field, so they're automatically excluded without touching V1 data.
 *
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getAllLanguages() {
  try {
    const q = query(
      collection(db, LANG_COL),
      where('status', '==', 'demo'),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Fetch a single language by ID.
 * @param {string} id
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function getLanguage(id) {
  try {
    if (!id) return { ok: false, error: 'No language ID provided' };
    const ref = doc(db, LANG_COL, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ok: false, error: 'Language not found' };
    }
    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// ACTIVE LANGUAGE
// ─────────────────────────────────────────────────────────────

/**
 * Get the current user's active language ID.
 *
 * Strategy:
 *   1. Read from AsyncStorage (instant)
 *   2. Fall back to Firestore users/{uid}.activeLanguageId (persistent)
 *   3. Return null if neither is set
 *
 * @param {string} uid
 * @returns {Promise<{ ok: boolean, languageId?: string | null, source?: 'cache' | 'firestore' | 'none', error?: string }>}
 */
export async function getActiveLanguageId(uid) {
  try {
    // 1. Cache first
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      return { ok: true, languageId: cached, source: 'cache' };
    }

    // 2. Fall back to Firestore
    if (!uid) {
      return { ok: true, languageId: null, source: 'none' };
    }

    const ref = doc(db, USERS_COL, uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const firestoreId = data.activeLanguageId || null;

      // Warm the cache for next boot
      if (firestoreId) {
        await AsyncStorage.setItem(CACHE_KEY, firestoreId);
      }

      return { ok: true, languageId: firestoreId, source: 'firestore' };
    }

    return { ok: true, languageId: null, source: 'none' };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Set the current user's active language.
 * Writes to AsyncStorage immediately (fast UI), then Firestore (persistent).
 *
 * @param {string} uid
 * @param {string} languageId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function setActiveLanguageId(uid, languageId) {
  try {
    if (!uid) return { ok: false, error: 'No user ID provided' };
    if (!languageId) return { ok: false, error: 'No language ID provided' };

    // 1. Cache first — instant for the UI
    await AsyncStorage.setItem(CACHE_KEY, languageId);

    // 2. Persist to Firestore — source of truth
    const ref = doc(db, USERS_COL, uid);
    await updateDoc(ref, {
      activeLanguageId: languageId,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Clear the cached active language (e.g. on sign-out).
 * Firestore value is NOT cleared — it's the persistent preference.
 */
export async function clearActiveLanguageCache() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}