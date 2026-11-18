// services/notifications.js
// Push notification plumbing — permission + preference + scheduling.

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';

// Daily reminder at 7:00 PM local device time
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

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
// PREFERENCES
// ─────────────────────────────────────────────────────────────

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
// SCHEDULING
// ─────────────────────────────────────────────────────────────

export async function scheduleDailyReminder(languageName) {
  try {
    const Notifications = await getNotificationsModule();

    // Cancel existing to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule new daily notification (Updated SDK 50+ syntax)
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bamba',
        body: languageName
          ? `Time to practice your ${languageName}!`
          : 'Time to practice your South African language!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });

    return { ok: true, notificationId };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export async function cancelDailyReminder() {
  try {
    const Notifications = await getNotificationsModule();
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

export async function getScheduledNotifications() {
  try {
    const Notifications = await getNotificationsModule();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return {
      ok: true,
      scheduled: scheduled.length > 0,
      count: scheduled.length,
      identifiers: scheduled.map((n) => n.identifier),
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// RE-SCHEDULING (called on app launch)
// ─────────────────────────────────────────────────────────────

export async function ensureReminderScheduled(uid, languageName) {
  try {
    if (!uid) return { ok: false, error: 'Missing uid' };

    const prefRes = await getReminderPreference(uid);
    if (!prefRes.ok) return prefRes;

    const reminderEnabled = prefRes.enabled;

    const scheduleRes = await getScheduledNotifications();
    if (!scheduleRes.ok) return scheduleRes;

    const isScheduled = scheduleRes.scheduled;

    if (reminderEnabled && !isScheduled) {
      // Check permission first so we don't spam a request on app launch
      const permRes = await getPermissionStatus();
      if (permRes.ok && permRes.granted) {
        const schedRes = await scheduleDailyReminder(languageName);
        if (!schedRes.ok) return schedRes;
        return { ok: true, action: 'scheduled' };
      }
    }

    if (!reminderEnabled && isScheduled) {
      const cancelRes = await cancelDailyReminder();
      if (!cancelRes.ok) return cancelRes;
      return { ok: true, action: 'canceled' };
    }

    return { ok: true, action: 'none' };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}