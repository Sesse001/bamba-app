// services/languages.js
// Read layer for supported languages + active-language selection.
//
// Caching strategy:
//   - Language list: cached in AsyncStorage for 1 hour
//   - Active language ID: cached in AsyncStorage forever, backed by Firestore

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
const ACTIVE_KEY = 'bamba.activeLanguageId';
const LANG_LIST_KEY = 'bamba.languagesList';
const LANG_LIST_TTL = 60 * 60 * 1000; // 1 hour

// ─────────────────────────────────────────────────────────────
// LANGUAGE READS (with caching)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all DEMO-enabled languages, sorted alphabetically by name.
 *
 * Strategy:
 *   1. Check AsyncStorage cache (< 1 hour old) → instant return
 *   2. Otherwise fetch from Firestore → cache it → return
 *
 * Cache is transparent — callers don't know or care.
 */
export async function getAllLanguages(options = {}) {
  const { forceRefresh = false } = options;

  try {
    // 1. Try cache first
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(LANG_LIST_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const age = Date.now() - (parsed.cachedAt || 0);
          if (age < LANG_LIST_TTL && Array.isArray(parsed.data)) {
            return { ok: true, data: parsed.data, source: 'cache' };
          }
        } catch {
          // Corrupt cache — ignore and refetch
        }
      }
    }

    // 2. Fetch from Firestore
    const q = query(
      collection(db, LANG_COL),
      where('status', '==', 'demo'),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 3. Cache for next time
    await AsyncStorage.setItem(
      LANG_LIST_KEY,
      JSON.stringify({ data, cachedAt: Date.now() })
    );

    return { ok: true, data, source: 'firestore' };
  } catch (error) {
    // If Firestore fails but we have stale cache, use it as fallback
    try {
      const cached = await AsyncStorage.getItem(LANG_LIST_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.data)) {
          return { ok: true, data: parsed.data, source: 'stale-cache' };
        }
      }
    } catch {
      // fall through to error
    }
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Fetch a single language by ID (from cache if available, else Firestore).
 */
export async function getLanguage(id) {
  try {
    if (!id) return { ok: false, error: 'No language ID provided' };

    // Prefer cache
    const cached = await AsyncStorage.getItem(LANG_LIST_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const found = parsed.data?.find((l) => l.id === id);
        if (found) return { ok: true, data: found, source: 'cache' };
      } catch {
        // corrupt cache, fall through
      }
    }

    // Fallback to Firestore
    const ref = doc(db, LANG_COL, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ok: false, error: 'Language not found' };
    }
    return { ok: true, data: { id: snap.id, ...snap.data() }, source: 'firestore' };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Clear the language list cache (e.g. after a seed).
 */
export async function clearLanguagesCache() {
  try {
    await AsyncStorage.removeItem(LANG_LIST_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// ACTIVE LANGUAGE
// ─────────────────────────────────────────────────────────────

/**
 * Get the current user's active language ID.
 * Cache-first, Firestore fallback.
 */
export async function getActiveLanguageId(uid) {
  try {
    const cached = await AsyncStorage.getItem(ACTIVE_KEY);
    if (cached) {
      return { ok: true, languageId: cached, source: 'cache' };
    }

    if (!uid) {
      return { ok: true, languageId: null, source: 'none' };
    }

    const ref = doc(db, USERS_COL, uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const firestoreId = data.activeLanguageId || null;

      if (firestoreId) {
        await AsyncStorage.setItem(ACTIVE_KEY, firestoreId);
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
 * Writes AsyncStorage first (instant), then Firestore.
 */
export async function setActiveLanguageId(uid, languageId) {
  try {
    if (!uid) return { ok: false, error: 'No user ID provided' };
    if (!languageId) return { ok: false, error: 'No language ID provided' };

    await AsyncStorage.setItem(ACTIVE_KEY, languageId);

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
 */
export async function clearActiveLanguageCache() {
  try {
    await AsyncStorage.removeItem(ACTIVE_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}