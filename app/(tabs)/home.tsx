// app/(tabs)/home.tsx
// Home dashboard — the "hub" after a language is picked.
//
// Layout (per ChatGPT's direction):
//   1. Active language header
//   2. Continue learning — one next card
//   3. Progress — "X of 10"
//   4. Contribute — proper card section
//
// Data flow:
//   - reads activeLanguageId (cache + Firestore)
//   - fetches the language doc
//   - fetches first 10 content items for that language
//   - fetches progress summary for those items
//   - "Continue" routes to learn.tsx (M4 File 4)

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
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getActiveLanguageId, getLanguage } from '../../services/languages';
import { getDemoLesson } from '../../services/content';
import { getProgressSummary } from '../../services/progress';
import { getCurrentUser } from '../../services/auth';

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [progress, setProgress] = useState({ seen: 0, completed: 0, total: 0 });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    // 1. Active language
    const activeRes = await getActiveLanguageId(user.uid);
    if (!activeRes.ok || !activeRes.languageId) {
      // No active language — send back to picker
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
      setError('Could not load lesson');
      setLoading(false);
      return;
    }

    const items = contentRes.data || [];
    const contentIds = items.map((i) => i.id);

    // 3. Progress summary for those items
    const progressRes = await getProgressSummary(user.uid, contentIds);
    if (progressRes.ok) {
      setProgress(progressRes.data);
    }

    // 4. Pick the "next" item — the first not-completed one
    let next = items[0] || null;
    if (progressRes.ok && items.length > 0) {
      const completedSet = new Set();
      // We don't have per-item data here yet, so we use a simpler heuristic:
      // if completed count equals total, there is no "next".
      if (progressRes.data.completed < items.length) {
        // Find first item not marked completed by fetching each one later.
        // For M4 simplicity, just pick the first one — M5 will refine.
        next = items[0];
      }
    }
    setNextItem(next);

    setLoading(false);
  }, [router]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Reload when screen comes back into focus (e.g. after returning from Learn)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        {/* 1. Active language header */}
        <View style={styles.header}>
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

        {/* 2. Continue learning */}
        <Text style={styles.sectionLabel}>CONTINUE LEARNING</Text>
        {nextItem ? (
          <Pressable
            style={styles.continueCard}
            onPress={() => router.push('/(tabs)/learn')}
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
            {progress.seen} seen · {progress.total - progress.seen} new
          </Text>
        </View>

        {/* 4. Contribute */}
        <Text style={styles.sectionLabel}>CONTRIBUTE</Text>
        <Pressable
          style={styles.contributeCard}
          onPress={() => router.push('/(tabs)/learn')}
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

        {/* Error */}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  // Header
  header: {
    marginBottom: Spacing.xxl,
  },
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
  langFlag: {
    fontSize: 40,
  },
  langName: {
    ...Typography.h1,
    color: Colors.text,
  },
  langMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Sections
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },

  // Continue card
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
  continueBody: {
    flex: 1,
  },
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
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Progress card
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
  progressNumber: {
    ...Typography.numberMedium,
    color: Colors.text,
  },
  progressOf: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
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
  progressDetail: {
    ...Typography.tiny,
    color: Colors.textMuted,
  },

  // Contribute card
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
  contributeIcon: {
    fontSize: 36,
  },
  contributeBody: {
    flex: 1,
  },
  contributeTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  contributeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Error
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