// app/legal/terms.tsx
// Terms of Service — DRAFT VERSION
//
// Structure is final. Body text is placeholder pending legal review.
// When ChatGPT provides final legal text, replace only the SECTIONS array.
// No other code changes needed.

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
import { Colors, Spacing, Radius, Typography } from '../../theme';

const EFFECTIVE_DATE = 'Draft — Pending Legal Review';
const CONTACT_EMAIL = 'mabasosenzo190@gmail.com';

// Replace this array with final legal text when ready.
const SECTIONS = [
  {
    title: '1. Accepting these terms',
    body: `These Terms of Service apply when you access or use Bamba.

By creating an account or using Bamba, you agree to these terms and our Privacy Policy. If you do not agree, do not use the service.`,
  },
  {
    title: '2. What Bamba provides',
    body: `Bamba is a language-learning and contribution platform. It provides learning content, practice activities, progress tracking, and a way for users to submit language expressions and translations.

Bamba may add, change, suspend, or remove features as the platform develops.`,
  },
  {
    title: '3. Accounts and guest access',
    body: `You may be able to use Bamba through a guest account or an email-based account.

You agree to:
• Provide accurate information when you choose to provide it.
• Keep your account credentials secure.
• Use only accounts that you are authorised to access.
• Tell us if you believe your account has been accessed without permission.

Guest accounts may be linked to an email-based account using the upgrade process provided in the app. Signing out does not delete your account or its associated information.`,
  },
  {
    title: '4. Contributions and ownership',
    body: `You retain ownership of any intellectual property rights you hold in content you submit to Bamba.

By submitting a contribution, you grant the Bamba operator a worldwide, non-exclusive, royalty-free licence, for the duration of the applicable rights, to:

• Store, reproduce, and display your contribution.
• Review, organise, classify, and moderate it.
• Use it in Bamba's learning and practice features.
• Correct formatting and make reasonable adaptations needed to display or use it.
• Include it in language-learning, language-preservation, and research materials.
• Make it available to research, educational, and language-preservation partners for those purposes, subject to appropriate privacy safeguards.
• Authorise service providers and relevant partners to carry out these activities on Bamba's behalf or for those stated purposes.

This licence does not transfer ownership of your contribution to Bamba. It does not give Bamba permission to publish your private account information as part of a contribution.

The licence applies only to rights you own or are authorised to grant. You must not submit material that unlawfully copies another person's protected work or breaches another person's rights.`,
  },
  {
    title: '5. Your responsibilities',
    body: `You agree not to:

• Submit hateful, threatening, harassing, or abusive material.
• Impersonate another person.
• Submit private or confidential information without permission.
• Intentionally submit misleading or malicious content.
• Attempt to disrupt, damage, or gain unauthorised access to Bamba.
• Use Bamba in a way that violates applicable law or another person's rights.

We may remove content or restrict accounts where reasonably necessary to protect users, the platform, or the integrity of contributions.`,
  },
  {
    title: '6. Language content and accuracy',
    body: `Language is diverse and may vary by region, community, context, formality, and speaker.

Bamba may display multiple expressions for the same prompt. A community contribution is not automatically an officially verified translation.

Some content is prototype or demonstration material and may be marked [DEMO]. It may not yet have been reviewed by native speakers or qualified language specialists.

Bamba is a learning and contribution tool, not a guarantee that every expression is accurate, complete, or appropriate in every situation. Users should consider context and seek qualified guidance where accuracy is important.`,
  },
  {
    title: '7. Intellectual property in Bamba',
    body: `Except for user contributions and material identified as belonging to others, the Bamba app, branding, design, software, and original platform materials are owned by or licensed to the Bamba operator.

You may use Bamba for its intended personal and educational purposes. You may not copy, redistribute, reverse engineer, or commercially exploit protected platform material except where permitted by law or with written permission.`,
  },
  {
    title: '8. Account suspension and termination',
    body: `We may suspend or restrict access where there is a reasonable basis to believe these terms have been breached, the platform is at risk, or we are required to do so by law.

You may stop using Bamba at any time. You may request account deletion using the in-app deletion option or the external deletion resource identified in our Privacy Policy.

Signing out or uninstalling the app does not by itself delete your account or server-side data.`,
  },
  {
    title: '9. Availability and disclaimers',
    body: `We aim to keep Bamba available and reliable, but we cannot promise uninterrupted access or that every feature will always be available.

To the extent permitted by law, Bamba is provided without a guarantee that all content will be error-free, uninterrupted, or suitable for every purpose.

Nothing in these terms excludes consumer rights or other protections that cannot lawfully be excluded.`,
  },
  {
    title: '10. Limitation of liability',
    body: `To the extent permitted by applicable law, the Bamba operator is not liable for indirect or consequential loss arising from use of the service.

Nothing in these terms limits liability where doing so would be unlawful, including liability that cannot legally be excluded under applicable consumer-protection or other laws.`,
  },
  {
    title: '11. Privacy',
    body: `Our collection and use of personal information is explained in the Bamba Privacy Policy, available in the About screen of the app.`,
  },
  {
    title: '12. Governing law',
    body: `These terms are governed by the laws of the Republic of South Africa, subject to any mandatory consumer or other legal protections that apply.`,
  },
  {
    title: '13. Changes to these terms',
    body: `We may update these terms as Bamba develops. We will update the effective date and provide appropriate notice of material changes.`,
  },
  {
    title: '14. Contact',
    body: `For questions about these terms:

Operator: Senzo Mabaso (individual)
Email: mabasosenzo190@gmail.com
Website: sesse001.github.io/bamba-app`,
  },
];

export default function TermsOfService() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
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
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
        </View>

        {/* Title */}
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.effectiveDate}>{EFFECTIVE_DATE}</Text>

        {/* Draft banner */}
        <View style={styles.draftBanner}>
          <Text style={styles.draftBannerIcon}>⚠️</Text>
          <Text style={styles.draftBannerText}>
            This is a draft. Final legal text is pending review by a South
            African lawyer. Do not rely on this version.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>
          Last updated: Draft · {CONTACT_EMAIL}
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

  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  effectiveDate: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },

  // Draft banner
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  draftBannerIcon: { fontSize: 18 },
  draftBannerText: {
    ...Typography.caption,
    color: Colors.warning,
    flex: 1,
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sectionBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // Footer
  footer: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});