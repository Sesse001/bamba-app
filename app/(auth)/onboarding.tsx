// app/(auth)/onboarding.tsx
// First-launch onboarding — 3 screens explaining what Bamba is.
//
// Shown ONCE per install (tracked via AsyncStorage: bamba.onboarded).
//
// Exit behavior:
//   - If user is signed in (auto-login or prior session) → go straight to (tabs)
//   - If not signed in → go to Welcome (sign-in)
//
// This avoids the loop caused by the auth gate also wanting to send
// signed-in users to (tabs) while onboarding tries to send them to Welcome.

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { getCurrentUser } from '../../services/auth';

const ONBOARDED_KEY = 'bamba.onboarded';

const SLIDES = [
  {
    id: 'learn',
    emoji: '📚',
    title: 'Learn South African languages',
    text: 'Practice isiZulu, Sesotho, Xitsonga, and more — one short lesson at a time.',
  },
  {
    id: 'contribute',
    emoji: '🌍',
    title: 'Contribute what you know',
    text: 'Add your own expressions and help preserve languages for future generations.',
  },
  {
    id: 'start',
    emoji: '✨',
    title: 'Start with one language',
    text: 'You can switch or add more anytime. There is no rush.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;
  const isFirst = currentIndex === 0;

  const markComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      // If storage fails, still proceed — the user shouldn't be blocked
    }
  };

  const routeAfterOnboarding = () => {
    // Signed-in users (auto-login or previous session) skip Welcome entirely.
    // Non-signed-in users go to Welcome to sign in.
    const currentUser = getCurrentUser();
    if (currentUser) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSkip = async () => {
    await markComplete();
    routeAfterOnboarding();
  };

  const handleFinish = async () => {
    await markComplete();
    routeAfterOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.slideWrap}>
          <Text style={styles.slideEmoji}>{slide.emoji}</Text>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideText}>{slide.text}</Text>
        </View>

        <View style={styles.dotsRow}>
          {SLIDES.map((s, idx) => (
            <View
              key={s.id}
              style={[styles.dot, idx === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {!isFirst ? (
          <Pressable
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={12}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {isLast ? 'Get started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  skipText: {
    ...Typography.bodyBold,
    color: Colors.textMuted,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  slideWrap: {
    alignItems: 'center',
    marginBottom: Spacing.huge,
  },
  slideEmoji: {
    fontSize: 88,
    marginBottom: Spacing.xxl,
  },
  slideTitle: {
    ...Typography.h1,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  slideText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    paddingVertical: Spacing.md,
  },
  backText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  backSpacer: {
    width: 60,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  nextBtnText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
});