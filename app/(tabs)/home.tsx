// app/(tabs)/home.tsx
// Home dashboard — the hub after a language is picked.
//
// Shows:
//   1. Active language header (+ Contributions · Profile · Switch links)
//   2. Continue learning — first INCOMPLETE item
//   3. Progress — X of Y completed
//   4. Contribute — proper card section
//
// Also self-heals the `onboarded: true` flag on the user doc — makes
// onboarding truly one-time even if local AsyncStorage gets wiped.

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
import { getProgressSummary, getNextIncompleteItem } from '../../services/progress';
import { getCurrentUser } from '../../services/auth';

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [allComplete, setAllComplete] = useState(false);
  const [noContent, setNoContent] = useState(false);
  const [progress, setProgress] = useState({ seen: 0, completed: 0, total: 0 });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setNoContent(false);

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    // Self-healing: ensure `onboarded: true` on the user doc.
    // This makes onboarding truly persistent even if the local AsyncStorage
    // cache gets wiped (which can happen in Expo Go dev on Android).
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.onboarded !== true) {
          await updateDoc(userRef, { onboarded: true });
        }
      }
    } catch {
      // Non-fatal — Home still loads even if this write fails
    }

    // 1. Active language
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

    // 2. Demo lesson (first 10 items)
    const contentRes = await getDemoLesson(activeRes.languageId, 10);
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
      setProgress({ seen: 0, completed: 0, total: 0 });
      setLoading(false);
      return;
    }

    const contentIds = items.map((i) => i.id);

    // 3. Progress summary
    const progressRes = await getProgressSummary(user.uid, contentIds);
    if (progressRes.ok) {
      setProgress(progressRes.data);
    }

    // 4. First incomplete item
    const nextRes = await getNextIncompleteItem(user.uid, items);
    if (nextRes.ok) {
      if (nextRes.next) {
        setNextItem(nextRes.next);
        setAllComplete(false);
      } else {
        setNextItem(null);
        setAllComplete(true);
      }
    } else {
      setNextItem(items[0] || null);
      setAllComplete(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your language...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header with Contributions · Profile · Switch */}
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
            {progress.seen} seen · {Math.max(progress.total - progress.seen, 0)} new
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: { ...Typography.caption, color: Colors.textSecondary },
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
});