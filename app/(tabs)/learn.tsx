// app/(tabs)/learn.tsx
// Learning experience — demo translations + community contributions.
//
// Two data sources:
//   1. learning_content/{id}/translations — demo (curated) translations
//   2. contributions — user submissions (public read, flagged hidden by design)
//
// Review mode:
//   - Entered from Tier Detail with ?reviewMode=1&fromTier=X&languageId=Y
//   - Skip button hidden when current item is completed
//   - Returns to Tier Detail on tier exhaustion

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import {
  getContentItem,
  getTranslationsForContent,
  getFullLessonPool,
} from '../../services/content';
import {
  markSeen,
  markAttempt,
  markCompleted,
  markSkipped,
  getProgress,
  getAllProgress,
  getCurrentTier,
  getTierItems,
  getNextItemAfter,
} from '../../services/progress';
import {
  submitContribution,
  getContributionsForContent,
} from '../../services/contributions';
import { getCurrentUser } from '../../services/auth';

// ─── Status badges ───
const DEMO_BADGE = { label: 'DEMO', color: Colors.primaryLight };

const STATUS_BADGES = {
  pending: { label: 'PENDING', color: Colors.textMuted },
  community_supported: { label: 'COMMUNITY', color: Colors.info },
  reviewed: { label: 'REVIEWED', color: Colors.success },
  regional_variant: { label: 'REGIONAL', color: Colors.purple },
  // flagged should never appear in contributions collection (moved out)
};

const DEFAULT_COMMUNITY_BADGE = { label: 'PENDING', color: Colors.textMuted };

export default function Learn() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialContentId = params.contentId || null;
  const reviewMode = params.reviewMode === '1';
  const fromTier = params.fromTier ? parseInt(params.fromTier, 10) : null;
  const fromLanguageId = params.languageId || null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [content, setContent] = useState(null);
  const [tier, setTier] = useState(null);

  // Demo translations
  const [translations, setTranslations] = useState([]);

  // Community contributions
  const [contributions, setContributions] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState(null);

  // Progress for current item (used to hide skip in review mode if completed)
  const [itemCompleted, setItemCompleted] = useState(false);

  const [revealed, setRevealed] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [skipping, setSkipping] = useState(false);
  const [skipNotice, setSkipNotice] = useState(null);

  // Contribution form
  const [showContribute, setShowContribute] = useState(false);
  const [contribText, setContribText] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const markedSeenRef = useRef(false);
  const lastContentIdRef = useRef(null);

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────
  const loadItem = useCallback(async (contentId) => {
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    setRevealed(false);
    setShowContribute(false);
    setContribText('');
    setContribNote('');
    setSubmitted(false);
    setSkipping(false);
    setSkipNotice(null);
    setContributions([]);
    setCommunityError(null);
    setItemCompleted(false);
    markedSeenRef.current = false;
    lastContentIdRef.current = contentId;

    if (!contentId) {
      setLoadError('No content to show');
      setLoading(false);
      return;
    }

    // 1. Fetch content + demo translations
    const contentRes = await getContentItem(contentId);
    if (!contentRes.ok) {
      setLoadError(contentRes.error || "Couldn't load this card");
      setLoading(false);
      return;
    }
    setContent(contentRes.data);
    setTier(contentRes.data.tier || null);

    const transRes = await getTranslationsForContent(contentId);
    if (transRes.ok) {
      setTranslations(transRes.data || []);
    } else {
      setTranslations([]);
    }

    // 2. Check progress for current item (needed for review mode UI)
    const user = getCurrentUser();
    if (user) {
      try {
        const progressRes = await getProgress(user.uid, contentId);
        if (progressRes.ok && progressRes.data) {
          setItemCompleted(progressRes.data.completed === true);
        }
      } catch {}

      if (!markedSeenRef.current) {
        markedSeenRef.current = true;
        try {
          await markSeen(user.uid, contentId);
        } catch {}
      }
    }

    setLoading(false);

    // 3. Fetch community contributions (async, doesn't block render)
    loadCommunityContributions(contentId);
  }, []);

  const loadCommunityContributions = async (contentId) => {
    setCommunityLoading(true);
    setCommunityError(null);

    const result = await getContributionsForContent(contentId, { maxItems: 20 });

    if (result.ok) {
      setContributions(result.data || []);
    } else {
      setCommunityError(result.error || "Couldn't load community contributions");
    }

    setCommunityLoading(false);
  };

  useEffect(() => {
    loadItem(initialContentId);
  }, [initialContentId, loadItem]);

  const handleRetryLoad = () => {
    loadItem(lastContentIdRef.current);
  };

  const handleRetryCommunity = () => {
    if (lastContentIdRef.current) {
      loadCommunityContributions(lastContentIdRef.current);
    }
  };

  // ─────────────────────────────────────────────
  // ADVANCE WITHIN CURRENT TIER
  // ─────────────────────────────────────────────
  const advanceWithinTier = async () => {
    const user = getCurrentUser();
    if (!user || !content) {
      router.replace('/(tabs)/home');
      return;
    }

    const [poolRes, progressRes] = await Promise.all([
      getFullLessonPool(content.languageId),
      getAllProgress(user.uid),
    ]);

    if (!poolRes.ok) {
      // Fallback
      if (reviewMode && fromTier && fromLanguageId) {
        router.replace(
          `/(tabs)/tier-detail?tier=${fromTier}&languageId=${fromLanguageId}`
        );
      } else {
        router.replace('/(tabs)/home');
      }
      return;
    }

    const tierCompute = await getCurrentTier(user.uid, poolRes.data);
    const userTier = tierCompute.ok ? tierCompute.data.tier : content.tier;
    const tierItems = getTierItems(poolRes.data, userTier);
    const progressMap = progressRes.ok ? progressRes.data : {};

    const nextItem = getNextItemAfter(tierItems, content.id, progressMap);

    if (nextItem) {
      loadItem(nextItem.id);
    } else {
      // End of tier
      if (reviewMode && fromTier && fromLanguageId) {
        router.replace(
          `/(tabs)/tier-detail?tier=${fromTier}&languageId=${fromLanguageId}`
        );
      } else {
        router.replace('/(tabs)/home');
      }
    }
  };

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────
  const handleReveal = async () => {
    setRevealed(true);

    const user = getCurrentUser();
    if (user && content) {
      try {
        await markAttempt(user.uid, content.id);
      } catch {}
    }
  };

  const handleSkip = async () => {
    if (skipping) return;

    setSkipping(true);
    setActionError(null);
    setSkipNotice(null);

    const user = getCurrentUser();
    if (!user || !content) {
      setSkipping(false);
      return;
    }

    setSkipNotice("Skipped — we'll move to the next one.");

    try {
      await markSkipped(user.uid, content.id);
    } catch {}

    setTimeout(() => {
      advanceWithinTier();
    }, 800);
  };

  const handleNext = async () => {
    const user = getCurrentUser();
    if (!user || !content) return;

    setActionError(null);

    try {
      await markCompleted(user.uid, content.id);
    } catch {}

    await advanceWithinTier();
  };

  const handleSubmitContribution = async () => {
    if (!contribText.trim()) {
      setActionError('Please enter your expression');
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setActionError('Not signed in');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    Keyboard.dismiss();

    const result = await submitContribution(user.uid, {
      contentId: content.id,
      languageId: content.languageId,
      text: contribText,
      note: contribNote || undefined,
    });

    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
      setContribText('');
      setContribNote('');
      // Refresh community list to show new contribution
      loadCommunityContributions(content.id);
    } else {
      setActionError(result.error || 'Could not submit. Please try again.');
    }
  };

  const handleBack = () => {
    if (reviewMode && fromTier && fromLanguageId) {
      router.replace(
        `/(tabs)/tier-detail?tier=${fromTier}&languageId=${fromLanguageId}`
      );
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const currentUserId = getCurrentUser()?.uid;

  // ─────────────────────────────────────────────
  // RENDER — LOADING
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
  // RENDER — FATAL LOAD ERROR
  // ─────────────────────────────────────────────
  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorCard}>
            <Text style={styles.errorCardEmoji}>📡</Text>
            <Text style={styles.errorCardTitle}>
              Couldn't load this card
            </Text>
            <Text style={styles.errorCardText}>
              Check your connection and try again.
            </Text>
            <Pressable style={styles.retryBtn} onPress={handleRetryLoad}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Pressable onPress={handleBack} hitSlop={12}>
              <Text style={styles.backToHomeText}>Back</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — NORMAL
  // ─────────────────────────────────────────────
  const showSkipButton = !(reviewMode && itemCompleted);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraHeight={120}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={styles.backLink}>
              ← {reviewMode ? 'Tier' : 'Home'}
            </Text>
          </Pressable>
        </View>

        {/* Tier badge */}
        {tier && (
          <View style={styles.tierBadgeRow}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>Tier {tier}</Text>
            </View>
          </View>
        )}

        {/* Prompt */}
        <View style={styles.promptBlock}>
          <Text style={styles.promptLabel}>
            TRANSLATE TO {content?.languageId?.toUpperCase()}
          </Text>
          <Text style={styles.promptText}>{content?.prompt}</Text>
          <Text style={styles.promptMeta}>
            {content?.type} · difficulty {content?.difficulty}
          </Text>
        </View>

        {/* Reveal */}
        {!revealed ? (
          <>
            <Pressable style={styles.btnPrimary} onPress={handleReveal}>
              <Text style={styles.btnPrimaryText}>Reveal</Text>
            </Pressable>

            {showSkipButton && (
              <Pressable
                style={styles.skipBtn}
                onPress={handleSkip}
                disabled={skipping}
                hitSlop={12}
              >
                {skipping ? (
                  <Text style={styles.skipNoticeText}>
                    {skipNotice || 'Skipping…'}
                  </Text>
                ) : (
                  <Text style={styles.skipText}>
                    I don't know this yet — skip
                  </Text>
                )}
              </Pressable>
            )}
          </>
        ) : (
          <>
            {/* Demo translations */}
            <Text style={styles.sectionLabel}>DEMO TRANSLATIONS</Text>
            <View style={styles.translationList}>
              {translations.map((t) => (
                <View key={t.id} style={styles.translationCard}>
                  <View style={styles.translationHeader}>
                    <Text style={styles.translationText}>{t.text}</Text>
                    <View
                      style={[styles.badge, { borderColor: DEMO_BADGE.color }]}
                    >
                      <Text
                        style={[styles.badgeText, { color: DEMO_BADGE.color }]}
                      >
                        {DEMO_BADGE.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.translationMetaRow}>
                    {t.region ? (
                      <Text style={styles.translationRegion}>{t.region}</Text>
                    ) : null}
                    {t.region && t.register ? (
                      <Text style={styles.translationRegion}> · </Text>
                    ) : null}
                    {t.register ? (
                      <Text style={styles.translationRegion}>{t.register}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {translations.length === 0 && (
                <Text style={styles.noTranslation}>
                  No demo translations for this card yet.
                </Text>
              )}
            </View>

            {translations.length > 0 && (
              <Text style={styles.demoNote}>
                Illustrative content · awaiting native-speaker review
              </Text>
            )}

            {/* Community contributions */}
            {communityLoading && (
              <Text style={styles.communityLoadingText}>
                Loading community contributions…
              </Text>
            )}

            {!communityLoading && communityError && (
              <View style={styles.communityErrorBox}>
                <Text style={styles.communityErrorText}>{communityError}</Text>
                <Pressable
                  onPress={handleRetryCommunity}
                  hitSlop={12}
                  style={{ marginTop: Spacing.sm }}
                >
                  <Text style={styles.communityRetryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {!communityLoading &&
              !communityError &&
              contributions.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    COMMUNITY CONTRIBUTIONS ({contributions.length})
                  </Text>
                  <View style={styles.translationList}>
                    {contributions.map((c) => {
                      const badge =
                        STATUS_BADGES[c.status] || DEFAULT_COMMUNITY_BADGE;
                      const isMine = c.userId === currentUserId;
                      return (
                        <View key={c.id} style={styles.translationCard}>
                          <View style={styles.translationHeader}>
                            <Text style={styles.communityText}>{c.text}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              <View
                                style={[
                                  styles.badge,
                                  { borderColor: badge.color },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgeText,
                                    { color: badge.color },
                                  ]}
                                >
                                  {badge.label}
                                </Text>
                              </View>
                              {isMine && (
                                <Text style={styles.youIndicator}>(you)</Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.translationMetaRow}>
                            {c.region ? (
                              <Text style={styles.translationRegion}>
                                {c.region}
                              </Text>
                            ) : null}
                            {c.region && c.register ? (
                              <Text style={styles.translationRegion}> · </Text>
                            ) : null}
                            {c.register ? (
                              <Text style={styles.translationRegion}>
                                {c.register}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.demoNote}>
                    Community support does not establish linguistic verification.
                  </Text>
                </>
              )}

            {/* Try your own */}
            {!showContribute && !submitted && (
              <Pressable
                style={styles.contributeBtn}
                onPress={() => setShowContribute(true)}
              >
                <Text style={styles.contributeBtnText}>
                  ✏️  Add your own expression
                </Text>
              </Pressable>
            )}

            {showContribute && !submitted && (
              <View style={styles.contributeForm}>
                <Text style={styles.sectionLabel}>YOUR EXPRESSION</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`How would you say "${content?.prompt}"?`}
                  placeholderTextColor={Colors.textMuted}
                  value={contribText}
                  onChangeText={(v) => {
                    setContribText(v);
                    if (actionError) setActionError(null);
                  }}
                  autoCapitalize="none"
                  editable={!submitting}
                />

                <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Context, region, register..."
                  placeholderTextColor={Colors.textMuted}
                  value={contribNote}
                  onChangeText={setContribNote}
                  multiline
                  numberOfLines={3}
                  editable={!submitting}
                />

                <Pressable
                  style={[styles.btnPrimary, submitting && styles.btnDisabled]}
                  onPress={handleSubmitContribution}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.text} size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Submit</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowContribute(false);
                    setContribText('');
                    setContribNote('');
                    setActionError(null);
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {submitted && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✅ Submitted</Text>
                <Text style={styles.successText}>
                  Thanks! Your contribution is pending review.
                </Text>
              </View>
            )}

            {actionError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{String(actionError)}</Text>
              </View>
            )}

            <Pressable style={styles.btnNext} onPress={handleNext}>
              <Text style={styles.btnNextText}>
                {submitted ? 'Continue' : 'Next'} →
              </Text>
            </Pressable>

            {showSkipButton && (
              <Pressable
                style={styles.skipBtn}
                onPress={handleSkip}
                disabled={skipping}
                hitSlop={12}
              >
                {skipping ? (
                  <Text style={styles.skipNoticeText}>
                    {skipNotice || 'Skipping…'}
                  </Text>
                ) : (
                  <Text style={styles.skipText}>Skip without completing</Text>
                )}
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: Spacing.huge }} />
      </KeyboardAwareScrollView>
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

  topBar: { marginBottom: Spacing.lg },
  backLink: { ...Typography.body, color: Colors.primaryLight },

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

  promptBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  promptLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  promptText: {
    ...Typography.hero,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  promptMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },

  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  translationList: { gap: Spacing.md },
  translationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  translationText: {
    ...Typography.h3,
    color: Colors.text,
    flex: 1,
  },
  communityText: {
    ...Typography.h3,
    color: Colors.text,
    flex: 1,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.tiny,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  youIndicator: {
    ...Typography.tiny,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  translationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationRegion: {
    ...Typography.tiny,
    color: Colors.textMuted,
  },
  noTranslation: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  demoNote: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },

  communityLoadingText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontStyle: 'italic',
  },
  communityErrorBox: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
  },
  communityErrorText: {
    ...Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
  },
  communityRetryText: {
    ...Typography.caption,
    color: Colors.primaryLight,
    fontWeight: '700',
  },

  skipBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  skipText: {
    ...Typography.body,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  skipNoticeText: {
    ...Typography.body,
    color: Colors.success,
    fontStyle: 'italic',
  },

  contributeBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
  },
  contributeBtnText: {
    ...Typography.bodyBold,
    color: Colors.gold,
  },

  contributeForm: { marginTop: Spacing.lg },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { ...Typography.bodyBold, color: Colors.text },
  btnNext: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.xxl,
  },
  btnNextText: { ...Typography.bodyBold, color: Colors.text },

  cancelText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  successBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: Colors.success,
    gap: Spacing.xs,
  },
  successTitle: { ...Typography.bodyBold, color: Colors.success },
  successText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

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