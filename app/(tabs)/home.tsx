// app/(tabs)/home.tsx
// Home dashboard — tiered learning hub.
//
// Progress display:
//   - "X of N resolved" (completed + skipped, what unlocks next tier)
//   - Breakdown: "A completed · B skipped · C remaining"
//   - Stacked bar: green (completed) + amber (skipped) + empty (remaining)
//
// Reset skipped:
//   - Only available AFTER all 4 tiers are complete
//   - "Redo X skipped cards" appears in the all-tiers-complete state
//   - Mid-tier "all skipped" state shows informational text only

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getActiveLanguageId, getLanguage } from '../../services/languages';
import { getFullLessonPool } from '../../services/content';
import {
  getCurrentTier,
  getTierItems,
  getTierProgressSummary,
  getNextIncompleteItem,
  getTotalSkippedAcrossTiers,
  resetSkipped,
} from '../../services/progress';
import { getCurrentUser } from '../../services/auth';
import { ensureReminderScheduled } from '../../services/notifications';

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [currentTier, setCurrentTier] = useState(1);
  const [totalTiers, setTotalTiers] = useState(4);
  const [tierProgress, setTierProgress] = useState({
    seen: 0,
    completed: 0,
    skipped: 0,
    total: 0,
    remaining: 0,
    isComplete: false,
  });
  const [allTiersComplete, setAllTiersComplete] = useState(false);
  const [justCompletedTier, setJustCompletedTier] = useState(null);
  const [allSkipped, setAllSkipped] = useState(false);
  const [totalSkippedAcross, setTotalSkippedAcross] = useState(0);
  const [noContent, setNoContent] = useState(false);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setNoContent(false);
    setAllTiersComplete(false);
    setAllSkipped(false);
    setJustCompletedTier(null);
    setTotalSkippedAcross(0);

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().onboarded !== true) {
        await updateDoc(userRef, { onboarded: true });
      }
    } catch {}

    const activeRes = await getActiveLanguageId(user.uid);
    if (!activeRes.ok || !activeRes.languageId) {
      router.replace('/(tabs)');
      return;
    }

    const langRes = await getLanguage(activeRes.languageId);
    if (!langRes.ok) {
      setError('Could not load language');
      setLoading(false);
      return;
    }
    setLanguage(langRes.data);

    try {
      ensureReminderScheduled(user.uid, langRes.data.name).catch(() => {});
    } catch {}

    const contentRes = await getFullLessonPool(activeRes.languageId);
    if (!contentRes.ok) {
      setError('Could not load lesson content');
      setNoContent(true);
      setLoading(false);
      return;
    }

    const allItems = contentRes.data || [];

    if (allItems.length === 0) {
      setNoContent(true);
      setNextItem(null);
      setLoading(false);
      return;
    }

    const tiersPresent = [
      ...new Set(allItems.map((i) => i.tier).filter((t) => typeof t === 'number')),
    ].sort((a, b) => a - b);
    setTotalTiers(tiersPresent.length || 4);

    const skippedRes = await getTotalSkippedAcrossTiers(user.uid, allItems);
    if (skippedRes.ok) {
      setTotalSkippedAcross(skippedRes.count || 0);
    }

    const tierRes = await getCurrentTier(user.uid, allItems);
    if (!tierRes.ok) {
      setError('Could not determine progress');
      setLoading(false);
      return;
    }

    const { tier: userTier, isAllComplete, tierComplete } = tierRes.data;

    setCurrentTier(userTier);
    setAllTiersComplete(isAllComplete);
    setJustCompletedTier(tierComplete);

    if (isAllComplete) {
      setNextItem(null);
      setLoading(false);
      return;
    }

    const tierItems = getTierItems(allItems, userTier);
    const tierSummaryRes = await getTierProgressSummary(
      user.uid,
      allItems,
      userTier
    );
    if (tierSummaryRes.ok) {
      setTierProgress(tierSummaryRes.data);
    }

    const nextRes = await getNextIncompleteItem(user.uid, tierItems);
    if (nextRes.ok) {
      if (nextRes.next) {
        setNextItem(nextRes.next);
        setAllSkipped(false);
      } else {
        setNextItem(null);
        const summary = tierSummaryRes.ok ? tierSummaryRes.data : null;
        if (summary && summary.completed >= summary.total) {
          setAllSkipped(false);
        } else if (summary && summary.skipped > 0) {
          setAllSkipped(true);
        }
      }
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSwitchLanguage = () => {
    const stamp = Date.now();
    router.replace(`/(tabs)?forceSwitch=1&t=${stamp}`);
  };

  const handleMyContributions = () => {
    router.push('/(tabs)/contributions');
  };

  const handleProfile = () => {
    router.push('/(tabs)/profile');
  };

  const handleResetSkippedPress = () => {
    setShowResetModal(true);
  };

  const handleResetSkippedConfirm = async () => {
    if (resetting) return;

    const user = getCurrentUser();
    if (!user) return;

    setShowResetModal(false);
    setResetting(true);
    try {
      const result = await resetSkipped(user.uid);
      if (result.ok) {
        const count = result.resetCount || 0;
        setResetSuccessMessage(
          count > 0
            ? `${count} skipped ${count === 1 ? 'card' : 'cards'} restored. You're back at Tier 1.`
            : 'No skipped cards to restore.'
        );
        setTimeout(() => setResetSuccessMessage(null), 5000);
        await load();
      }
    } catch {}
    setResetting(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.skeletonBar, { width: 70, height: 10 }]} />
              <View style={styles.langRow}>
                <View
                  style={[
                    styles.skeletonBar,
                    { width: 40, height: 40, borderRadius: 8 },
                  ]}
                />
                <View style={{ gap: 8 }}>
                  <View
                    style={[styles.skeletonBar, { width: 120, height: 22 }]}
                  />
                  <View
                    style={[styles.skeletonBar, { width: 180, height: 12 }]}
                  />
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.skeletonBar,
              {
                width: 140,
                height: 10,
                marginTop: Spacing.xxl,
                marginBottom: Spacing.md,
              },
            ]}
          />

          <View style={styles.skeletonCard}>
            <View
              style={[styles.skeletonBar, { width: '60%', height: 20 }]}
            />
            <View
              style={[
                styles.skeletonBar,
                { width: '40%', height: 12, marginTop: 8 },
              ]}
            />
          </View>

          <Text style={styles.skeletonHint}>Loading your language…</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const resolvedCount = tierProgress.completed + tierProgress.skipped;
  const completedPct = tierProgress.total > 0
    ? (tierProgress.completed / tierProgress.total) * 100
    : 0;
  const skippedPct = tierProgress.total > 0
    ? (tierProgress.skipped / tierProgress.total) * 100
    : 0;

  const showRedoSkipped = allTiersComplete && totalSkippedAcross > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>LEARNING</Text>
            <View style={styles.langRow}>
              <Text style={styles.langFlag}>🇿🇦</Text>
              <View>
                <Text style={styles.langName}>{language?.name}</Text>
                <Text style={styles.langMeta}>
                  {[language?.family, language?.regions?.join(', ')]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.topRightLinks}>
            <Pressable onPress={handleMyContributions} hitSlop={12}>
              <Text style={styles.switchLink}>Contributions</Text>
            </Pressable>

            <Text style={styles.linkSeparator}>·</Text>

            <Pressable onPress={handleProfile} hitSlop={12}>
              <Text style={styles.switchLink}>Profile</Text>
            </Pressable>

            <Text style={styles.linkSeparator}>·</Text>

            <Pressable onPress={handleSwitchLanguage} hitSlop={12}>
              <Text style={styles.switchLink}>Switch ▸</Text>
            </Pressable>
          </View>
        </View>

        {!allTiersComplete && (
          <View style={styles.tierBadgeRow}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>
                Tier {currentTier} of {totalTiers}
              </Text>
            </View>
          </View>
        )}

        {resetSuccessMessage && (
          <View style={styles.resetSuccessBanner}>
            <Text style={styles.resetSuccessText}>
              ✅ {resetSuccessMessage}
            </Text>
          </View>
        )}

        {justCompletedTier && !allTiersComplete && (
          <View style={styles.tierCompleteBanner}>
            <Text style={styles.tierCompleteEmoji}>🎉</Text>
            <Text style={styles.tierCompleteText}>
              Tier {justCompletedTier} complete! Tier {currentTier} unlocked.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>CONTINUE LEARNING</Text>

        {noContent ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardEmoji}>📡</Text>
            <Text style={styles.errorCardTitle}>
              Couldn't load lesson content
            </Text>
            <Text style={styles.errorCardText}>
              Check your connection and try again.
            </Text>
            <Pressable style={styles.errorRetryBtn} onPress={load}>
              <Text style={styles.errorRetryText}>Retry</Text>
            </Pressable>
          </View>
        ) : allTiersComplete ? (
          <View style={styles.completeCard}>
            <Text style={styles.completeEmoji}>🏆</Text>
            <Text style={styles.completeTitle}>All tiers complete!</Text>
            <Text style={styles.completeText}>
              You've finished every item across all {totalTiers} tiers in{' '}
              {language?.name}. Amazing work.
            </Text>
            {totalSkippedAcross > 0 && (
              <Text style={styles.completeSubtext}>
                You skipped {totalSkippedAcross}{' '}
                {totalSkippedAcross === 1 ? 'card' : 'cards'} along the way.
              </Text>
            )}
          </View>
        ) : nextItem ? (
          <Pressable
            style={styles.continueCard}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/learn',
                params: { contentId: nextItem.id },
              })
            }
          >
            <View style={styles.continueBody}>
              <Text style={styles.continuePrompt}>{nextItem.prompt}</Text>
              <Text style={styles.continueMeta}>
                {nextItem.type} · difficulty {nextItem.difficulty}
              </Text>
            </View>
            <View style={styles.continueArrow}>
              <Text style={styles.continueArrowText}>→</Text>
            </View>
          </Pressable>
        ) : allSkipped ? (
          <View style={styles.skippedCard}>
            <Text style={styles.skippedEmoji}>⏭️</Text>
            <Text style={styles.skippedTitle}>
              You've skipped everything in Tier {currentTier}
            </Text>
            <Text style={styles.skippedText}>
              You skipped {tierProgress.skipped}{' '}
              {tierProgress.skipped === 1 ? 'card' : 'cards'} in this tier.
            </Text>
            <Text style={styles.skippedHint}>
              You can revisit these after completing all {totalTiers} tiers.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No lesson content available yet.</Text>
          </View>
        )}

        {showRedoSkipped && (
          <Pressable
            style={[styles.redoBtn, resetting && styles.btnDisabled]}
            onPress={handleResetSkippedPress}
            disabled={resetting}
          >
            <Text style={styles.redoBtnText}>
              🔄 Redo {totalSkippedAcross} skipped{' '}
              {totalSkippedAcross === 1 ? 'card' : 'cards'}
            </Text>
          </Pressable>
        )}

        {!allTiersComplete && (
          <>
            <Text style={styles.sectionLabel}>
              TIER {currentTier} PROGRESS
            </Text>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressNumber}>
                  {resolvedCount}
                  <Text style={styles.progressOf}>
                    {' '}
                    of {tierProgress.total}
                  </Text>
                </Text>
                <Text style={styles.progressLabel}>resolved</Text>
              </View>

              <View style={styles.stackedBarWrap}>
                <View
                  style={[
                    styles.stackedBarCompleted,
                    { width: `${completedPct}%` },
                  ]}
                />
                <View
                  style={[
                    styles.stackedBarSkipped,
                    {
                      width: `${skippedPct}%`,
                      left: `${completedPct}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressDetail}>
                {tierProgress.completed} completed · {tierProgress.skipped}{' '}
                skipped · {Math.max(tierProgress.remaining, 0)} remaining
              </Text>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>CONTRIBUTE</Text>
        <Pressable
          style={styles.contributeCard}
          onPress={() => {
            if (nextItem) {
              router.push({
                pathname: '/(tabs)/learn',
                params: { contentId: nextItem.id },
              });
            }
          }}
        >
          <Text style={styles.contributeIcon}>🌍</Text>
          <View style={styles.contributeBody}>
            <Text style={styles.contributeTitle}>
              Know another way to say this?
            </Text>
            <Text style={styles.contributeText}>
              Add your own expression and help grow the language data.
            </Text>
          </View>
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        <View style={{ height: Spacing.huge }} />
      </ScrollView>

      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Redo skipped cards?</Text>
            <Text style={styles.modalText}>
              You've completed all {totalTiers} tiers. This will bring back{' '}
              {totalSkippedAcross}{' '}
              {totalSkippedAcross === 1 ? 'card' : 'cards'} you skipped along
              the way.
            </Text>
            <Text style={styles.modalWarning}>
              Heads up: your current tier will return to Tier 1, and you'll
              work through the restored cards again. The completed items stay
              completed.
            </Text>

            <Pressable
              style={styles.modalBtnPrimary}
              onPress={handleResetSkippedConfirm}
              disabled={resetting}
            >
              {resetting ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>
                  Redo skipped cards
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.modalBtnSecondary}
              onPress={() => setShowResetModal(false)}
              disabled={resetting}
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
  content: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerLeft: { flex: 1 },
  headerLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  langFlag: { fontSize: 40 },
  langName: { ...Typography.h1, color: Colors.text },
  langMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  topRightLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  switchLink: {
    ...Typography.caption,
    color: Colors.primaryLight,
  },
  linkSeparator: {
    ...Typography.caption,
    color: Colors.textMuted,
  },

  tierBadgeRow: { marginBottom: Spacing.lg },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tierBadgeText: {
    ...Typography.tiny,
    color: Colors.primaryLight,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  resetSuccessBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success,
    marginBottom: Spacing.lg,
  },
  resetSuccessText: {
    ...Typography.caption,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },

  tierCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tierCompleteEmoji: { fontSize: 24 },
  tierCompleteText: {
    ...Typography.bodyBold,
    color: Colors.success,
    flex: 1,
  },

  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: Spacing.lg,
  },
  continueBody: { flex: 1 },
  continuePrompt: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 4,
  },
  continueMeta: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  continueArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueArrowText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },

  completeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
  },
  completeEmoji: { fontSize: 48, marginBottom: Spacing.md },
  completeTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  completeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  completeSubtext: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },

  skippedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.warning,
    alignItems: 'center',
  },
  skippedEmoji: { fontSize: 48, marginBottom: Spacing.md },
  skippedTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  skippedText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  skippedHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  redoBtn: {
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.lg,
  },
  redoBtnText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  btnDisabled: { opacity: 0.6 },

  errorCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
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
  errorRetryBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  errorRetryText: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
  },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: { ...Typography.caption, color: Colors.textSecondary },

  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  progressNumber: { ...Typography.numberMedium, color: Colors.text },
  progressOf: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  progressLabel: { ...Typography.caption, color: Colors.textSecondary },
  stackedBarWrap: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  stackedBarCompleted: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: Colors.success,
  },
  stackedBarSkipped: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: Colors.warning,
  },
  progressDetail: { ...Typography.tiny, color: Colors.textMuted },

  contributeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.gold,
    gap: Spacing.lg,
  },
  contributeIcon: { fontSize: 36 },
  contributeBody: { flex: 1 },
  contributeTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  contributeText: { ...Typography.caption, color: Colors.textSecondary },

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

  skeletonBar: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    opacity: 0.6,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skeletonHint: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },

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
  },
  modalWarning: {
    ...Typography.caption,
    color: Colors.warning,
    lineHeight: 20,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
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
});