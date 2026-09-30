// services/notifications.js
// Push notification plumbing — permission + preference only.
//
// NO SCHEDULING YET. This file sets up the infrastructure so we can add
// actual daily reminders in a future session.
//
// Preference stored at: users/{uid}.reminderEnabled = true | false

import * as Notifications from 'expo-notifications';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';

// ─────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────

/**
 * Get the current notification permission status without prompting.
 *
 * Returns:
 *   {
 *     ok: true,
 *     granted: boolean,
 *     canAskAgain: boolean,   // true if we can prompt again, false if user blocked
 *     status: string          // 'granted' | 'denied' | 'undetermined'
 *   }
 *
 * @returns {Promise<{ ok: boolean, granted?: boolean, canAskAgain?: boolean, status?: string, error?: string }>}
 */
export async function getPermissionStatus() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return {
      ok: true,
      granted: settings.granted,
      canAskAgain: settings.canAskAgain,
      status: settings.status,
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Request notification permission.
 * - If already granted: returns granted without prompting.
 * - If never asked: shows system prompt.
 * - If denied permanently (canAskAgain false): returns denied; caller should
 *   direct user to device settings.
 *
 * @returns {Promise<{ ok: boolean, granted?: boolean, canAskAgain?: boolean, error?: string }>}
 */
export async function requestPermission() {
  try {
    const settings = await Notifications.requestPermissionsAsync();
    return {
      ok: true,
      granted: settings.granted,
      canAskAgain: settings.canAskAgain,
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// PREFERENCES (stored on users/{uid})
// ─────────────────────────────────────────────────────────────

/**
 * Read the user's reminder preference.
 *
 * @param {string} uid
 * @returns {Promise<{ ok: boolean, enabled?: boolean, error?: string }>}
 */
export async function getReminderPreference(uid) {
  try {
    if (!uid) return { ok: false, error: 'Missing uid' };

    const ref = doc(db, USERS_COL, uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: true, enabled: false };
    }

    const data = snap.data();
    return { ok: true, enabled: data.reminderEnabled === true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Write the user's reminder preference.
 *
 * @param {string} uid
 * @param {boolean} enabled
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function setReminderPreference(uid, enabled) {
  try {
    if (!uid) return { ok: false, error: 'Missing uid' };

    const ref = doc(db, USERS_COL, uid);
    await updateDoc(ref, {
      reminderEnabled: !!enabled,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}