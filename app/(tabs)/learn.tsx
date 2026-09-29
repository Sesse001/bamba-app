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

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getContentItem, getTranslationsForContent, getDemoLesson } from '../../services/content';
import {
  markSeen,
  markAttempt,
  markCompleted,
  getNextIncompleteItem,
} from '../../services/progress';
import { submitContribution } from '../../services/contributions';
import { getCurrentUser } from '../../services/auth';

export default function Learn() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialContentId = params.contentId || null;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState(null);

  // Contribution state
  const [showContribute, setShowContribute] = useState(false);
  const [contribText, setContribText] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Refs
  const markedSeenRef = useRef(false);

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────

  const loadItem = useCallback(
    async (contentId) => {
      setLoading(true);
      setError(null);
      setRevealed(false);
      setShowContribute(false);
      setContribText('');
      setContribNote('');
      setSubmitted(false);
      markedSeenRef.current = false;

      if (!contentId) {
        setError('No content to show');
        setLoading(false);
        return;
      }

      const contentRes = await getContentItem(contentId);
      if (!contentRes.ok) {
        setError(contentRes.error);
        setLoading(false);
        return;
      }
      setContent(contentRes.data);

      const transRes = await getTranslationsForContent(contentId);
      if (transRes.ok) {
        setTranslations(transRes.data || []);
      }

      // Mark as seen (once per card)
      const user = getCurrentUser();
      if (user && !markedSeenRef.current) {
        markedSeenRef.current = true;
        await markSeen(user.uid, contentId);
      }

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    loadItem(initialContentId);
  }, [initialContentId, loadItem]);

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────

  const handleReveal = async () => {
    setRevealed(true);

    const user = getCurrentUser();
    if (user && content) {
      await markAttempt(user.uid, content.id);
    }
  };

  const handleSubmitContribution = async () => {
    if (!contribText.trim()) {
      setError('Please enter your expression');
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in');
      return;
    }

    setSubmitting(true);
    setError(null);
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
      setError(result.error);
    }
  };

  const handleNext = async () => {
    const user = getCurrentUser();
    if (!user || !content) return;

    // Mark this item as completed
    await markCompleted(user.uid, content.id);

    // Find next incomplete item in the same language
    const lessonRes = await getDemoLesson(content.languageId, 10);
    if (!lessonRes.ok) {
      router.replace('/(tabs)/home');
      return;
    }

    const nextRes = await getNextIncompleteItem(user.uid, lessonRes.data);

    if (nextRes.ok && nextRes.next && nextRes.next.id !== content.id) {
      // Load the next item in place
      loadItem(nextRes.next.id);
    } else {
      // All done — back to Home
      router.replace('/(tabs)/home');
    }
  };

  const handleBack = () => {
    router.replace('/(tabs)/home');
  };

  // ─────────────────────────────────────────────
  // RENDER
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

  if (error && !content) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{String(error)}</Text>
          <Pressable style={styles.btnSecondary} onPress={handleBack}>
            <Text style={styles.btnSecondaryText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.promptLabel}>TRANSLATE TO {content?.languageId?.toUpperCase()}</Text>
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
              {translations.map((t) => (
                <View key={t.id} style={styles.translationCard}>
                  <Text style={styles.translationText}>{t.text}</Text>
                  <View style={styles.translationMetaRow}>
                    <Text style={styles.translationStatus}>{t.status}</Text>
                    {t.region ? (
                      <Text style={styles.translationRegion}> · {t.region}</Text>
                    ) : null}
                    {t.register ? (
                      <Text style={styles.translationRegion}> · {t.register}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {translations.length === 0 && (
                <Text style={styles.noTranslation}>
                  No expressions yet — be the first to add one.
                </Text>
              )}
            </View>

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
                  onChangeText={setContribText}
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

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{String(error)}</Text>
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
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  // Top bar
  topBar: {
    marginBottom: Spacing.xxl,
  },
  backLink: {
    ...Typography.body,
    color: Colors.primaryLight,
  },

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
  translationList: {
    gap: Spacing.md,
  },
  translationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  translationText: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  translationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationStatus: {
    ...Typography.tiny,
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

  // Contribute button (in learn screen)
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
  contributeForm: {
    marginTop: Spacing.lg,
  },
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
  btnSecondary: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.lg,
  },
  btnSecondaryText: { ...Typography.bodyBold, color: Colors.text },
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
  successTitle: {
    ...Typography.bodyBold,
    color: Colors.success,
  },
  successText: {
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