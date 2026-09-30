// app/(tabs)/contributions.tsx
// My Contributions — list of everything the current user has submitted.
//
// Each row shows:
//   - the user's submitted expression
//   - the parent prompt ("Hello" for a contribution on zu_greeting_hello)
//   - language + date
//   - status badge (pending, community_supported, reviewed, etc.)
//
// Empty state invites user to go learn and contribute.
//
// M5-minimal: no voting, no detail screen, no review workflow — just a clear
// record of what the user has contributed.

import { useState, useCallback } from 'react';
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
import { getMyContributionsWithContent } from '../../services/contributions';
import { getCurrentUser } from '../../services/auth';

// Status → color mapping
const STATUS_COLORS = {
  pending: Colors.warning,
  community_supported: Colors.info,
  reviewed: Colors.success,
  regional_variant: Colors.purple,
  flagged: Colors.danger,
};

const STATUS_LABELS = {
  pending: 'Pending review',
  community_supported: 'Community supported',
  reviewed: 'Reviewed',
  regional_variant: 'Regional variant',
  flagged: 'Flagged',
};

export default function Contributions() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [contributions, setContributions] = useState([]);

  const load = useCallback(async () => {
    setLoadError(null);

    const user = getCurrentUser();
    if (!user) {
      setLoadError('Not signed in');
      setLoading(false);
      return;
    }

    const result = await getMyContributionsWithContent(user.uid);
    if (result.ok) {
      setContributions(result.data || []);
    } else {
      setLoadError(result.error || "Couldn't load your contributions");
    }
    setLoading(false);
  }, []);

  // Reload whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleBack = () => {
    router.replace('/(tabs)/home');
  };

  const handleGoLearn = () => {
    router.replace('/(tabs)/home');
  };

  const handleRetry = () => {
    setLoading(true);
    load();
  };

  // Format a Firestore timestamp as a friendly relative time
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
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
              Couldn't load your contributions
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
        <View style={styles.header}>
          <Text style={styles.title}>My contributions</Text>
          <Text style={styles.subtitle}>
            {contributions.length === 0
              ? 'Nothing yet — your contributions will appear here.'
              : `${contributions.length} ${
                  contributions.length === 1 ? 'expression' : 'expressions'
                } added to Bamba.`}
          </Text>
        </View>

        {/* Empty state */}
        {contributions.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌍</Text>
            <Text style={styles.emptyTitle}>No contributions yet</Text>
            <Text style={styles.emptyText}>
              Finish a learning card and tap "Try your own" to add an
              expression. Your contributions help grow the language data.
            </Text>
            <Pressable style={styles.btnPrimary} onPress={handleGoLearn}>
              <Text style={styles.btnPrimaryText}>Start learning</Text>
            </Pressable>
          </View>
        )}

        {/* List */}
        {contributions.length > 0 && (
          <View style={styles.list}>
            {contributions.map((c) => {
              const statusColor = STATUS_COLORS[c.status] || Colors.textMuted;
              const statusLabel = STATUS_LABELS[c.status] || c.status;
              return (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.expression}>"{c.text}"</Text>

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

                  <View style={styles.footerRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { borderColor: statusColor },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColor },
                        ]}
                      />
                      <Text
                        style={[styles.statusText, { color: statusColor }]}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {formatDate(c.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
    padding: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  topBar: { marginBottom: Spacing.xl },
  backLink: { ...Typography.body, color: Colors.primaryLight },

  header: { marginBottom: Spacing.xxl },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

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
    marginBottom: Spacing.xl,
  },

  // List
  list: { gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
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
  metaPrompt: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  metaLang: {
    ...Typography.tiny,
    color: Colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...Typography.tiny, fontWeight: '600' },
  dateText: { ...Typography.tiny, color: Colors.textMuted },

  // Primary button (empty state)
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnPrimaryText: { ...Typography.bodyBold, color: Colors.text },

  // Fatal error card (centered, matches Home/Learn)
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
});