// services/content.js
// Read layer for learning content + its translations subcollection.
//
// Structure:
//   learning_content/{contentId}
//   learning_content/{contentId}/translations/{translationId}
//
// Content items now have a `tier` field (1-4).
// Use getContentByLanguage with options.tier to filter by tier.
//
// User-submitted translations live in `contributions/` (separate collection).
// This file only READS.

import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

const CONTENT_COL = 'learning_content';

// ─────────────────────────────────────────────────────────────
// CONTENT READS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch learning content for a specific language.
 *
 * Options:
 *   - maxItems: cap result count (default 100 — full pool)
 *   - tier: filter to a specific tier (1, 2, 3, 4) — optional
 *   - lessonId: filter to a specific lessonId — optional
 *
 * Sorted by `order` ascending.
 *
 * @param {string} languageId
 * @param {object} [options]
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getContentByLanguage(languageId, options = {}) {
  try {
    if (!languageId) {
      return { ok: false, error: 'No language ID provided' };
    }

    const { maxItems = 100, tier = null, lessonId = null } = options;

    const constraints = [where('languageId', '==', languageId)];

    if (tier !== null) {
      constraints.push(where('tier', '==', tier));
    }

    if (lessonId) {
      constraints.push(where('lessonId', '==', lessonId));
    }

    constraints.push(orderBy('order', 'asc'));
    constraints.push(limit(maxItems));

    const q = query(collection(db, CONTENT_COL), ...constraints);
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Fetch a single content item by ID.
 *
 * @param {string} contentId
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function getContentItem(contentId) {
  try {
    if (!contentId) {
      return { ok: false, error: 'No content ID provided' };
    }

    const ref = doc(db, CONTENT_COL, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, error: 'Content not found' };
    }

    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// TRANSLATIONS SUBCOLLECTION READS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all translations for a given content item.
 *
 * @param {string} contentId
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getTranslationsForContent(contentId) {
  try {
    if (!contentId) {
      return { ok: false, error: 'No content ID provided' };
    }

    const ref = collection(db, CONTENT_COL, contentId, 'translations');
    const snap = await getDocs(ref);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Fetch a single translation by ID.
 *
 * @param {string} contentId
 * @param {string} translationId
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function getTranslation(contentId, translationId) {
  try {
    if (!contentId || !translationId) {
      return { ok: false, error: 'Missing content or translation ID' };
    }

    const ref = doc(db, CONTENT_COL, contentId, 'translations', translationId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, error: 'Translation not found' };
    }

    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// CONVENIENCE
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the full content pool for a language (all 100 items across 4 tiers).
 * Used by Home and Learn to compute tier progression from actual progress.
 *
 * @param {string} languageId
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getFullLessonPool(languageId) {
  return getContentByLanguage(languageId, { maxItems: 100 });
}

/**
 * Fetch only a specific tier's items for a language.
 * Used when we know the user's current tier (from progress.js).
 *
 * @param {string} languageId
 * @param {number} tier
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getTierContent(languageId, tier) {
  return getContentByLanguage(languageId, { maxItems: 30, tier });
}

/**
 * Deprecated alias for backward compatibility.
 * Fetches the full pool. Use getFullLessonPool for clarity.
 *
 * @param {string} languageId
 * @param {number} [count]  — ignored, always returns full pool (up to 100)
 */
export async function getDemoLesson(languageId, count) {
  return getFullLessonPool(languageId);
}