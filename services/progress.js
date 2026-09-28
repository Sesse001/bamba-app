// services/progress.js
// Tracks per-user progress on learning content.
//
// Structure:
//   users/{uid}/progress/{contentId}
//     seen:        boolean  — user opened the card
//     attempts:    number   — how many times they've interacted
//     completed:   boolean  — marked as done (e.g. revealed translations + reviewed)
//     firstSeenAt: timestamp
//     lastSeenAt:  timestamp
//
// contentId is the deterministic learning_content ID, e.g. "zu_greeting_hello".
// Using contentId as the doc ID means progress is naturally unique per item.

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

/**
 * Build a ref to a user's progress subcollection.
 * @param {string} uid
 * @returns {CollectionReference}
 */
function progressCol(uid) {
  return collection(db, USERS_COL, uid, PROGRESS_SUBCOL);
}

/**
 * Build a ref to a single progress doc.
 * @param {string} uid
 * @param {string} contentId
 * @returns {DocumentReference}
 */
function progressDoc(uid, contentId) {
  return doc(db, USERS_COL, uid, PROGRESS_SUBCOL, contentId);
}

// ─────────────────────────────────────────────────────────────
// MARK EVENTS
// ─────────────────────────────────────────────────────────────

/**
 * Mark a content item as seen. Creates the progress doc if it doesn't exist.
 * Safe to call multiple times — idempotent.
 *
 * @param {string} uid
 * @param {string} contentId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function markSeen(uid, contentId) {
  try {
    if (!uid || !contentId) {
      return { ok: false, error: 'Missing uid or contentId' };
    }

    const ref = progressDoc(uid, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // First time seen — create the doc
      await setDoc(ref, {
        contentId,
        seen: true,
        attempts: 0,
        completed: false,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } else {
      // Already exists — just bump lastSeenAt
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
 * Increment the attempts counter and update lastSeenAt.
 * Call when the user interacts (e.g. taps "Reveal" or submits an expression).
 *
 * @param {string} uid
 * @param {string} contentId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function markAttempt(uid, contentId) {
  try {
    if (!uid || !contentId) {
      return { ok: false, error: 'Missing uid or contentId' };
    }

    const ref = progressDoc(uid, contentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Create with attempts = 1
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
 * Called after the user has seen the translations and (optionally) submitted their own.
 *
 * @param {string} uid
 * @param {string} contentId
 * @returns {Promise<{ ok: boolean, error?: string }>}
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
 *
 * @param {string} uid
 * @param {string} contentId
 * @returns {Promise<{ ok: boolean, data?: object | null, error?: string }>}
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
 * Get all progress docs for a user.
 * Returns an object keyed by contentId for fast lookup:
 *   { "zu_greeting_hello": { seen: true, completed: true, ... }, ... }
 *
 * @param {string} uid
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
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
 * Get summary counts for a set of content IDs.
 * Useful for "X of 10" progress display.
 *
 * @param {string} uid
 * @param {string[]} contentIds — the content in the current lesson/set
 * @returns {Promise<{ ok: boolean, data?: { seen: number, completed: number, total: number }, error?: string }>}
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

    for (const id of contentIds) {
      const p = all.data[id];
      if (p?.seen) seen++;
      if (p?.completed) completed++;
    }

    return {
      ok: true,
      data: { seen, completed, total: contentIds.length },
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}