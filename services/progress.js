// services/progress.js
// Tracks per-user progress on learning content + tier progression.
//
// Schema (per progress doc):
//   users/{uid}/progress/{contentId}
//     seen, attempts, completed, skipped, firstSeenAt, lastSeenAt
//
// Tier model:
//   - Content items have a `tier` field (1-4)
//   - 25 items per tier per language
//   - User progresses tier by tier
//   - "Complete" means item is either completed OR skipped
//   - Current tier is computed from actual progress (no schema field needed)
//
// Progress integrity:
//   - markSkipped guards against re-skipping completed items
//   - markCompleted clears skipped status (completing a previously-skipped item)
//
// Redo skipped:
//   - Only available after ALL tiers are complete
//   - resetSkipped() clears all skipped flags
//   - getTotalSkippedAcrossTiers() counts for the "Redo X cards" display

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
        skipped: false,
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
 * Guard: if item is already completed, no-op (returns { noop: true }).
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

      if (current.completed === true) {
        return { ok: true, noop: true, reason: 'already-completed' };
      }

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
 * Reset all skipped items for a user (global).
 * Only meant to be called from Home when ALL tiers are complete.
 * Clears skipped flags across all tiers. Completed items unaffected.
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
      if (!p || (!p.completed && !p.skipped)) {
        return { ok: true, next: item };
      }
    }

    return { ok: true, next: null };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export function getNextItemAfter(items, currentId, progressByContentId = {}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const currentIndex = items.findIndex((i) => i.id === currentId);
  if (currentIndex === -1) return null;

  for (let i = currentIndex + 1; i < items.length; i++) {
    const item = items[i];
    const p = progressByContentId[item.id];
    if (!p || (!p.completed && !p.skipped)) {
      return item;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// TIER LOGIC
// ─────────────────────────────────────────────────────────────

export function getTierItems(items, tier) {
  if (!Array.isArray(items)) return [];
  return items.filter((i) => i.tier === tier);
}

export async function getTierProgressSummary(uid, allItems, tier) {
  try {
    const tierItems = getTierItems(allItems, tier);
    if (tierItems.length === 0) {
      return {
        ok: true,
        data: {
          seen: 0,
          completed: 0,
          skipped: 0,
          total: 0,
          remaining: 0,
          isComplete: false,
        },
      };
    }

    const tierIds = tierItems.map((i) => i.id);
    const summaryRes = await getProgressSummary(uid, tierIds);
    if (!summaryRes.ok) return summaryRes;

    const s = summaryRes.data;
    const isComplete = s.total > 0 && s.completed + s.skipped >= s.total;

    return {
      ok: true,
      data: {
        seen: s.seen,
        completed: s.completed,
        skipped: s.skipped,
        total: s.total,
        remaining: s.remaining,
        isComplete,
      },
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export async function getCurrentTier(uid, allItems) {
  try {
    if (!uid || !Array.isArray(allItems) || allItems.length === 0) {
      return {
        ok: true,
        data: { tier: 1, isAllComplete: false, tierComplete: null },
      };
    }

    const tiersPresent = [
      ...new Set(
        allItems.map((i) => i.tier).filter((t) => typeof t === 'number')
      ),
    ].sort((a, b) => a - b);

    if (tiersPresent.length === 0) {
      return {
        ok: true,
        data: { tier: 1, isAllComplete: false, tierComplete: null },
      };
    }

    let previousTierComplete = null;

    for (const tier of tiersPresent) {
      const tierSummaryRes = await getTierProgressSummary(uid, allItems, tier);
      if (!tierSummaryRes.ok) return tierSummaryRes;

      const tierSummary = tierSummaryRes.data;

      if (!tierSummary.isComplete) {
        return {
          ok: true,
          data: {
            tier,
            isAllComplete: false,
            tierComplete: previousTierComplete,
          },
        };
      }

      previousTierComplete = tier;
    }

    return {
      ok: true,
      data: {
        tier: tiersPresent[tiersPresent.length - 1],
        isAllComplete: true,
        tierComplete: previousTierComplete,
      },
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Count total skipped items across ALL tiers for a language.
 * Used by Home to decide whether to show "Redo skipped cards" after
 * all tiers are complete.
 */
export async function getTotalSkippedAcrossTiers(uid, allItems) {
  try {
    if (!uid || !Array.isArray(allItems)) {
      return { ok: false, error: 'Missing uid or items' };
    }

    const all = await getAllProgress(uid);
    if (!all.ok) return all;

    let count = 0;
    for (const item of allItems) {
      const p = all.data[item.id];
      if (p && p.skipped === true) {
        count++;
      }
    }

    return { ok: true, count };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}