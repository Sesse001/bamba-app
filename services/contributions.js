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
 */
export async function flagAndRemove(
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

/**
 * Approve a contribution (Reviewer action)
 */
export async function approveContribution(contributionId, reviewerId) {
  try {
    const ref = doc(db, CONTRIBUTIONS_COL, contributionId);
    await setDoc(ref, {
      status: 'reviewed',
      lastReviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: reviewerId || null,
    }, { merge: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Mark a contribution as a regional variant (Reviewer action)
 */
export async function markRegionalVariant(contributionId, reviewerId, region) {
  try {
    const ref = doc(db, CONTRIBUTIONS_COL, contributionId);
    await setDoc(ref, {
      status: 'regional_variant',
      region: region || null,
      lastReviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: reviewerId || null,
    }, { merge: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// READ — VISIBLE CONTRIBUTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Get ALL pending contributions for the Review Queue, enriched with parent prompt.
 */
export async function getPendingContributions(maxItems = 50) {
  try {
    const q = query(
      collection(db, CONTRIBUTIONS_COL),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Enrich with parent content prompt
    const enriched = await Promise.all(
      data.map(async (c) => {
        if (!c.contentId) return c;
        try {
          const contentRef = doc(db, CONTENT_COL, c.contentId);
          const contentSnap = await getDoc(contentRef);
          if (contentSnap.exists()) {
            const parent = contentSnap.data();
            return {
              ...c,
              contentPrompt: parent.prompt || 'Unknown prompt',
              contentLanguageId: parent.languageId || c.languageId,
            };
          }
        } catch (e) {}
        return c;
      })
    );

    return { ok: true, data: enriched };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Get ALL flagged contributions for admin view
 */
export async function getAllFlaggedContributions(maxItems = 50) {
  try {
    const q = query(
      collection(db, FLAGGED_COL),
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

// ─────────────────────────────────────────────────────────────
// REVIEWER ACTIONS — PROMOTE TO TRANSLATION
// ─────────────────────────────────────────────────────────────

/**
 * Promote an approved contribution to the learning_content/{id}/translations subcollection.
 * This makes it visible on the Learn screen as a reviewed translation.
 */
export async function promoteToTranslation(contributionId, reviewerId) {
  try {
    if (!contributionId) return { ok: false, error: 'Missing contributionId' };

    // 1. Get the contribution
    const ref = doc(db, CONTRIBUTIONS_COL, contributionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, error: 'Contribution not found' };
    }

    const data = snap.data();

    if (!data.contentId) {
      return { ok: false, error: 'Contribution has no contentId' };
    }

    // 2. Create the translation document in the subcollection
    const translationsRef = collection(db, CONTENT_COL, data.contentId, 'translations');
    
    // Generate a deterministic ID based on the contribution ID to prevent duplicates
    const translationId = `contrib_${contributionId}`;
    const translationRef = doc(translationsRef, translationId);

    await setDoc(translationRef, {
      text: data.text,
      status: 'reviewed',
      region: data.region || null,
      register: data.register || null,
      note: data.note || null,
      isDemo: false,
      submittedBy: data.userId,
      reviewedBy: reviewerId || null,
      createdAt: serverTimestamp(),
    });

    // 3. Update the original contribution to record the promotion
    await setDoc(ref, {
      status: 'reviewed',
      promotedToTranslationId: translationId,
      lastReviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { ok: true, translationId };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}