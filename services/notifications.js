// services/notifications.js
// Push notification plumbing — permission + preference only.
//
// NO SCHEDULING YET. This file sets up the infrastructure so we can add
// actual daily reminders in a future session.
//
// Preference stored at: users/{uid}.reminderEnabled = true | false
//
// Note on lazy-loading:
//   expo-notifications emits a warning in Expo Go on import (SDK 53+).
//   We lazy-import it inside each function so the warning only appears
//   when notifications are actually being used — not on every app launch.

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';

// Cache the module after first load so subsequent calls are fast
let notificationsModule = null;

async function getNotificationsModule() {
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch (error) {
    throw new Error(
      'Notifications not available in this environment. ' +
      'A development build is required for push notifications.'
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────

/**
 * Get the current notification permission status without prompting.
 */
export async function getPermissionStatus() {
  try {
    const Notifications = await getNotificationsModule();
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
 */
export async function requestPermission() {
  try {
    const Notifications = await getNotificationsModule();
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