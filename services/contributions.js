// services/contributions.js
// User-submitted translations/expressions.
//
// Two collections:
//   contributions/{id}            — visible contributions (public read)
//   flagged_contributions/{id}    — flagged contributions (owner read only)
//
// A contribution lives in exactly one collection at a time.
// Flagging = MOVING from `contributions` to `flagged_contributions`.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const CONTRIBUTIONS_COL = 'contributions';
const FLAGGED_COL = 'flagged_contributions';
const CONTENT_COL = 'learning_content';

// ─────────────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────────────

/**
 * Submit a new contribution for a learning content item.
 * Always lands in `contributions` with status: 'pending'.
 */
export async function submitContribution(uid, payload) {
  try {
    if (!uid) return { ok: false, error: 'Not signed in' };

    const { contentId, languageId, text, note, region, register } = payload || {};

    if (!contentId || !languageId) {
      return { ok: false, error: 'Missing contentId or languageId' };
    }
    if (!text || !text.trim()) {
      return { ok: false, error: 'Please enter your expression' };
    }

    const ref = await addDoc(collection(db, CONTRIBUTIONS_COL), {
      userId: uid,
      contentId,
      languageId,
      text: text.trim(),
      note: note?.trim() || null,
      region: region || null,
      register: register || null,
      status: 'pending',
      isDemo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewCount: 0,
      lastReviewedAt: null,
      promotedToTranslationId: null,
    });

    return { ok: true, id: ref.id };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Flag a contribution (admin/reviewer operation).
 * Moves it from `contributions` to `flagged_contributions`.
 * NOT called from the client in M6 — kept for future admin tooling.
 */
export async function flagContribution(
  contributionId,
  { flaggedBy, flagReason } = {}
) {
  try {
    if (!contributionId) return { ok: false, error: 'Missing contributionId' };

    const originalRef = doc(db, CONTRIBUTIONS_COL, contributionId);
    const snap = await getDoc(originalRef);

    if (!snap.exists()) {
      return { ok: false, error: 'Contribution not found' };
    }

    const original = snap.data();

    // Write to flagged_contributions
    const flaggedRef = doc(db, FLAGGED_COL, contributionId);
    await setDoc(flaggedRef, {
      ...original,
      status: 'flagged',
      flaggedAt: serverTimestamp(),
      flaggedBy: flaggedBy || null,
      flagReason: flagReason || null,
    });

    // Remove from visible contributions
    await deleteDoc(originalRef);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// READ — VISIBLE CONTRIBUTIONS
// ─────────────────────────────────────────────────────────────

export async function getContributionsForContent(contentId, options = {}) {
  try {
    if (!contentId) {
      return { ok: false, error: 'Missing contentId' };
    }

    const { maxItems = 20, pendingOnly = false } = options;

    const constraints = [where('contentId', '==', contentId)];

    if (pendingOnly) {
      constraints.push(where('status', '==', 'pending'));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(maxItems));

    const q = query(collection(db, CONTRIBUTIONS_COL), ...constraints);
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export async function getContribution(contributionId) {
  try {
    if (!contributionId) {
      return { ok: false, error: 'Missing contributionId' };
    }

    const ref = doc(db, CONTRIBUTIONS_COL, contributionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, error: 'Contribution not found' };
    }

    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export async function getMyContributions(uid, options = {}) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const { maxItems = 50 } = options;

    const q = query(
      collection(db, CONTRIBUTIONS_COL),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export async function getUserContributionCount(uid) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const q = query(
      collection(db, CONTRIBUTIONS_COL),
      where('userId', '==', uid)
    );
    const snap = await getDocs(q);

    return { ok: true, count: snap.size };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// READ — FLAGGED CONTRIBUTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the current user's flagged contributions.
 * Used by My Contributions to show the owner their flagged items.
 */
export async function getMyFlaggedContributions(uid, options = {}) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const { maxItems = 50 } = options;

    const q = query(
      collection(db, FLAGGED_COL),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// ENRICHED READS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch ALL of the user's contributions (visible + flagged), enriched
 * with parent content, merged and sorted by createdAt desc.
 *
 * Flagged items get `flagged: true` so the UI can render them differently.
 */
export async function getMyContributionsWithContent(uid, options = {}) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const { maxItems = 50 } = options;

    const [visibleRes, flaggedRes] = await Promise.all([
      getMyContributions(uid, { maxItems }),
      getMyFlaggedContributions(uid, { maxItems }),
    ]);

    const visible = visibleRes.ok ? visibleRes.data : [];
    const flagged = flaggedRes.ok
      ? flaggedRes.data.map((f) => ({ ...f, flagged: true }))
      : [];

    const merged = [...visible, ...flagged].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    if (merged.length === 0) {
      return { ok: true, data: [] };
    }

    const uniqueContentIds = [
      ...new Set(merged.map((c) => c.contentId).filter(Boolean)),
    ];

    const contentMap = {};
    await Promise.all(
      uniqueContentIds.map(async (contentId) => {
        try {
          const ref = doc(db, CONTENT_COL, contentId);
          const contentSnap = await getDoc(ref);
          if (contentSnap.exists()) {
            contentMap[contentId] = contentSnap.data();
          }
        } catch {}
      })
    );

    const enriched = merged.map((c) => {
      const parent = contentMap[c.contentId] || null;
      return {
        ...c,
        contentPrompt: parent?.prompt || null,
        contentLanguageId: parent?.languageId || c.languageId || null,
        contentType: parent?.type || null,
      };
    });

    return { ok: true, data: enriched };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}