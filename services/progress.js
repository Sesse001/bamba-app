// services/progress.js
// Tracks per-user progress on learning content.
//
// Structure:
//   users/{uid}/progress/{contentId}
//     seen:        boolean   — user opened the card
//     attempts:    number    — how many times they've interacted
//     completed:   boolean   — marked as done (via Next)
//     skipped:     boolean   — user explicitly skipped (via Skip)
//     firstSeenAt: timestamp
//     lastSeenAt:  timestamp
//
// Skip semantics (Interpretation B):
//   - Skipping permanently removes an item from the "current lesson"
//   - Home shows the first unskipped + uncompleted item
//   - resetSkipped(uid) brings all skipped items back
//
// contentId is the deterministic learning_content ID (e.g. "zu_greeting_hello").

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
        skipped: false,
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
        skipped: false,
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
        skipped: false,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        completed: true,
        skipped: false, // un-skip if previously skipped
        lastSeenAt: serverTimestamp(),
      });
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Mark a content item as skipped.
 * Does NOT mark as completed. Removes from the "current lesson" view.
 */
export async function markSkipped(uid, contentId) {
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
        skipped: true,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } else {
      const current = snap.data();
      const nextAttempts = (current.attempts || 0) + 1;
      await updateDoc(ref, {
        skipped: true,
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
 * Reset all skipped items for a user, bringing them back into the lesson.
 * Does NOT touch completed items.
 */
export async function resetSkipped(uid) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const q = query(progressCol(uid));
    const snap = await getDocs(q);

    let resetCount = 0;
    const promises = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.skipped === true) {
        promises.push(
          updateDoc(d.ref, {
            skipped: false,
            lastSeenAt: serverTimestamp(),
          })
        );
        resetCount++;
      }
    });

    await Promise.all(promises);

    return { ok: true, resetCount };
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
 * Note: total = all items, completed = completed count,
 *       skipped = skipped count, remaining = total - completed - skipped
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
    let skipped = 0;
    const byContentId = {};

    for (const id of contentIds) {
      const p = all.data[id] || null;
      if (p) {
        byContentId[id] = p;
        if (p.seen) seen++;
        if (p.completed) completed++;
        if (p.skipped) skipped++;
      }
    }

    return {
      ok: true,
      data: {
        seen,
        completed,
        skipped,
        total: contentIds.length,
        remaining: contentIds.length - completed - skipped,
        byContentId,
      },
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Given a list of content items, return the first one that is NOT completed
 * AND NOT skipped. Returns null if all are either completed or skipped.
 *
 * Used by Home for "Continue learning" and by Learn's "Next" button.
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
      // Skip items that are completed OR explicitly skipped
      if (!p || (!p.completed && !p.skipped)) {
        return { ok: true, next: item };
      }
    }

    return { ok: true, next: null };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Find the next item after the given content ID, in array order.
 * Skips items that are completed or already skipped.
 * Used by Skip — advances to next available item.
 *
 * @param {Array<{id: string}>} items — full content list (ordered)
 * @param {string} currentId — the current item's ID
 * @param {object} progressByContentId — map of progress docs
 * @returns {object | null} — the next item, or null if end
 */
export function getNextItemAfter(items, currentId, progressByContentId = {}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const currentIndex = items.findIndex((i) => i.id === currentId);
  if (currentIndex === -1) return null;

  // Walk forward from current, return first item not completed or skipped
  for (let i = currentIndex + 1; i < items.length; i++) {
    const item = items[i];
    const p = progressByContentId[item.id];
    if (!p || (!p.completed && !p.skipped)) {
      return item;
    }
  }

  return null;
}