// app/(tabs)/review-queue.tsx
// Review Queue — pending contributions for review.
//
// Only accessible to sub_admin and admin roles.
// Non-reviewers see an access denied message.
//
// Each pending contribution shows:
//   - The submitted expression
//   - The parent prompt + language
//   - Date submitted
//   - Action buttons: Approve / Flag / Regional variant

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getCurrentUser } from '../../services/auth';
import { getUserRole, ROLES } from '../../services/roles';
import {
  getPendingContributions,
  approveContribution,
  markRegionalVariant,
  flagAndRemove,
} from '../../services/contributions';

export default function ReviewQueue() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isReviewer, setIsReviewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [error, setError] = useState(null);

  // Action in progress
  const [actingOn, setActingOn] = useState(null);

  // Regional modal
  const [showRegionalModal, setShowRegionalModal] = useState(null);
  const [regionalInput, setRegionalInput] = useState('');

  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(null);
  const [flagReason, setFlagReason] = useState('');

  // ─────────────────────────────────────────────
  // ACCESS CHECK + LOAD
  // ─────────────────────────────────────────────
  const load = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) {
      setIsReviewer(false);
      setChecking(false);
      return;
    }

    const roleRes = await getUserRole(user.uid);
    if (!roleRes.ok) {
      setError(roleRes.error);
      setChecking(false);
      return;
    }

    const hasAccess =
      roleRes.role === ROLES.SUB_ADMIN || roleRes.role === ROLES.ADMIN;

    setIsReviewer(hasAccess);
    setChecking(false);

    if (!hasAccess) return;

    setLoading(true);
    setError(null);

    const result = await getPendingContributions({ maxItems: 50 });

    if (result.ok) {
      setContributions(result.data || []);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setChecking(true);
      load();
    }, [load])
  );

  const handleBack = () => {
    router.replace('/(tabs)/profile');
  };

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────
  const handleApprove = async (contributionId) => {
    setActingOn(contributionId);
    const result = await approveContribution(contributionId);
    if (result.ok) {
      await load();
    } else {
      setError(result.error);
    }
    setActingOn(null);
  };

  const handleRegionalConfirm = async () => {
    if (!showRegionalModal || !regionalInput.trim()) return;
    setActingOn(showRegionalModal);
    const result = await markRegionalVariant(
      showRegionalModal,
      regionalInput.trim()
    );
    if (result.ok) {
      setShowRegionalModal(null);
      setRegionalInput('');
      await load();
    } else {
      setError(result.error);
    }
    setActingOn(null);
  };

  const handleFlagConfirm = async () => {
    if (!showFlagModal) return;
    const user = getCurrentUser();
    setActingOn(showFlagModal);
    const result = await flagAndRemove(showFlagModal, {
      reason: flagReason.trim() || null,
      flaggedBy: user?.uid || null,
    });
    if (result.ok) {
      setShowFlagModal(null);
      setFlagReason('');
      await load();
    } else {
      setError(result.error);
    }
    setActingOn(null);
  };

  // ─────────────────────────────────────────────
  // RENDER — CHECKING ROLE
  // ─────────────────────────────────────────────
  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — ACCESS DENIED
  // ─────────────────────────────────────────────
  if (!isReviewer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.deniedEmoji}>🔒</Text>
          <Text style={styles.deniedTitle}>Reviewer access only</Text>
          <Text style={styles.deniedText}>
            This screen is only available to sub-admins and admins.
          </Text>
          <Pressable style={styles.btnSecondary} onPress={handleBack}>
            <Text style={styles.btnSecondaryText}>Back to Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — LOADING
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading pending contributions…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — MAIN
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
            <Text style={styles.backLink}>← Profile</Text>
          </Pressable>
        </View>

        {/* Header */}
        <Text style={styles.title}>Review Queue</Text>
        <Text style={styles.subtitle}>
          {contributions.length === 0
            ? 'Nothing to review right now.'
            : `${contributions.length} pending ${
                contributions.length === 1 ? 'contribution' : 'contributions'
              }`}
        </Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        {/* Empty state */}
        {!error && contributions.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              There are no pending contributions to review. New submissions
              will appear here as learners add them.
            </Text>
          </View>
        )}

        {/* List */}
        {contributions.length > 0 && (
          <View style={styles.list}>
            {contributions.map((c) => {
              const isActing = actingOn === c.id;
              return (
                <View key={c.id} style={styles.card}>
                  {/* Expression */}
                  <Text style={styles.expression}>"{c.text}"</Text>

                  {/* Prompt + language */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>for</Text>
                    <Text style={styles.metaPrompt}>
                      {c.contentPrompt || 'Unknown prompt'}
                    </Text>
                    {c.contentLanguageId ? (
                      <Text style={styles.metaLang}>
                        {' '}
                        · {c.contentLanguageId.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>

                  {/* Region/register if present */}
                  {(c.region || c.register) && (
                    <Text style={styles.metaDetails}>
                      {[c.region, c.register].filter(Boolean).join(' · ')}
                    </Text>
                  )}

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(c.id)}
                      disabled={isActing}
                    >
                      {isActing ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <Text style={styles.approveBtnText}>Approve</Text>
                      )}
                    </Pressable>

                    <Pressable
                      style={[styles.actionBtn, styles.regionalBtn]}
                      onPress={() => setShowRegionalModal(c.id)}
                      disabled={isActing}
                    >
                      <Text style={styles.regionalBtnText}>Regional</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionBtn, styles.flagBtn]}
                      onPress={() => setShowFlagModal(c.id)}
                      disabled={isActing}
                    >
                      <Text style={styles.flagBtnText}>Flag</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.huge }} />
      </ScrollView>

      {/* Regional variant modal */}
      <Modal
        visible={showRegionalModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegionalModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark as regional variant</Text>
            <Text style={styles.modalText}>
              Enter the region this expression is associated with.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g., KwaZulu-Natal"
              placeholderTextColor={Colors.textMuted}
              value={regionalInput}
              onChangeText={setRegionalInput}
              autoCapitalize="words"
              editable={actingOn === null}
            />

            <Pressable
              style={[styles.modalBtnPrimary, actingOn && { opacity: 0.6 }]}
              onPress={handleRegionalConfirm}
              disabled={actingOn !== null}
            >
              {actingOn ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>Confirm</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.modalBtnSecondary}
              onPress={() => {
                setShowRegionalModal(null);
                setRegionalInput('');
              }}
              disabled={actingOn !== null}
            >
              <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Flag modal */}
      <Modal
        visible={showFlagModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFlagModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Flag contribution</Text>
            <Text style={styles.modalText}>
              This will move the contribution to the flagged collection.
              It will no longer appear on Learn screens.
            </Text>

            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder="Reason for flagging (optional)"
              placeholderTextColor={Colors.textMuted}
              value={flagReason}
              onChangeText={setFlagReason}
              multiline
              numberOfLines={3}
              editable={actingOn === null}
            />

            <Pressable
              style={[styles.modalBtnDanger, actingOn && { opacity: 0.6 }]}
              onPress={handleFlagConfirm}
              disabled={actingOn !== null}
            >
              {actingOn ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>Flag contribution</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.modalBtnSecondary}
              onPress={() => {
                setShowFlagModal(null);
                setFlagReason('');
              }}
              disabled={actingOn !== null}
            >
              <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
            </Pressable>
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
    gap: Spacing.lg,
  },
  loadingText: { ...Typography.caption, color: Colors.textSecondary },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  topBar: { marginBottom: Spacing.xl },
  backLink: { ...Typography.body, color: Colors.primaryLight },

  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },

  // Access denied
  deniedEmoji: { fontSize: 64, marginBottom: Spacing.md },
  deniedTitle: { ...Typography.h2, color: Colors.text, textAlign: 'center' },
  deniedText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // List
  list: { gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  expression: { ...Typography.h3, color: Colors.text },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  metaLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginRight: Spacing.xs,
  },
  metaPrompt: { ...Typography.caption, color: Colors.textSecondary },
  metaLang: { ...Typography.tiny, color: Colors.textMuted },
  metaDetails: {
    ...Typography.tiny,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  approveBtn: { backgroundColor: Colors.success },
  approveBtnText: { ...Typography.caption, color: Colors.text, fontWeight: '700' },
  regionalBtn: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  regionalBtnText: { ...Typography.caption, color: Colors.purple, fontWeight: '700' },
  flagBtn: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  flagBtnText: { ...Typography.caption, color: Colors.danger, fontWeight: '700' },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Error
  errorBox: {
    marginBottom: Spacing.lg,
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
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtnPrimary: {
    backgroundColor: Colors.purple,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnPrimaryText: { ...Typography.bodyBold, color: Colors.text },
  modalBtnDanger: {
    backgroundColor: Colors.danger,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
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

  // Buttons (fallback)
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
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  btnSecondaryText: { ...Typography.bodyBold, color: Colors.text },
});