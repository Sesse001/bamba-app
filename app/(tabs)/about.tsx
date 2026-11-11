// app/(tabs)/about.tsx
// About Bamba — version, credits, legal links, contact.
//
// Reached from Profile → About.
// Legal links (Privacy, Terms) will be wired up once those screens exist.
// For now, they route to placeholder screens with "draft pending review" note.

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';

const APP_VERSION = '1.0.0';
const CONTACT_EMAIL = 'mabasosenzo190@gmail.com';

export default function About() {
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(tabs)/profile');
  };

  const handlePrivacy = () => {
    router.push('/legal/privacy');
  };

  const handleTerms = () => {
    router.push('/legal/terms');
  };

  const handleContact = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Bamba%20Feedback`);
  };

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

        {/* Logo + title */}
        <View style={styles.brandBlock}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Bamba</Text>
          <Text style={styles.tagline}>Learn · Contribute · Preserve</Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
        </View>

        {/* What is Bamba */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Bamba is a South African language-learning and contribution
            platform. Learn expressions in isiZulu, Sesotho, Xitsonga, and
            more — while contributing your own knowledge to help preserve
            these languages for future generations.
          </Text>
          <Text style={styles.bodyText}>
            Unlike traditional language apps, Bamba doesn't treat translations
            as simply "correct" or "incorrect". Regional variants, formal
            and casual registers, and community alternatives are all
            first-class.
          </Text>
        </View>

        {/* Demo content note */}
        <Text style={styles.sectionLabel}>CONTENT NOTE</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Some current learning material is demonstration content and may
            not yet have been reviewed by native speakers or language
            specialists. Demonstration content should not be treated as
            officially verified translations.
          </Text>
        </View>

        {/* Legal links */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.linkCard}>
          <Pressable style={styles.linkRow} onPress={handlePrivacy}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow} onPress={handleTerms}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
        </View>

        {/* Contact */}
        <Text style={styles.sectionLabel}>CONTACT</Text>
        <View style={styles.linkCard}>
          <Pressable style={styles.linkRow} onPress={handleContact}>
            <Text style={styles.linkText}>Send feedback</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
        </View>

        {/* Credits */}
        <Text style={styles.sectionLabel}>CREDITS</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Built in South Africa 🇿🇦
          </Text>
          <Text style={styles.bodyText}>
            Made for language preservation and language learners everywhere.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © 2026 Bamba · Made with care
        </Text>

        <View style={{ height: Spacing.huge }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  topBar: { marginBottom: Spacing.xl },
  backLink: { ...Typography.body, color: Colors.primaryLight },

  // Brand block
  brandBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...Typography.body,
    color: Colors.primaryLight,
    marginBottom: Spacing.sm,
  },
  version: {
    ...Typography.caption,
    color: Colors.textMuted,
  },

  // Section
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },

  // Content card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // Link card
  linkCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  linkText: {
    ...Typography.body,
    color: Colors.text,
  },
  linkChevron: {
    ...Typography.h3,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xl,
  },

  // Footer
  footer: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.huge,
  },
});