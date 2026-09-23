// services/auth.js
// Bamba V2 — Authentication layer
// Pattern: guest-first (anonymous Firebase user), upgradeable to email/password
// The upgrade uses linkWithCredential so the SAME UID is preserved across upgrade.
// Result: guest progress + contributions survive account creation.

import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// ─────────────────────────────────────────────────────────────
// GUEST (ANONYMOUS) AUTH
// ─────────────────────────────────────────────────────────────

/**
 * Sign in as a guest. Creates a new anonymous Firebase user if none exists,
 * or returns the existing signed-in user if one is already active.
 *
 * @returns {Promise<{ ok: boolean, user?: object, error?: string }>}
 */
export async function signInAsGuest() {
  try {
    // If already signed in (guest OR real), don't create another
    if (auth.currentUser) {
      return { ok: true, user: auth.currentUser };
    }

    const credential = await signInAnonymously(auth);
    const user = credential.user;

    // Create the user profile doc in Firestore
    await ensureUserProfile(user, { isGuest: true });

    return { ok: true, user };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// EMAIL / PASSWORD AUTH
// ─────────────────────────────────────────────────────────────

/**
 * Sign up with email/password.
 * - If current user is anonymous: UPGRADES the anonymous account via linkWithCredential.
 *   Same UID, all contributions/progress preserved.
 * - If no user signed in: creates a fresh account.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<{ ok: boolean, user?: object, upgraded?: boolean, error?: string }>}
 */
export async function signUpWithEmail(email, password, displayName) {
  try {
    const currentUser = auth.currentUser;

    // Case 1: Upgrade anonymous guest → email/password
    if (currentUser && currentUser.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(currentUser, credential);
      const upgradedUser = result.user;

      if (displayName) {
        await updateProfile(upgradedUser, { displayName });
      }

      await ensureUserProfile(upgradedUser, {
        isGuest: false,
        displayName: displayName || null,
        email,
        upgradedFromGuest: true,
      });

      return { ok: true, user: upgradedUser, upgraded: true };
    }

    // Case 2: No user → fresh signup
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = credential.user;

    if (displayName) {
      await updateProfile(newUser, { displayName });
    }

    await ensureUserProfile(newUser, {
      isGuest: false,
      displayName: displayName || null,
      email,
    });

    return { ok: true, user: newUser, upgraded: false };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

/**
 * Sign in with an existing email/password account.
 * Note: this REPLACES any anonymous session. If the guest had progress,
 * it stays attached to the old anonymous UID. Use signUpWithEmail to preserve.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: boolean, user?: object, error?: string }>}
 */
export async function signInWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, user: credential.user };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * Callback receives (user | null). Returns unsubscribe function.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Returns the currently signed-in user (or null).
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * True if the current user is an anonymous guest.
 */
export function isGuest() {
  return auth.currentUser?.isAnonymous ?? false;
}

/**
 * Sign out the current user (guest or real).
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Ensures a `users/{uid}` doc exists in Firestore.
 * If it already exists, only merges non-destructive fields (so we don't
 * overwrite progress/flags set elsewhere).
 */
async function ensureUserProfile(user, extra = {}) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      isGuest: extra.isGuest ?? false,
      displayName: extra.displayName ?? null,
      email: extra.email ?? null,
      upgradedFromGuest: extra.upgradedFromGuest ?? false,
      languages: [],
      role: 'learner', // learner | contributor | both — extend later
    });
  } else {
    // Merge-only update — don't clobber existing data
    await setDoc(
      ref,
      {
        lastSeenAt: serverTimestamp(),
        ...(extra.isGuest === false && { isGuest: false }),
        ...(extra.displayName && { displayName: extra.displayName }),
        ...(extra.email && { email: extra.email }),
        ...(extra.upgradedFromGuest && { upgradedFromGuest: true }),
      },
      { merge: true }
    );
  }
}

/**
 * Converts raw Firebase auth errors into user-friendly strings.
 */
function mapAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again in a moment.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}