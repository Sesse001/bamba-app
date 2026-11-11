// services/account.js
// Account deletion orchestration.
//
// Architecture:
//   1. Verify recent login (Firebase requires for sensitive operations)
//   2. Delete progress subcollection (batch)
//   3. De-identify contributions (null identifiers, delete note, null timestamps)
//   4. Delete user profile doc
//   5. Clear user-specific local storage
//   6. Delete Firebase Auth account (LAST — irreversible)
//
// Failure handling:
//   - Idempotent: re-running handles already-deleted docs
//   - Each step returns { ok, error?, step? } on failure
//   - Auth deletion is LAST so partial failures keep user able to retry
//
// POPIA compliance:
//   - Contributions are de-identified (not just user ID nulled)
//   - Notes (personal info risk) deleted entirely
//   - Timestamps nulled (could correlate)
//   - Text scanned for email/phone patterns; if found, contribution deleted
//
// Constraints:
//   - Client-side only (no Cloud Function)
//   - Relies on Firestore rules allowing owner-only delete/update
//   - Requires recent login for deleteUser() — surfaces error if not

import {
  getDocs,
  query,
  where,
  collection,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';

const USERS_COL = 'users';
const PROGRESS_SUBCOL = 'progress';
const CONTRIBUTIONS_COL = 'contributions';
const ACTIVE_LANG_KEY = 'bamba.activeLanguageId';
const BATCH_LIMIT = 500;

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────

/**
 * Delete the current user's account and associated data.
 *
 * Returns:
 *   { ok: true }                              — full success
 *   { ok: false, step: '...', error, partial: true/false }
 *                                              — failure at a specific step
 *
 * After success, Firebase Auth account is deleted. Auth gate will detect
 * sign-out and route to Welcome automatically.
 */
export async function deleteAccount() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { ok: false, step: 'precheck', error: 'Not signed in' };
  }

  const uid = currentUser.uid;

  // ── Step 1: Verify recent login ──
  // Firebase requires recent login for deleteUser(). Check now to fail fast
  // before we start destructive operations.
  try {
    await currentUser.reload();
    const lastSignIn = currentUser.metadata?.lastSignInTime;
    if (lastSignIn) {
      const lastSignInMs = new Date(lastSignIn).getTime();
      const ageMs = Date.now() - lastSignInMs;
      const fiveMinutes = 5 * 60 * 1000;
      if (ageMs > fiveMinutes) {
        return {
          ok: false,
          step: 'reauth',
          error:
            'Please sign in again to confirm your identity before deleting.',
          requiresReauth: true,
        };
      }
    }
  } catch (error) {
    return {
      ok: false,
      step: 'reauth-check',
      error: error.message || 'Could not verify session',
    };
  }

  // ── Step 2: Delete progress subcollection ──
  const progressResult = await deleteUserProgress(uid);
  if (!progressResult.ok) {
    return {
      ok: false,
      step: 'progress',
      error: progressResult.error,
      partial: false,
    };
  }

  // ── Step 3: De-identify contributions ──
  const contributionsResult = await deIdentifyContributions(uid);
  if (!contributionsResult.ok) {
    return {
      ok: false,
      step: 'contributions',
      error: contributionsResult.error,
      partial: true, // progress is gone, contributions might be partly processed
    };
  }

  // ── Step 4: Delete user profile doc ──
  try {
    await deleteDoc(doc(db, USERS_COL, uid));
  } catch (error) {
    // If doc doesn't exist, that's fine — idempotent
    if (error.code !== 'not-found') {
      return {
        ok: false,
        step: 'user-doc',
        error: error.message || 'Could not delete profile',
        partial: true,
      };
    }
  }

  // ── Step 5: Clear user-specific local storage ──
  try {
    await AsyncStorage.removeItem(ACTIVE_LANG_KEY);
    // Do NOT remove 'bamba.onboarded' — per-install, not per-user
    // Do NOT remove 'bamba.languagesList' — public cache
  } catch {
    // Non-fatal — stale cache will be overwritten on next sign-in
  }

  // ── Step 6: Delete Firebase Auth account (LAST, irreversible) ──
  try {
    await deleteUser(currentUser);
    return { ok: true };
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      return {
        ok: false,
        step: 'auth',
        error: 'Session expired. Please sign in again to complete deletion.',
        requiresReauth: true,
        partial: true,
      };
    }
    return {
      ok: false,
      step: 'auth',
      error: error.message || 'Could not delete auth account',
      partial: true,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — DELETE PROGRESS
// ─────────────────────────────────────────────────────────────

/**
 * Delete all progress docs for a user.
 * Uses writeBatch to reduce round-trips (500 per batch max).
 * Idempotent — deleting a missing doc is a no-op.
 */
async function deleteUserProgress(uid) {
  try {
    const progressRef = collection(db, USERS_COL, uid, PROGRESS_SUBCOL);
    const snap = await getDocs(progressRef);

    if (snap.empty) {
      return { ok: true };
    }

    const docs = snap.docs;
    let batch = writeBatch(db);
    let count = 0;

    for (const d of docs) {
      batch.delete(d.ref);
      count++;

      if (count === BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error.message || 'Could not delete progress',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — DE-IDENTIFY CONTRIBUTIONS
// ─────────────────────────────────────────────────────────────

/**
 * De-identify (or delete, for personal-info cases) a user's contributions.
 *
 * Transform:
 *   - userId: null
 *   - note: null (highest personal-info risk)
 *   - createdAt: null (could correlate with activity)
 *   - updatedAt: null
 *   - deidentifiedAt: serverTimestamp() (audit trail, non-identifying)
 *
 * For contributions where text matches email/phone pattern → delete entirely.
 *
 * Idempotent — running twice produces same result.
 */
async function deIdentifyContributions(uid) {
  try {
    const contribRef = collection(db, CONTRIBUTIONS_COL);
    const q = query(contribRef, where('userId', '==', uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { ok: true };
    }

    for (const d of snap.docs) {
      const data = d.data();
      const text = data.text || '';

      if (looksLikePersonalInfo(text)) {
        // Delete entirely — cannot safely anonymize text with personal info
        try {
          await deleteDoc(d.ref);
        } catch (error) {
          return {
            ok: false,
            error: `Could not delete contribution ${d.id}: ${error.message}`,
          };
        }
      } else {
        // De-identify — preserve language content, remove all links to user
        try {
          await updateDoc(d.ref, {
            userId: null,
            note: null,
            createdAt: null,
            updatedAt: null,
            deidentifiedAt: serverTimestamp(),
          });
        } catch (error) {
          return {
            ok: false,
            error: `Could not de-identify contribution ${d.id}: ${error.message}`,
          };
        }
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error.message || 'Could not process contributions',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Check if text contains personal info patterns (email, SA phone).
 * If yes, delete the contribution rather than de-identify.
 */
function looksLikePersonalInfo(text) {
  if (!text) return false;
  // Email pattern
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return true;
  // South African phone (10 digits with optional +27 prefix)
  if (/(\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}/.test(text)) return true;
  return false;
}