// components/LearnCard.js
// Reusable learning card.
//
// Flow: prompt → reveal → show existing expressions → offer "Try your own"
//
// Handles:
//   - Displaying the English prompt
//   - Revealing seeded translations on tap
//   - Marking progress (seen, attempted, completed)
//   - Inline contribution form (appears only after reveal)
//
// Parent (learn.tsx) handles:
//   - Which item to show
//   - Advancing to next card
//   - Lesson-complete state

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { getTranslationsForContent } from '../services/content';
import { markSeen, markAttempt, markCompleted } from '../services/progress';
import { submitContribution } from '../services/contributions';

export default function LearnCard({
  uid,
  item,                    // { id, prompt, type, difficulty, languageId }
  languageName,            // "isiZulu"
  index,                   // 0-based position
  total,                   // total items in lesson
  onNext,                  // () => void — advance to next card
  onContributionSubmitted, // () => void — notify parent when contribution is saved
}) {
  const [stage, setStage] = useState('prompt'); // 'prompt' | 'revealed' | 'contributing'
  const [translations, setTranslations] = useState([]);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const [contributionText, setContributionText] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when item changes (user advanced to next card)
  useEffect(() => {
    setStage('prompt');
    setTranslations([]);
    setContributionText('');
    setContributionNote('');
    setSubmitted(false);
    setError(null);
  }, [item?.id]);

  // Mark seen when card first loads
  useEffect(() => {
    if (!uid || !item?.id) return;
    markSeen(uid, item.id);
  }, [uid, item?.id]);

  const handleReveal = async () => {
    setLoadingTranslations(true);
    setError(null);

    const res = await getTranslationsForContent(item.id);
    if (!res.ok) {
      setError(res.error);
      setLoadingTranslations(false);
      return;
    }

    setTranslations(res.data);
    setStage('revealed');
    setLoadingTranslations(false);

    // Mark that the user interacted with this card
    await markAttempt(uid, item.id);
  };

  const handleSubmitContribution = async () => {
    setError(null);

    if (!contributionText.trim()) {
      setError('Please enter your expression');
      return;
    }

    setSubmitting(true);

    const res = await submitContribution(uid, {
      contentId: item.id,
      languageId: item.languageId,
      text: contributionText,
      note: contributionNote,
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSubmitted(true);
    await markCompleted(uid, item.id);
    if (onContributionSubmitted) onContributionSubmitted();
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No item loaded</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <Text style={styles.progress}>
        {index + 1} of {total}
      </Text>

      {/* Prompt card */}
      <View style={styles.promptCard}>
        <Text style={styles.promptType}>
          {item.type} · difficulty {item.difficulty}
        </Text>
        <Text style={styles.promptText}>{item.prompt}</Text>
      </View>

      {/* STAGE 1 — Prompt only */}
      {stage === 'prompt' && (
        <Pressable
          style={[styles.btnPrimary, loadingTranslations && styles.btnDisabled]}
          onPress={handleReveal}
          disabled={loadingTranslations}
        >
          {loadingTranslations ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <Text style={styles.btnPrimaryText}>Reveal {languageName}</Text>
          )}
        </Pressable>
      )}

      {/* STAGE 2 — Revealed: show translations */}
      {(stage === 'revealed' || stage === 'contributing') && (
        <>
          <Text style={styles.sectionLabel}>
            {languageName.toUpperCase()} EXPRESSIONS
          </Text>

          {translations.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No known expressions yet — be the first to add one.
              </Text>
            </View>
          ) : (
            <View style={styles.translationList}>
              {translations.map((t) => (
                <View key={t.id} style={styles.translationCard}>
                  <Text style={styles.translationText}>{t.text}</Text>
                  <View style={styles.badgeRow}>
                    {t.status ? (
                      <Text style={styles.badge}>{formatStatus(t.status)}</Text>
                    ) : null}
                    {t.register ? (
                      <Text style={styles.badgeSecondary}>{t.register}</Text>
                    ) : null}
                    {t.region ? (
                      <Text style={styles.badgeSecondary}>{t.region}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* STAGE 2 — Actions when revealed */}
          {stage === 'revealed' && (
            <>
              {!submitted && (
                <Pressable
                  style={styles.btnGold}
                  onPress={() => setStage('contributing')}
                >
                  <Text style={styles.btnGoldText}>✍️  Try your own</Text>
                </Pressable>
              )}

              {submitted && (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>
                    ✅ Contribution submitted
                  </Text>
                  <Text style={styles.successText}>
                    Thanks — your expression is pending review.
                  </Text>
                </View>
              )}

              <Pressable style={styles.btnPrimary} onPress={onNext}>
                <Text style={styles.btnPrimaryText}>Next card →</Text>
              </Pressable>
            </>
          )}
        </>
      )}

      {/* STAGE 3 — Contribution form */}
      {stage === 'contributing' && !submitted && (
        <>
          <Text style={styles.sectionLabel}>ADD YOUR EXPRESSION</Text>

          <TextInput
            style={styles.input}
            placeholder={`Type your ${languageName} expression`}
            placeholderTextColor={Colors.textMuted}
            value={contributionText}
            onChangeText={setContributionText}
            editable={!submitting}
            autoCapitalize="sentences"
          />

          <TextInput
            style={[styles.input, styles.inputNote]}
            placeholder="Add a note (optional) — region, context, usage"
            placeholderTextColor={Colors.textMuted}
            value={contributionNote}
            onChangeText={setContributionNote}
            editable={!submitting}
            multiline
            numberOfLines={2}
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{String(error)}</Text>
            </View>
          )}

          <Pressable
            style={[styles.btnPrimary, submitting && styles.btnDisabled]}
            onPress={handleSubmitContribution}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>Submit contribution</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.btnGhost}
            onPress={() => setStage('revealed')}
            disabled={submitting}
          >
            <Text style={styles.btnGhostText}>Cancel</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function formatStatus(status) {
  if (!status) return '';
  return status.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
  },
  progress: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // Prompt card
  promptCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  promptType: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
  },
  promptText: {
    ...Typography.hero,
    color: Colors.text,
    textAlign: 'center',
  },

  // Section labels
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    ...Typography.tiny,
    color: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    textTransform: 'capitalize',
  },
  badgeSecondary: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    textTransform: 'capitalize',
  },
  emptyBox: {
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
    textAlign: 'center',
  },

  // Buttons
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.lg,
  },
  btnPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnGold: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.lg,
  },
  btnGoldText: {
    ...Typography.bodyBold,
    color: Colors.gold,
  },
  btnGhost: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnGhostText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  // Form
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  inputNote: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Success
  successBox: {
    marginTop: Spacing.lg,
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
    marginTop: Spacing.md,
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