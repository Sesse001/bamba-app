// app/(tabs)/profile.tsx
// Profile — account info, stats, preferences, legal, delete, sign out.
//
// Delete Account is now wired up to services/account.js.
// Flow: tap "Delete account" → confirmation modal → deleteAccount()
//       → success (auth gate redirects) OR error (shown in modal)
//
// Re-auth handling: if deleteAccount() returns requiresReauth: true,
// we show the user a clear message and offer to sign in again.

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getCurrentUser, signOutUser } from '../../services/auth';
import { getUserContributionCount } from '../../services/contributions';
import {
  requestPermission,
  getReminderPreference,
  setReminderPreference,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../../services/notifications';
import { getActiveLanguageId, getLanguage } from '../../services/languages';
import { deleteAccount } from '../../services/account';

export default function Profile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [contributionCount, setContributionCount] = useState(0);

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Sign out state
  const [showSignOutWarning, setShowSignOutWarning] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);

    const current = getCurrentUser();
    if (!current) {
      setLoadError('Not signed in');
      setLoading(false);
      return;
    }
    setUser(current);
    setIsGuest(current.isAnonymous);
    setDisplayName(current.displayName || '');
    setEmail(current.email || '');

    try {
      const countRes = await getUserContributionCount(current.uid);
      if (countRes.ok) setContributionCount(countRes.count);
    } catch {}

    try {
      const prefRes = await getReminderPreference(current.uid);
      if (prefRes.ok) setReminderEnabled(prefRes.enabled);
    } catch {}

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleBack = () => {
    router.replace('/(tabs)/home');
  };

  const handleRetry = () => {
    setLoading(true);
    load();
  };

  const handleCreateAccount = () => {
    setShowSignOutWarning(false);
    router.push('/(auth)/email');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);

    const result = await signOutUser();

    if (result.ok) {
      // Auth gate handles redirect
    } else {
      setSignOutError(result.error);
      setSigningOut(false);
      setShowSignOutWarning(false);
    }
  };

  const handleSignOutPress = () => {
    setShowSignOutWarning(true);
  };

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────
  const handleAbout = () => {
    router.push('/(tabs)/about');
  };

  const handlePrivacy = () => {
    router.push('/legal/privacy');
  };

  const handleTerms = () => {
    router.push('/legal/terms');
  };

  // ─────────────────────────────────────────────
  // DELETE ACCOUNT
  // ─────────────────────────────────────────────
  const handleDeleteAccountPress = () => {
    setDeleteError(null);
    setRequiresReauth(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    setRequiresReauth(false);

    const result = await deleteAccount();

    if (result.ok) {
      // Auth gate detects sign-out and routes to Welcome.
      // Modal can close — the screen will unmount.
      setShowDeleteModal(false);
      setDeleting(false);
      return;
    }

    // Failure — show error in modal
    setDeleting(false);
    setDeleteError(result.error || 'Could not delete account');

    if (result.requiresReauth) {
      setRequiresReauth(true);
    }
  };

  const handleCloseDeleteModal = () => {
    if (deleting) return; // Prevent close during deletion
    setShowDeleteModal(false);
    setDeleteError(null);
    setRequiresReauth(false);
  };

  const handleReauthAndRetry = async () => {
    // Sign out and route to email screen so user can sign in again.
    // After re-auth, they can come back to Profile → Delete account.
    setShowDeleteModal(false);
    await signOutUser();
    router.push('/(auth)/email');
  };

  // ─────────────────────────────────────────────
  // REMINDER TOGGLE
  // ─────────────────────────────────────────────
  const handleReminderToggle = async (nextValue) => {
    if (reminderSaving || !user) return;

    setReminderSaving(true);
    setPermissionDenied(false);

    if (nextValue) {
      const permRes = await requestPermission();

      if (!permRes.ok || !permRes.granted) {
        if (permRes.canAskAgain === false) {
          setPermissionDenied(true);
        }
        setReminderSaving(false);
        return;
      }

      let languageName = null;
      try {
        const activeRes = await getActiveLanguageId(user.uid);
        if (activeRes.ok && activeRes.languageId) {
          const langRes = await getLanguage(activeRes.languageId);
          if (langRes.ok) languageName = langRes.data.name;
        }
      } catch {}

      const schedRes = await scheduleDailyReminder(languageName);
      if (!schedRes.ok) {
        setReminderSaving(false);
        return;
      }

      const saveRes = await setReminderPreference(user.uid, true);
      if (saveRes.ok) setReminderEnabled(true);
    } else {
      await cancelDailyReminder();
      const saveRes = await setReminderPreference(user.uid, false);
      if (saveRes.ok) setReminderEnabled(false);
    }

    setReminderSaving(false);
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // FATAL LOAD ERROR
  // ─────────────────────────────────────────────
  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorCard}>
            <Text style={styles.errorCardEmoji}>📡</Text>
            <Text style={styles.errorCardTitle}>
              Couldn't load your profile
            </Text>
            <Text style={styles.errorCardText}>
              Check your connection and try again.
            </Text>
            <Pressable style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Pressable onPress={handleBack} hitSlop={12}>
              <Text style={styles.backToHomeText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // NORMAL RENDER
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={styles.backLink}>← Home</Text>
          </Pressable>
        </View>

        {/* Header */}
        <Text style={styles.title}>Account</Text>

        {/* Avatar + identity */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName
                ? displayName[0].toUpperCase()
                : isGuest
                ? '?'
                : (email[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.identityName}>
              {displayName || (isGuest ? 'Guest' : 'Signed in')}
            </Text>
            <Text style={styles.identityMeta}>
              {isGuest ? 'Guest account' : email || 'No email'}
            </Text>
          </View>
        </View>

        {/* Guest warning badge */}
        {isGuest && (
          <View style={styles.guestNotice}>
            <Text style={styles.guestNoticeIcon}>⚠️</Text>
            <Text style={styles.guestNoticeText}>
              You're using a guest account. Your progress and contributions
              are tied to this temporary account.
            </Text>
          </View>
        )}

        {/* Stats */}
        <Text style={styles.sectionLabel}>STATS</Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Contributions submitted</Text>
            <Text style={styles.statValue}>{contributionCount}</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.prefCard}>
          <View style={styles.prefRow}>
            <View style={styles.prefBody}>
              <Text style={styles.prefTitle}>Daily reminder</Text>
              <Text style={styles.prefSubtitle}>
                A gentle nudge at 7 PM to keep learning.
              </Text>
            </View>

            {reminderSaving ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{
                  false: Colors.surfaceLight,
                  true: Colors.primary,
                }}
                thumbColor={Colors.text}
                disabled={permissionDenied}
              />
            )}
          </View>

          {permissionDenied && (
            <Pressable
              style={styles.permDeniedBox}
              onPress={handleOpenSettings}
            >
              <Text style={styles.permDeniedText}>
                Notifications disabled — tap to enable in device settings.
              </Text>
            </Pressable>
          )}
        </View>

        {/* About & Legal */}
        <Text style={styles.sectionLabel}>ABOUT & LEGAL</Text>
        <View style={styles.linkCard}>
          <Pressable style={styles.linkRow} onPress={handleAbout}>
            <Text style={styles.linkText}>About Bamba</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={handlePrivacy}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={handleTerms}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
        </View>

        {/* Account actions */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        {isGuest ? (
          <Pressable style={styles.btnPrimary} onPress={handleCreateAccount}>
            <Text style={styles.btnPrimaryText}>Create an account</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.btnSecondary, { marginTop: Spacing.md }]}
          onPress={handleSignOutPress}
        >
          <Text style={styles.btnSecondaryText}>Sign out</Text>
        </Pressable>

        <Pressable
          style={[styles.btnDangerOutline, { marginTop: Spacing.md }]}
          onPress={handleDeleteAccountPress}
        >
          <Text style={styles.btnDangerOutlineText}>Delete account</Text>
        </Pressable>

        {signOutError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(signOutError)}</Text>
          </View>
        )}

        <View style={{ height: Spacing.huge }} />
      </ScrollView>

      {/* Sign-out warning modal */}
      <Modal
        visible={showSignOutWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutWarning(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isGuest ? "You're using a guest account" : 'Sign out?'}
            </Text>
            <Text style={styles.modalText}>
              {isGuest
                ? "Your progress and contributions are tied to this temporary account. If you sign out now, you'll lose access to them permanently. Create a free account first to save everything — it only takes a moment."
                : 'You can sign back in anytime with your email and password.'}
            </Text>

            {isGuest ? (
              <>
                <Pressable
                  style={styles.modalBtnPrimary}
                  onPress={handleCreateAccount}
                  disabled={signingOut}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    Create account
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.modalBtnSecondary}
                  onPress={() => setShowSignOutWarning(false)}
                  disabled={signingOut}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSignOut}
                  disabled={signingOut}
                  hitSlop={12}
                >
                  <Text style={styles.modalBtnDangerText}>
                    {signingOut
                      ? 'Signing out…'
                      : 'Sign out and lose progress'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.modalBtnPrimary}
                  onPress={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Sign out</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.modalBtnSecondary}
                  onPress={() => setShowSignOutWarning(false)}
                  disabled={signingOut}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete account modal — now fully wired */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDeleteModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {requiresReauth ? (
              <>
                <Text style={styles.modalTitle}>Sign in again to continue</Text>
                <Text style={styles.modalText}>
                  For security, you need to sign in again before deleting
                  your account. Your data has been partly cleaned up — after
                  signing back in, you can complete deletion from the Profile
                  screen.
                </Text>

                <Pressable
                  style={styles.modalBtnPrimary}
                  onPress={handleReauthAndRetry}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    Sign in again
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.modalBtnSecondary}
                  onPress={handleCloseDeleteModal}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Delete account?</Text>
                <Text style={styles.modalText}>
                  This will permanently delete your account, learning
                  progress, and contributions. This action cannot be undone.

                  {'\n\n'}Anonymized language contributions may remain in the
                  corpus per our Terms of Service.
                </Text>

                {deleteError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{String(deleteError)}</Text>
                  </View>
                )}

                <Pressable
                  style={[
                    styles.modalBtnDangerSolid,
                    deleting && styles.modalBtnDisabled,
                  ]}
                  onPress={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <Text style={styles.modalBtnDangerSolidText}>
                      Delete my account
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.modalBtnSecondary}
                  onPress={handleCloseDeleteModal}
                  disabled={deleting}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  topBar: { marginBottom: Spacing.xl },
  backLink: { ...Typography.body, color: Colors.primaryLight },

  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xxl,
  },

  // Identity
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...Typography.h1, color: Colors.text },
  identityBody: { flex: 1 },
  identityName: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  identityMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Guest notice
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  guestNoticeIcon: { fontSize: 18 },
  guestNoticeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Section
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },

  // Stats
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { ...Typography.body, color: Colors.textSecondary },
  statValue: { ...Typography.numberSmall, color: Colors.text },

  // Preferences
  prefCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  prefBody: { flex: 1 },
  prefTitle: {
    ...Typography.bodyBold,
    color: Colors.text,
    marginBottom: 2,
  },
  prefSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  permDeniedBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  permDeniedText: {
    ...Typography.caption,
    color: Colors.warning,
    textAlign: 'center',
  },

  // Link card
  linkCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  linkText: {
    ...Typography.body,
    color: Colors.text,
  },
  linkChevron: {
    ...Typography.h3,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xl,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnPrimaryText: { ...Typography.bodyBold, color: Colors.text },
  btnSecondary: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  btnSecondaryText: { ...Typography.bodyBold, color: Colors.text },
  btnDangerOutline: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btnDangerOutlineText: {
    ...Typography.bodyBold,
    color: Colors.danger,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    maxWidth: 420,
    gap: Spacing.md,
  },
  modalTitle: { ...Typography.h3, color: Colors.text },
  modalText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnPrimaryText: { ...Typography.bodyBold, color: Colors.text },
  modalBtnSecondary: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalBtnSecondaryText: { ...Typography.bodyBold, color: Colors.text },
  modalBtnDangerText: {
    ...Typography.bodyBold,
    color: Colors.danger,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  modalBtnDangerSolid: {
    backgroundColor: Colors.danger,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnDangerSolidText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },

  // Fatal error card
  errorCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  errorCardEmoji: { fontSize: 40, marginBottom: Spacing.md },
  errorCardTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  errorCardText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    minWidth: 120,
    alignItems: 'center',
  },
  retryText: { ...Typography.bodyBold, color: Colors.primaryLight },
  backToHomeText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },

  // Inline error
  errorBox: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
  },
});