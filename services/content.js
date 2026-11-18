// services/content.js
// Read layer for learning content + its translations subcollection.

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

export async function getFullLessonPool(languageId) {
  return getContentByLanguage(languageId, { maxItems: 100 });
}

export async function getTierContent(languageId, tier) {
  return getContentByLanguage(languageId, { maxItems: 30, tier });
}

export async function getDemoLesson(languageId, count) {
  return getFullLessonPool(languageId);
}