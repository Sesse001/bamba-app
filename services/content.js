// services/content.js
// Read layer for learning content + its translations subcollection.
//
// Structure:
//   learning_content/{contentId}
//   learning_content/{contentId}/translations/{translationId}
//
// Content is seeded via scripts/seed.js.
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
 * Sorted by `order` ascending (curriculum flow).
 *
 * @param {string} languageId  e.g. "zu"
 * @param {object} [options]
 * @param {number} [options.maxItems]  default 50
 * @param {string} [options.lessonId]  optional filter for a specific lesson
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getContentByLanguage(languageId, options = {}) {
  try {
    if (!languageId) {
      return { ok: false, error: 'No language ID provided' };
    }

    const { maxItems = 50, lessonId = null } = options;

    // Build query — Firestore needs the composite index for where + orderBy.
    // We'll add the index once the seed runs and Firestore complains.
    const constraints = [
      where('languageId', '==', languageId),
    ];

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
 * Includes both demo/curated translations AND any linked community ones
 * that have been promoted into the subcollection.
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
 * Fetch the first "lesson" worth of content for a language.
 * For the demo, this returns the first N items of the language —
 * sorted by `order` ascending.
 *
 * @param {string} languageId
 * @param {number} [count]  default 10
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getDemoLesson(languageId, count = 10) {
  return getContentByLanguage(languageId, { maxItems: count });
}