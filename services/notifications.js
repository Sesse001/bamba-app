// services/notifications.js
// Push notification plumbing — permission, preference, and daily reminder scheduling.
//
// Uses LOCAL notifications (device-scheduled, no server needed).
// Works in Expo Go AND production builds.
//
// Preference stored at: users/{uid}.reminderEnabled = true | false
// Fixed reminder time: 19:00 (7:00 PM) local device time.
// Time picker deferred to a later milestone.
//
// Lazy-loads expo-notifications to avoid the Expo Go warning on app launch.

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';

// ─────────────────────────────────────────────────────────────
// NOTIFICATION TEXT
// ─────────────────────────────────────────────────────────────

const REMINDER_HOUR = 19; // 7:00 PM
const REMINDER_MINUTE = 0;

/**
 * Build the reminder notification body.
 * @param {string} languageName — e.g. "isiZulu"
 */
function buildReminderBody(languageName) {
  if (!languageName) {
    return 'Time to practice your South African language!';
  }
  return `Time to practice your ${languageName}!`;
}

// ─────────────────────────────────────────────────────────────
// LAZY MODULE LOAD
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// DAILY REMINDER SCHEDULING
// ─────────────────────────────────────────────────────────────

/**
 * Cancel any existing daily reminder notifications.
 * Safe to call even if none exist.
 */
export async function cancelDailyReminder() {
  try {
    const Notifications = await getNotificationsModule();
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Schedule a repeating daily reminder at REMINDER_HOUR:REMINDER_MINUTE.
 * Cancels any existing scheduled notifications first.
 *
 * @param {string} languageName — used in the notification body
 */
export async function scheduleDailyReminder(languageName) {
  try {
    const Notifications = await getNotificationsModule();

    // Cancel existing to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule a recurring daily notification.
    // Expo's DailyTriggerInput uses hour + minute in 24h format,
    // and fires the next occurrence at that time.
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bamba',
        body: buildReminderBody(languageName),
        sound: true,
      },
      trigger: {
        type: 'daily',
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });

    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/**
 * Ensure a daily reminder is scheduled if the user has it enabled.
 * Called on app launch / Home focus so the schedule survives app restarts.
 *
 * @param {string} uid
 * @param {string} languageName
 * @returns {Promise<{ ok: boolean, scheduled?: boolean, error?: string }>}
 */
export async function ensureReminderScheduled(uid, languageName) {
  try {
    const prefRes = await getReminderPreference(uid);
    if (!prefRes.ok || !prefRes.enabled) {
      return { ok: true, scheduled: false };
    }

    const schedRes = await scheduleDailyReminder(languageName);
    if (!schedRes.ok) {
      return { ok: false, error: schedRes.error };
    }

    return { ok: true, scheduled: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// FOREGROUND HANDLER
// ─────────────────────────────────────────────────────────────

/**
 * Configure how notifications behave when the app is in the foreground.
 * Called once on app launch.
 */
export async function configureNotificationHandler() {
  try {
    const Notifications = await getNotificationsModule();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}