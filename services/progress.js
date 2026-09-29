// services/progress.js
// Tracks per-user progress on learning content.
//
// Structure:
//   users/{uid}/progress/{contentId}
//     seen:        boolean  — user opened the card
//     attempts:    number   — how many times they've interacted
//     completed:   boolean  — marked as done (revealed + submitted or skipped)
//     firstSeenAt: timestamp
//     lastSeenAt:  timestamp
//
// contentId is the deterministic learning_content ID, e.g. "zu_greeting_hello".
// Using contentId as the doc ID means progress is naturally unique per item
// AND naturally isolated per language (since content IDs include the language code).

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';
const PROGRESS_SUBCOL = 'progress';

// ─────────────────────────────────────────────────────────────
// REFS
// ─────────────────────────────────────────────────────────────

function progressCol(uid) {
  return collection(db, USERS_COL, uid, PROGRESS_SUBCOL);
}

function progressDoc(uid, contentId) {
  return doc(db, USERS_COL, uid, PROGRESS_SUBCOL, contentId);
}

// ─────────────────────────────────────────────────────────────
// MARK EVENTS
// ─────────────────────────────────────────────────────────────

/**
 * Mark a content item as seen. Creates the progress doc if it doesn't exist.
 * Idempotent — safe to call repeatedly.
 */
export async function markSeen(uid, contentId) {
  try {
    if (!uid || !contentId) {
      return { ok: false, error: 'Missing uid or contentId' };
    }

    const ref = progressDoc(uid, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        contentId,
        seen: true,
        attempts: 0,
        completed: false,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        seen: true,
        lastSeenAt: serverTimestamp(),
      });
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Increment attempts counter and update lastSeenAt.
 */
export async function markAttempt(uid, contentId) {
  try {
    if (!uid || !contentId) {
      return { ok: false, error: 'Missing uid or contentId' };
    }

    const ref = progressDoc(uid, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        contentId,
        seen: true,
        attempts: 1,
        completed: false,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } else {
      const current = snap.data();
      const nextAttempts = (current.attempts || 0) + 1;
      await updateDoc(ref, {
        attempts: nextAttempts,
        lastSeenAt: serverTimestamp(),
      });
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Mark a content item as completed.
 */
export async function markCompleted(uid, contentId) {
  try {
    if (!uid || !contentId) {
      return { ok: false, error: 'Missing uid or contentId' };
    }

    const ref = progressDoc(uid, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        contentId,
        seen: true,
        attempts: 1,
        completed: true,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        completed: true,
        lastSeenAt: serverTimestamp(),
      });
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

/**
 * Get progress for a single content item.
 */
export async function getProgress(uid, contentId) {
  try {
    if (!uid || !contentId) {
      return { ok: false, error: 'Missing uid or contentId' };
    }

    const ref = progressDoc(uid, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: true, data: null };
    }

    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Get all progress docs for a user, keyed by contentId.
 * Returns: { "zu_greeting_hello": {...}, ... }
 */
export async function getAllProgress(uid) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const q = query(progressCol(uid), orderBy('lastSeenAt', 'desc'));
    const snap = await getDocs(q);

    const byContentId = {};
    snap.docs.forEach((d) => {
      byContentId[d.id] = { id: d.id, ...d.data() };
    });

    return { ok: true, data: byContentId };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Summary counts for a set of content IDs.
 * Returns both aggregate counts AND the raw map so callers can find specific items.
 *
 * @param {string} uid
 * @param {string[]} contentIds — the content in the current lesson/set
 * @returns {Promise<{ ok: boolean, data?: { seen, completed, total, byContentId }, error?: string }>}
 */
export async function getProgressSummary(uid, contentIds) {
  try {
    if (!uid || !Array.isArray(contentIds)) {
      return { ok: false, error: 'Missing uid or contentIds' };
    }

    const all = await getAllProgress(uid);
    if (!all.ok) return all;

    let seen = 0;
    let completed = 0;

    // Only include progress entries for the content IDs in question
    const byContentId = {};

    for (const id of contentIds) {
      const p = all.data[id] || null;
      if (p) {
        byContentId[id] = p;
        if (p.seen) seen++;
        if (p.completed) completed++;
      }
    }

    return {
      ok: true,
      data: { seen, completed, total: contentIds.length, byContentId },
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Given a list of content IDs, return the first one that is NOT completed.
 * Returns null if all are completed.
 *
 * Used by Home to pick the "Continue learning" card.
 *
 * @param {string} uid
 * @param {Array<{id: string, order?: number}>} items — full content list (ordered)
 * @returns {Promise<{ ok: boolean, next?: object | null, error?: string }>}
 */
export async function getNextIncompleteItem(uid, items) {
  try {
    if (!uid || !Array.isArray(items)) {
      return { ok: false, error: 'Missing uid or items' };
    }
    if (items.length === 0) {
      return { ok: true, next: null };
    }

    const all = await getAllProgress(uid);
    if (!all.ok) return all;

    for (const item of items) {
      const p = all.data[item.id];
      if (!p || !p.completed) {
        return { ok: true, next: item };
      }
    }

    // All completed
    return { ok: true, next: null };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}