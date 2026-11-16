// services/roles.js
// Role system: learner | sub_admin | admin
//
// Stored on users/{uid}.role
// - learner:    default, can learn + contribute
// - sub_admin:  can review contributions (approve/flag/promote)
// - admin:      can do everything + promote users
//
// Role checks are enforced in Firestore rules. This service provides
// client-side helpers for reading role and (for admin) setting roles.

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';

export const ROLES = {
  LEARNER: 'learner',
  SUB_ADMIN: 'sub_admin',
  ADMIN: 'admin',
};

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

/**
 * Get a user's role. Returns 'learner' as default if not set.
 *
 * @param {string} uid
 * @returns {Promise<{ ok: boolean, role?: string, error?: string }>}
 */
export async function getUserRole(uid) {
  try {
    if (!uid) return { ok: false, error: 'Missing uid' };

    const ref = doc(db, USERS_COL, uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: true, role: ROLES.LEARNER };
    }

    const data = snap.data();
    return { ok: true, role: data.role || ROLES.LEARNER };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Check if a user is a sub-admin or admin.
 */
export async function isReviewer(uid) {
  try {
    const result = await getUserRole(uid);
    if (!result.ok) return result;
    return {
      ok: true,
      isReviewer:
        result.role === ROLES.SUB_ADMIN || result.role === ROLES.ADMIN,
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Check if a user is an admin.
 */
export async function isAdmin(uid) {
  try {
    const result = await getUserRole(uid);
    if (!result.ok) return result;
    return {
      ok: true,
      isAdmin: result.role === ROLES.ADMIN,
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// WRITE (admin only — enforced by rules in future)
// ─────────────────────────────────────────────────────────────

/**
 * Set a user's role. Admin-only operation.
 * Rules will enforce who can call this in a future update.
 */
export async function setUserRole(targetUid, role) {
  try {
    if (!targetUid) return { ok: false, error: 'Missing target uid' };
    if (!Object.values(ROLES).includes(role)) {
      return { ok: false, error: 'Invalid role' };
    }

    const ref = doc(db, USERS_COL, targetUid);
    await updateDoc(ref, { role });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * List all sub-admins and admins. Used by admin dashboard (future).
 */
export async function listReviewers() {
  try {
    const q = query(
      collection(db, USERS_COL),
      where('role', 'in', [ROLES.SUB_ADMIN, ROLES.ADMIN])
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}