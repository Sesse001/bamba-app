// services/auth.js
// Bamba V2 — Authentication layer
// Pattern: guest-first (anonymous Firebase user), upgradeable to email/password
// The upgrade uses linkWithCredential so the SAME UID is preserved across upgrade.
// Result: guest progress + contributions survive account creation.
//
// Performance note:
//   signInAsGuest, signUpWithEmail, and signInWithEmail return as soon as
//   Firebase Auth has completed. The Firestore user-profile write is done in
//   the background (unawaited). Home's self-healing handles the rare case
//   where the background write hasn't finished yet.
//
// Sign-out clears user-specific local caches (active language) so the next
// user on the device starts fresh. The `bamba.onboarded` flag stays — it's
// per-install, not per-user.

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
import { clearActiveLanguageCache } from './languages';

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

    // Fire-and-forget: ensure the user profile doc exists.
    ensureUserProfile(user, { isGuest: true }).catch(() => {});

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
        try {
          await updateProfile(upgradedUser, { displayName });
        } catch {}
      }

      // Fire-and-forget: write profile doc in background
      ensureUserProfile(upgradedUser, {
        isGuest: false,
        displayName: displayName || null,
        email,
        upgradedFromGuest: true,
      }).catch(() => {});

      return { ok: true, user: upgradedUser, upgraded: true };
    }

    // Case 2: No user → fresh signup
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const newUser = credential.user;

    if (displayName) {
      try {
        await updateProfile(newUser, { displayName });
      } catch {}
    }

    // Fire-and-forget: write profile doc in background
    ensureUserProfile(newUser, {
      isGuest: false,
      displayName: displayName || null,
      email,
    }).catch(() => {});

    return { ok: true, user: newUser, upgraded: false };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

/**
 * Sign in with an existing email/password account.
 * Fast — no Firestore write awaited.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: boolean, user?: object, error?: string }>}
 */
export async function signInWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Fire-and-forget: update lastSeenAt + ensure doc exists.
    ensureUserProfile(user, {}).catch(() => {});

    return { ok: true, user };
  } catch (error) {
    return { ok: false, error: mapAuthError(error) };
  }
}

// ─────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function isGuest() {
  return auth.currentUser?.isAnonymous ?? false;
}

/**
 * Sign out the current user (guest or real).
 * Clears user-specific local caches so the next user starts fresh.
 * Keeps `bamba.onboarded` — that flag is per-install, not per-user.
 */
export async function signOutUser() {
  try {
    await signOut(auth);

    // Clear user-specific local caches.
    // Non-fatal — the next sign-in just reads from Firestore directly.
    try {
      await clearActiveLanguageCache();
    } catch {}

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
 * If it already exists, only merges non-destructive fields.
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
      onboarded: true,
      languages: [],
      role: 'learner',
    });
  } else {
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
    case 'auth/credential-already-in-use':
      return 'That email is already linked to another account. Try signing in instead.';
    case 'auth/provider-already-linked':
      return 'This account is already linked. Try signing in.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}