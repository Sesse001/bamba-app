// app/(tabs)/home.tsx
// Home dashboard — the hub after a language is picked.
//
// Shows:
//   1. Active language header (+ Contributions · Profile · Switch links)
//   2. Continue learning — first unskipped, incomplete item
//   3. Progress — X of Y completed (+ skipped count)
//   4. Contribute — proper card section
//
// Special states:
//   - All items completed → "🎉 Lesson complete!"
//   - All unskipped items done but some skipped → "You've skipped everything"
//     with Reset button (calls resetSkipped)
//   - No content → "Couldn't load lesson content"
//
// Performance:
//   - Parallel queries for content + progress
//   - Loading skeleton
//   - Self-heals onboarded flag on user doc
//   - Re-schedules reminder if enabled

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getActiveLanguageId, getLanguage } from '../../services/languages';
import { getDemoLesson } from '../../services/content';
import {
  getProgressSummary,
  getNextIncompleteItem,
  resetSkipped,
} from '../../services/progress';
import { getCurrentUser } from '../../services/auth';
import { ensureReminderScheduled } from '../../services/notifications';

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [allComplete, setAllComplete] = useState(false);
  const [allSkipped, setAllSkipped] = useState(false);
  const [noContent, setNoContent] = useState(false);
  const [progress, setProgress] = useState({
    seen: 0,
    completed: 0,
    skipped: 0,
    total: 0,
    remaining: 0,
  });
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNoContent(false);
    setAllComplete(false);
    setAllSkipped(false);

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    // Self-healing: ensure onboarded flag on user doc
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().onboarded !== true) {
        await updateDoc(userRef, { onboarded: true });
      }
    } catch {}

    // 1. Active language (cache-first)
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

    // Re-schedule reminder if user has it enabled
    try {
      ensureReminderScheduled(user.uid, langRes.data.name).catch(() => {});
    } catch {}

    // 2. Fetch content FIRST (larger pool now — 30 items)
    const contentRes = await getDemoLesson(activeRes.languageId, 30);
    if (!contentRes.ok) {
      setError('Could not load lesson content');
      setNoContent(true);
      setLoading(false);
      return;
    }

    const items = contentRes.data || [];

    if (items.length === 0) {
      setNoContent(true);
      setNextItem(null);
      setAllComplete(false);
      setProgress({
        seen: 0,
        completed: 0,
        skipped: 0,
        total: 0,
        remaining: 0,
      });
      setLoading(false);
      return;
    }

    const contentIds = items.map((i) => i.id);

    // 3. Run progress + next in parallel
    const [progressRes, nextRes] = await Promise.all([
      getProgressSummary(user.uid, contentIds),
      getNextIncompleteItem(user.uid, items),
    ]);

    if (progressRes.ok) {
      setProgress(progressRes.data);
    }

    if (nextRes.ok) {
      if (nextRes.next) {
        setNextItem(nextRes.next);
        setAllComplete(false);
        setAllSkipped(false);
      } else {
        // No unskipped, incomplete item remains
        setNextItem(null);
        const data = progressRes.data;
        if (data) {
          if (data.completed >= data.total) {
            // Everything actually completed
            setAllComplete(true);
            setAllSkipped(false);
          } else {
            // Some/all skipped, none left to show
            setAllComplete(false);
            setAllSkipped(true);
          }
        }
      }
    } else {
      setNextItem(items[0] || null);
      setAllComplete(false);
      setAllSkipped(false);
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

  const handleResetSkipped = async () => {
    if (resetting) return;

    const user = getCurrentUser();
    if (!user) return;

    setResetting(true);
    try {
      await resetSkipped(user.uid);
      await load();
    } catch {}
    setResetting(false);
  };

  // ─────────────────────────────────────────────
  // LOADING SKELETON
  // ─────────────────────────────────────────────
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

          <View
            style={[
              styles.skeletonBar,
              {
                width: 90,
                height: 10,
                marginTop: Spacing.xxl,
                marginBottom: Spacing.md,
              },
            ]}
          />

          <View style={styles.skeletonCard}>
            <View
              style={[styles.skeletonBar, { width: '50%', height: 32 }]}
            />
            <View
              style={[
                styles.skeletonBar,
                { width: '100%', height: 8, marginTop: 16 },
              ]}
            />
            <View
              style={[
                styles.skeletonBar,
                { width: '40%', height: 10, marginTop: 12 },
              ]}
            />
          </View>

          <Text style={styles.skeletonHint}>Loading your language…</Text>
        </ScrollView>
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
        {/* 1. Header */}
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

        {/* 2. Continue learning */}
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
        ) : allComplete ? (
          <View style={styles.completeCard}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeTitle}>Lesson complete!</Text>
            <Text style={styles.completeText}>
              You've finished all {progress.total} items in this set.
            </Text>
          </View>
        ) : allSkipped ? (
          <View style={styles.skippedCard}>
            <Text style={styles.skippedEmoji}>⏭️</Text>
            <Text style={styles.skippedTitle}>
              You've skipped everything
            </Text>
            <Text style={styles.skippedText}>
              You skipped {progress.skipped}{' '}
              {progress.skipped === 1 ? 'card' : 'cards'}. Want to bring them
              back and try again?
            </Text>
            <Pressable
              style={[styles.resetBtn, resetting && styles.btnDisabled]}
              onPress={handleResetSkipped}
              disabled={resetting}
            >
              {resetting ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <Text style={styles.resetBtnText}>Bring back skipped cards</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No lesson content available yet.</Text>
          </View>
        )}

        {/* 3. Progress */}
        <Text style={styles.sectionLabel}>PROGRESS</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressNumber}>
              {progress.completed}
              <Text style={styles.progressOf}> of {progress.total}</Text>
            </Text>
            <Text style={styles.progressLabel}>completed</Text>
          </View>
          <View style={styles.progressBarWrap}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    progress.total > 0
                      ? `${(progress.completed / progress.total) * 100}%`
                      : '0%',
                },
              ]}
            />
          </View>
          <Text style={styles.progressDetail}>
            {progress.seen} seen · {progress.skipped} skipped ·{' '}
            {Math.max(progress.remaining, 0)} remaining
          </Text>
        </View>

        {/* 4. Contribute */}
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
    marginBottom: Spacing.xxl,
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

  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
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
  },
  skippedText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  resetBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  resetBtnText: {
    ...Typography.bodyBold,
    color: Colors.text,
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
  progressBarWrap: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
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
});