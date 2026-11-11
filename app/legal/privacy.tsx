// app/legal/privacy.tsx
// Privacy Policy — DRAFT VERSION
//
// Structure is final. Body text is placeholder pending legal review.
// When ChatGPT provides final legal text, replace only the SECTIONS array below.
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
    title: '1. About this policy',
    body: `Bamba is a South African language-learning and contribution platform. It helps people learn languages, practise expressions, and contribute language knowledge.

This policy explains what personal information Bamba processes, why it is processed, how it is protected, and how you can ask us to delete it.

We aim to handle personal information responsibly and in accordance with applicable privacy laws, including South Africa's Protection of Personal Information Act (POPIA).`,
  },
  {
    title: '2. Information we collect',
    body: `Depending on how you use Bamba, we may process:

• Account information: A Firebase Authentication user ID, an email address if you register, a display name if you provide one, and whether your account is a guest account.

• Learning and contribution information: Your selected language, your learning progress, expressions you submit, and their review status.

• Preferences: Your reminder preference (on/off).

Bamba does not ask for your location, contacts, camera, microphone, or photos. Bamba does not use advertising IDs or tracking.`,
  },
  {
    title: '3. Why we use this information',
    body: `We use information to:
• Create and maintain your account.
• Remember your language selection and learning progress.
• Display your contributions and their review status.
• Operate, maintain, and protect Bamba.
• Support language learning and language-preservation activities.
• Respond to support, privacy, and deletion requests.

We do not sell your personal information.`,
  },
  {
    title: '4. Contributions and visibility',
    body: `When you submit a language expression or translation, you are voluntarily contributing language content to Bamba.

Your contribution may be displayed within the app and may be reviewed or used for language-learning and language-preservation purposes.

A contribution may be visible to other users. Do not include private information about yourself or another person in a contribution.`,
  },
  {
    title: '5. Service providers and data storage',
    body: `Bamba uses Google Firebase services to operate account authentication and its database.

• Firebase Authentication processes authentication information in the United States.
• Cloud Firestore stores Bamba's database in the africa-south1 region in South Africa.
• Some information needed for the app may also be stored locally on your device.

Google processes information as a service provider. We do not authorise advertising companies to use Bamba account information.`,
  },
  {
    title: '6. Security',
    body: `We use Firebase security controls and access rules intended to protect account and learning information.

Data sent between the app and its online services is encrypted in transit using HTTPS/TLS. Firebase-managed infrastructure provides encryption at rest.

No online service can guarantee absolute security. We work to protect information and address security issues when identified.`,
  },
  {
    title: '7. How long we keep information',
    body: `We keep account and learning information for as long as needed to provide Bamba and its features.

If you request account deletion, we will delete or anonymise associated personal information in accordance with our deletion process and applicable legal requirements.

Some information may need to be retained for a limited period where required by law.`,
  },
  {
    title: '8. Your choices and rights',
    body: `Subject to applicable law, you may:
• Ask what personal information we hold about you.
• Request correction of inaccurate information.
• Request deletion of your account and associated personal information.
• Ask questions about how your information is used.
• Raise a privacy complaint with us or the relevant regulator.

You can sign out of Bamba at any time. Signing out does not itself delete your account or server-side information.

To request account deletion, use the Delete Account option in your Profile, or contact us at the email below.`,
  },
  {
    title: '9. Children\'s information',
    body: `Bamba will handle personal information relating to children in accordance with applicable law, including POPIA. Where prior consent from a competent person is required, we will obtain it before processing the relevant personal information.

[Note: Age policy pending legal consultation.]`,
  },
  {
    title: '10. Changes to this policy',
    body: `We may update this policy when Bamba's features, data practices, or legal requirements change. We will update the effective date above and provide appropriate notice when a material change affects users.`,
  },
  {
    title: '11. Contact us',
    body: `For privacy questions, access requests, correction requests, or account-deletion requests:

Responsible party: Senzo Mabaso (individual)
Privacy email: mabasosenzo190@gmail.com
Website: sesse001.github.io/bamba-app

Please include "Bamba Privacy Request" in the subject of your message.`,
  },
];

export default function PrivacyPolicy() {
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
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.effectiveDate}>{EFFECTIVE_DATE}</Text>

        {/* Draft banner */}
        <View style={styles.draftBanner}>
          <Text style={styles.draftBannerIcon}>⚠️</Text>
          <Text style={styles.draftBannerText}>
            This is a draft. Final legal text is pending review by a South
            African privacy lawyer. Do not rely on this version.
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