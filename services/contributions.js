// services/contributions.js
// User-submitted translations/expressions.
//
// Structure:
//   contributions/{contributionId}
//     userId, contentId, languageId, text, note, region, register
//     status: "pending" | "community_supported" | "reviewed" | "regional_variant" | "flagged"
//     isDemo: false
//     createdAt, updatedAt
//     reviewCount, lastReviewedAt, promotedToTranslationId (M5)
//
// Key principle: contributions are NEVER auto-correct.
// Every submission starts as "pending". Community reaction and human review
// move it through states — but never mark it "correct/incorrect".

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'contributions';

// ─────────────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────────────

/**
 * Submit a new contribution for a learning content item.
 *
 * @param {string} uid
 * @param {object} payload
 * @param {string} payload.contentId   — e.g. "zu_greeting_hello"
 * @param {string} payload.languageId  — e.g. "zu"
 * @param {string} payload.text        — user's expression, e.g. "Sawubona"
 * @param {string} [payload.note]      — optional context
 * @param {string} [payload.region]    — optional region tag
 * @param {string} [payload.register]  — "formal" | "casual" | null
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
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

    const ref = await addDoc(collection(db, COL), {
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
      // Placeholders for M5 review lifecycle
      reviewCount: 0,
      lastReviewedAt: null,
      promotedToTranslationId: null,
    });

    return { ok: true, id: ref.id };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

/**
 * Fetch contributions for a specific learning content item.
 * Used to display community alternatives alongside the seeded translations.
 *
 * @param {string} contentId
 * @param {object} [options]
 * @param {number} [options.maxItems]   default 20
 * @param {boolean} [options.pendingOnly]  if true, only return status="pending"
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
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

    const q = query(collection(db, COL), ...constraints);
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Fetch a single contribution by ID.
 *
 * @param {string} contributionId
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function getContribution(contributionId) {
  try {
    if (!contributionId) {
      return { ok: false, error: 'Missing contributionId' };
    }

    const ref = doc(db, COL, contributionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, error: 'Contribution not found' };
    }

    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Fetch all contributions submitted by a specific user.
 * Used in M5 for the "My Contributions" screen.
 *
 * @param {string} uid
 * @param {object} [options]
 * @param {number} [options.maxItems]   default 50
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getMyContributions(uid, options = {}) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const { maxItems = 50 } = options;

    const q = query(
      collection(db, COL),
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

/**
 * Count how many contributions a user has submitted.
 * Useful for profile stats and to display on Home.
 *
 * @param {string} uid
 * @returns {Promise<{ ok: boolean, count?: number, error?: string }>}
 */
export async function getUserContributionCount(uid) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const q = query(collection(db, COL), where('userId', '==', uid));
    const snap = await getDocs(q);

    return { ok: true, count: snap.size };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// ENRICHED READS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all contributions by a user, enriched with the parent content's prompt.
 *
 * For each contribution:
 *   - loads the contribution row
 *   - loads the learning_content doc it points to
 *   - returns a merged object: { ...contribution, contentPrompt, contentLanguageId }
 *
 * If the parent content has been deleted, contentPrompt will be null.
 * We don't drop the row — the contribution history should remain intact.
 *
 * Used by the "My Contributions" screen (M5-2).
 *
 * @param {string} uid
 * @param {object} [options]
 * @param {number} [options.maxItems]   default 50
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function getMyContributionsWithContent(uid, options = {}) {
  try {
    if (!uid) {
      return { ok: false, error: 'Missing uid' };
    }

    const { maxItems = 50 } = options;

    // 1. Fetch raw contributions
    const q = query(
      collection(db, COL),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    const contributions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (contributions.length === 0) {
      return { ok: true, data: [] };
    }

    // 2. Gather unique contentIds so we don't fetch the same parent twice
    const uniqueContentIds = [
      ...new Set(contributions.map((c) => c.contentId).filter(Boolean)),
    ];

    // 3. Fetch each parent learning_content doc in parallel
    const contentMap = {};
    await Promise.all(
      uniqueContentIds.map(async (contentId) => {
        try {
          const ref = doc(db, 'learning_content', contentId);
          const contentSnap = await getDoc(ref);
          if (contentSnap.exists()) {
            contentMap[contentId] = contentSnap.data();
          }
        } catch {
          // Ignore individual fetch errors — the contribution stays in the list
        }
      })
    );

    // 4. Merge
    const enriched = contributions.map((c) => {
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