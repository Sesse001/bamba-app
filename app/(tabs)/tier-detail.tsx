// app/(tabs)/tier-detail.tsx
// Tier Detail — shows a specific tier's items with per-item status.
//
// Reached from Profile → tap a tier row.
// Query params: ?tier=1&languageId=zu
//
// Features:
//   - 25 items in this tier with status (completed/skipped/unvisited)
//   - "Continue Tier" or "Review Tier" button
//   - Item rows tappable to open in Learn with review mode
//   - Locked state if tier > current unlocked tier

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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getLanguage } from '../../services/languages';
import { getTierContent, getFullLessonPool } from '../../services/content';
import {
  getAllProgress,
  getCurrentTier,
  getTierProgressSummary,
} from '../../services/progress';
import { getCurrentUser } from '../../services/auth';

export default function TierDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tier = params.tier ? parseInt(params.tier, 10) : null;
  const languageId = params.languageId || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState(null);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [tierSummary, setTierSummary] = useState(null);
  const [currentTier, setCurrentTier] = useState(1);
  const [isLocked, setIsLocked] = useState(false);

  const load = useCallback(async () => {
    setError(null);

    if (!tier || !languageId) {
      setError('Missing tier or language');
      setLoading(false);
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    // 1. Language info
    const langRes = await getLanguage(languageId);
    if (!langRes.ok) {
      setError('Could not load language');
      setLoading(false);
      return;
    }
    setLanguage(langRes.data);

    // 2. Fetch tier items (only 25 for this tier)
    const tierItemsRes = await getTierContent(languageId, tier);
    if (!tierItemsRes.ok) {
      setError('Could not load tier items');
      setLoading(false);
      return;
    }
    setItems(tierItemsRes.data);

    // 3. Fetch progress for all items in this tier
    const progressRes = await getAllProgress(user.uid);
    if (progressRes.ok) {
      setProgress(progressRes.data);
    }

    // 4. Fetch full pool to compute current tier + locked state
    const poolRes = await getFullLessonPool(languageId);
    if (poolRes.ok) {
      const tierCompute = await getCurrentTier(user.uid, poolRes.data);
      if (tierCompute.ok) {
        setCurrentTier(tierCompute.data.tier);
        // Locked if this tier is greater than current tier
        setIsLocked(tier > tierCompute.data.tier && !tierCompute.data.isAllComplete);
      }

      const tierSummaryRes = await getTierProgressSummary(
        user.uid,
        poolRes.data,
        tier
      );
      if (tierSummaryRes.ok) {
        setTierSummary(tierSummaryRes.data);
      }
    }

    setLoading(false);
  }, [tier, languageId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = () => {
    router.replace('/(tabs)/profile');
  };

  const getItemStatus = (itemId) => {
    const p = progress[itemId];
    if (!p) return 'unvisited';
    if (p.completed) return 'completed';
    if (p.skipped) return 'skipped';
    if (p.seen) return 'seen';
    return 'unvisited';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'skipped': return 'Skipped';
      case 'seen': return 'Seen';
      case 'unvisited': return 'New';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'skipped': return Colors.warning;
      case 'seen': return Colors.info;
      case 'unvisited': return Colors.textMuted;
    }
  };

  const handleItemPress = (item) => {
    if (isLocked) return;
    router.push({
      pathname: '/(tabs)/learn',
      params: {
        contentId: item.id,
        reviewMode: '1',
        fromTier: String(tier),
        languageId,
      },
    });
  };

  const handleStartTier = () => {
    if (isLocked) return;

    // Find first incomplete/unskipped item in this tier
    const firstActionable = items.find((item) => {
      const status = getItemStatus(item.id);
      return status !== 'completed' && status !== 'skipped';
    });

    const targetItem = firstActionable || items[0];
    if (!targetItem) return;

    router.push({
      pathname: '/(tabs)/learn',
      params: {
        contentId: targetItem.id,
        reviewMode: '1',
        fromTier: String(tier),
        languageId,
      },
    });
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorCard}>
            <Text style={styles.errorCardEmoji}>📡</Text>
            <Text style={styles.errorCardTitle}>Couldn't load tier</Text>
            <Text style={styles.errorCardText}>{String(error)}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Pressable onPress={handleBack} hitSlop={12}>
              <Text style={styles.backToHomeText}>Back to Profile</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // NORMAL RENDER
  // ─────────────────────────────────────────────
  const resolvedCount = tierSummary
    ? tierSummary.completed + tierSummary.skipped
    : 0;
  const totalCount = tierSummary ? tierSummary.total : items.length;
  const isComplete = tierSummary?.isComplete || false;

  const isCurrentTier = currentTier === tier;
  const isPastTier = tier < currentTier;

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
        <Text style={styles.tierLabel}>
          TIER {tier} · {language?.name?.toUpperCase() || ''}
        </Text>
        <Text style={styles.title}>{getTierName(tier)}</Text>

        {/* Status banner */}
        {isLocked && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedEmoji}>🔒</Text>
            <Text style={styles.lockedText}>
              Complete Tier {currentTier} to unlock this tier.
            </Text>
          </View>
        )}

        {isComplete && (
          <View style={styles.completeBanner}>
            <Text style={styles.completeEmoji}>✅</Text>
            <Text style={styles.completeText}>
              Tier complete · {resolvedCount} of {totalCount} resolved
            </Text>
          </View>
        )}

        {isCurrentTier && !isComplete && (
          <View style={styles.currentBanner}>
            <Text style={styles.currentText}>
              Currently on this tier · {resolvedCount} of {totalCount} resolved
            </Text>
          </View>
        )}

        {/* Progress summary */}
        {tierSummary && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tierSummary.completed}</Text>
              <Text style={styles.statLabel}>completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tierSummary.skipped}</Text>
              <Text style={styles.statLabel}>skipped</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tierSummary.remaining}</Text>
              <Text style={styles.statLabel}>remaining</Text>
            </View>
          </View>
        )}

        {/* Action button */}
        {!isLocked && items.length > 0 && (
          <Pressable style={styles.btnPrimary} onPress={handleStartTier}>
            <Text style={styles.btnPrimaryText}>
              {isComplete
                ? 'Review Tier'
                : isCurrentTier
                ? 'Continue Tier'
                : 'Start Tier'}
            </Text>
          </Pressable>
        )}

        {/* Item list */}
        <Text style={styles.sectionLabel}>ITEMS ({items.length})</Text>
        <View style={styles.itemList}>
          {items.map((item) => {
            const status = getItemStatus(item.id);
            const statusColor = getStatusColor(status);
            const statusLabel = getStatusLabel(status);

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.itemRow,
                  isLocked && styles.itemRowLocked,
                ]}
                onPress={() => handleItemPress(item)}
                disabled={isLocked}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.itemBody}>
                  <Text
                    style={[
                      styles.itemText,
                      isLocked && styles.itemTextLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {item.prompt}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.type} · difficulty {item.difficulty}
                  </Text>
                </View>
                <Text style={[styles.itemStatus, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: Spacing.huge }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getTierName(tier) {
  switch (tier) {
    case 1: return 'Foundations';
    case 2: return 'Everyday Vocabulary';
    case 3: return 'Emotions & Body';
    case 4: return 'Time, Weather & Verbs';
    default: return `Tier ${tier}`;
  }
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

  tierLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xxl,
  },

  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  lockedEmoji: { fontSize: 24 },
  lockedText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },

  completeBanner: {
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
  completeEmoji: { fontSize: 24 },
  completeText: {
    ...Typography.bodyBold,
    color: Colors.success,
    flex: 1,
  },

  currentBanner: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  currentText: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  statItem: { alignItems: 'center' },
  statNumber: { ...Typography.numberSmall, color: Colors.text },
  statLabel: { ...Typography.tiny, color: Colors.textMuted, marginTop: 2 },

  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: Spacing.xl,
  },
  btnPrimaryText: { ...Typography.bodyBold, color: Colors.text },

  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  itemList: { gap: Spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  itemRowLocked: { opacity: 0.5 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemBody: { flex: 1 },
  itemText: { ...Typography.body, color: Colors.text, marginBottom: 2 },
  itemTextLocked: { color: Colors.textMuted },
  itemMeta: { ...Typography.tiny, color: Colors.textMuted },
  itemStatus: { ...Typography.tiny, fontWeight: '600' },

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