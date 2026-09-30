// app/(tabs)/learn.tsx
// The learning experience — one card at a time.
//
// Flow:
//   1. Load the content item (from route param contentId)
//   2. Show prompt ("Hello")
//   3. Tap "Reveal" → show translations (Sawubona, Sanibonani)
//   4. Optional: "Try your own" → contribution input → submit
//   5. Tap "Next" → mark completed, advance to next incomplete item
//   6. When all done → brief success → return to Home
//
// Progress writes:
//   - markSeen on card load
//   - markAttempt on reveal
//   - markCompleted on "Next"
//   - contribution submit writes to contributions/ collection
//
// Content honesty:
//   Each seeded translation shows a [DEMO] badge — it's prototype content,
//   not yet verified by a native speaker. When a translation is later
//   reviewed, the badge will flip to [VERIFIED] (M5+ work).

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
  getDemoLesson,
} from '../../services/content';
import {
  markSeen,
  markAttempt,
  markCompleted,
  getNextIncompleteItem,
} from '../../services/progress';
import { submitContribution } from '../../services/contributions';
import { getCurrentUser } from '../../services/auth';

// Status → badge label mapping
// Later: extend with 'community_supported', 'verified', etc.
const STATUS_BADGES = {
  reviewed: { label: 'DEMO', color: Colors.primaryLight },
  community_supported: { label: 'DEMO', color: Colors.primaryLight },
  pending: { label: 'DEMO', color: Colors.primaryLight },
  regional_variant: { label: 'DEMO', color: Colors.primaryLight },
  flagged: { label: 'DEMO', color: Colors.primaryLight },
};
const DEFAULT_BADGE = { label: 'DEMO', color: Colors.primaryLight };

export default function Learn() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialContentId = params.contentId || null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // fatal — can't proceed
  const [content, setContent] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [actionError, setActionError] = useState(null); // non-fatal — show inline

  // Contribution state
  const [showContribute, setShowContribute] = useState(false);
  const [contribText, setContribText] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Refs
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
    markedSeenRef.current = false;
    lastContentIdRef.current = contentId;

    if (!contentId) {
      setLoadError('No content to show');
      setLoading(false);
      return;
    }

    const contentRes = await getContentItem(contentId);
    if (!contentRes.ok) {
      setLoadError(contentRes.error || "Couldn't load this card");
      setLoading(false);
      return;
    }
    setContent(contentRes.data);

    const transRes = await getTranslationsForContent(contentId);
    if (transRes.ok) {
      setTranslations(transRes.data || []);
    } else {
      // Translations failing isn't fatal — user can still reveal and see "no expressions"
      setTranslations([]);
    }

    // Mark as seen (once per card)
    const user = getCurrentUser();
    if (user && !markedSeenRef.current) {
      markedSeenRef.current = true;
      try {
        await markSeen(user.uid, contentId);
      } catch {
        // Non-fatal — progress mark can be retried on Next
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadItem(initialContentId);
  }, [initialContentId, loadItem]);

  const handleRetryLoad = () => {
    loadItem(lastContentIdRef.current);
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
      } catch {
        // Non-fatal — user already sees translations
      }
    }
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
    } else {
      setActionError(result.error || 'Could not submit. Please try again.');
    }
  };

  const handleNext = async () => {
    const user = getCurrentUser();
    if (!user || !content) return;

    setActionError(null);

    try {
      await markCompleted(user.uid, content.id);
    } catch {
      // Non-fatal — continue to next
    }

    const lessonRes = await getDemoLesson(content.languageId, 10);
    if (!lessonRes.ok) {
      router.replace('/(tabs)/home');
      return;
    }

    const nextRes = await getNextIncompleteItem(user.uid, lessonRes.data);

    if (nextRes.ok && nextRes.next && nextRes.next.id !== content.id) {
      loadItem(nextRes.next.id);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleBack = () => {
    router.replace('/(tabs)/home');
  };

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
              <Text style={styles.backToHomeText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — NORMAL
  // ─────────────────────────────────────────────

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
            <Text style={styles.backLink}>← Home</Text>
          </Pressable>
        </View>

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
          <Pressable style={styles.btnPrimary} onPress={handleReveal}>
            <Text style={styles.btnPrimaryText}>Reveal</Text>
          </Pressable>
        ) : (
          <>
            {/* Translations */}
            <Text style={styles.sectionLabel}>EXPRESSIONS</Text>
            <View style={styles.translationList}>
              {translations.map((t) => {
                const badge = STATUS_BADGES[t.status] || DEFAULT_BADGE;
                return (
                  <View key={t.id} style={styles.translationCard}>
                    <View style={styles.translationHeader}>
                      <Text style={styles.translationText}>{t.text}</Text>
                      <View
                        style={[styles.badge, { borderColor: badge.color }]}
                      >
                        <Text
                          style={[styles.badgeText, { color: badge.color }]}
                        >
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.translationMetaRow}>
                      {t.region ? (
                        <Text style={styles.translationRegion}>
                          {t.region}
                        </Text>
                      ) : null}
                      {t.region && t.register ? (
                        <Text style={styles.translationRegion}> · </Text>
                      ) : null}
                      {t.register ? (
                        <Text style={styles.translationRegion}>
                          {t.register}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
              {translations.length === 0 && (
                <Text style={styles.noTranslation}>
                  No expressions yet — be the first to add one.
                </Text>
              )}
            </View>

            {/* Demo disclaimer */}
            {translations.length > 0 && (
              <Text style={styles.demoNote}>
                Demo content — pending native speaker review.
              </Text>
            )}

            {/* Try your own */}
            {!showContribute && !submitted && (
              <Pressable
                style={styles.contributeBtn}
                onPress={() => setShowContribute(true)}
              >
                <Text style={styles.contributeBtnText}>
                  ✏️  Try your own
                </Text>
              </Pressable>
            )}

            {/* Contribution form */}
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

            {/* Submitted confirmation */}
            {submitted && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✅ Submitted</Text>
                <Text style={styles.successText}>
                  Thanks! Your contribution is pending review.
                </Text>
              </View>
            )}

            {/* Action error (non-fatal — inline) */}
            {actionError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{String(actionError)}</Text>
              </View>
            )}

            {/* Next */}
            <Pressable style={styles.btnNext} onPress={handleNext}>
              <Text style={styles.btnNextText}>
                {submitted ? 'Continue' : 'Next'} →
              </Text>
            </Pressable>
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

  topBar: { marginBottom: Spacing.xxl },
  backLink: { ...Typography.body, color: Colors.primaryLight },

  // Prompt
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

  // Section
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  // Translations
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
    ...Typography.h2,
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
    marginTop: Spacing.md,
  },

  // Contribute button
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

  // Form
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

  // Buttons
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

  // Cancel
  cancelText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // Success
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

  // Fatal error card (centered, like Home)
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
  retryText: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
  },
  backToHomeText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },

  // Inline action error (non-fatal)
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