import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme';

export default function DesignShowcase() {
  const [email, setEmail] = useState('');
  const [pressed, setPressed] = useState(false);

  const colorSwatches = [
    { name: 'primary', value: Colors.primary },
    { name: 'primaryLight', value: Colors.primaryLight },
    { name: 'primaryDark', value: Colors.primaryDark },
    { name: 'background', value: Colors.background },
    { name: 'surface', value: Colors.surface },
    { name: 'surfaceLight', value: Colors.surfaceLight },
    { name: 'text', value: Colors.text },
    { name: 'textSecondary', value: Colors.textSecondary },
    { name: 'textMuted', value: Colors.textMuted },
    { name: 'success', value: Colors.success },
    { name: 'warning', value: Colors.warning },
    { name: 'danger', value: Colors.danger },
    { name: 'info', value: Colors.info },
    { name: 'gold', value: Colors.gold },
    { name: 'purple', value: Colors.purple },
    { name: 'border', value: Colors.border },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.pageTitle}>🎨 Design System</Text>
        <Text style={styles.pageSubtitle}>Bamba V2 — Foundation</Text>

        {/* COLORS */}
        <Text style={styles.sectionLabel}>COLORS</Text>
        <View style={styles.swatchGrid}>
          {colorSwatches.map((c) => (
            <View key={c.name} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: c.value }]} />
              <Text style={styles.swatchName}>{c.name}</Text>
              <Text style={styles.swatchValue}>{c.value}</Text>
            </View>
          ))}
        </View>

        {/* TYPOGRAPHY */}
        <Text style={styles.sectionLabel}>TYPOGRAPHY</Text>
        <View style={styles.card}>
          <Text style={[Typography.hero, styles.textPrimary]}>Hero Heading</Text>
          <Text style={[Typography.h1, styles.textPrimary]}>Heading One</Text>
          <Text style={[Typography.h2, styles.textPrimary]}>Heading Two</Text>
          <Text style={[Typography.h3, styles.textPrimary]}>Heading Three</Text>
          <Text style={[Typography.body, styles.textPrimary]}>Body text — regular weight</Text>
          <Text style={[Typography.bodyBold, styles.textPrimary]}>Body text — bold weight</Text>
          <Text style={[Typography.caption, styles.textSecondary]}>Caption text for details</Text>
          <Text style={[Typography.label, styles.textSecondary]}>Section Label</Text>
          <Text style={[Typography.numberLarge, styles.textPrimary]}>1,234</Text>
          <Text style={[Typography.numberMedium, styles.textPrimary]}>567</Text>
        </View>

        {/* BUTTONS */}
        <Text style={styles.sectionLabel}>BUTTONS</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.btnPrimary, pressed && styles.btnPressed]}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
          >
            <Text style={styles.btnPrimaryText}>Primary Button</Text>
          </Pressable>

          <View style={styles.btnSpacer} />

          <Pressable style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Secondary Button</Text>
          </Pressable>

          <View style={styles.btnSpacer} />

          <Pressable style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>Ghost Button</Text>
          </Pressable>

          <View style={styles.btnSpacer} />

          <Pressable style={styles.btnDanger}>
            <Text style={styles.btnDangerText}>Danger Button</Text>
          </Pressable>

          <View style={styles.btnSpacer} />

          <Pressable style={styles.btnDisabled} disabled>
            <Text style={styles.btnDisabledText}>Disabled Button</Text>
          </Pressable>

          <View style={styles.btnSpacer} />

          <View style={styles.btnLoading}>
            <ActivityIndicator color={Colors.text} size="small" />
            <Text style={styles.btnLoadingText}>Loading...</Text>
          </View>
        </View>

        {/* INPUTS */}
        <Text style={styles.sectionLabel}>INPUTS</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Empty Input</Text>
          <TextInput
            style={styles.input}
            placeholder="Type something..."
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Focused Input</Text>
          <TextInput
            style={[styles.input, styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            placeholder="Tap to focus"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Filled Input</Text>
          <TextInput
            style={styles.input}
            value="someone@example.com"
            editable={false}
          />

          <Text style={styles.inputLabel}>Error Input</Text>
          <TextInput
            style={[styles.input, styles.inputError]}
            value="invalid-email"
            editable={false}
          />
          <Text style={styles.errorText}>Please enter a valid email</Text>

          <Text style={styles.inputLabel}>Disabled Input</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value="Cannot edit"
            editable={false}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value="secretpassword"
            secureTextEntry
            editable={false}
          />
        </View>

        {/* CARDS */}
        <Text style={styles.sectionLabel}>CARDS</Text>

        <View style={styles.card}>
          <Text style={[Typography.h3, styles.textPrimary]}>Standard Card</Text>
          <Text style={[Typography.caption, styles.textSecondary]}>Basic card with border</Text>
        </View>

        <View style={[styles.card, Shadows.cardElevated, { marginTop: Spacing.md }]}>
          <Text style={[Typography.h3, styles.textPrimary]}>Elevated Card</Text>
          <Text style={[Typography.caption, styles.textSecondary]}>With shadow for depth</Text>
        </View>

        <Pressable style={[styles.card, styles.cardInteractive, { marginTop: Spacing.md }]}>
          <Text style={[Typography.h3, styles.textPrimary]}>Interactive Card</Text>
          <Text style={[Typography.caption, styles.textSecondary]}>Tap me — I respond to presses</Text>
        </Pressable>

        <View style={[styles.card, styles.cardWithIcon, { marginTop: Spacing.md }]}>
          <Text style={styles.cardIcon}>🌍</Text>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.h3, styles.textPrimary]}>Card with Icon</Text>
            <Text style={[Typography.caption, styles.textSecondary]}>Icon + title + description</Text>
          </View>
        </View>

        {/* AVATARS */}
        <Text style={styles.sectionLabel}>AVATARS</Text>
        <View style={[styles.card, styles.row]}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.avatarText}>J</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: Colors.success }]}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: Colors.gold }]}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: Colors.purple }]}>
            <Text style={styles.avatarText}>T</Text>
          </View>
        </View>

        {/* STATES */}
        <Text style={styles.sectionLabel}>STATES</Text>

        <View style={[styles.card, styles.emptyState]}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[Typography.h3, styles.textPrimary]}>Empty State</Text>
          <Text style={[Typography.caption, styles.textSecondary]}>Nothing here yet</Text>
        </View>

        <View style={[styles.card, styles.loadingState, { marginTop: Spacing.md }]}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[Typography.caption, styles.textSecondary, { marginTop: Spacing.md }]}>
            Loading...
          </Text>
        </View>

        <View style={[styles.card, styles.errorState, { marginTop: Spacing.md }]}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[Typography.h3, styles.textPrimary]}>Error State</Text>
          <Text style={[Typography.caption, styles.textSecondary]}>Something went wrong</Text>
        </View>

        <View style={{ height: Spacing.huge }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.huge,
  },
  textPrimary: {
    color: Colors.text,
  },
  textSecondary: {
    color: Colors.textSecondary,
  },
  pageTitle: {
    ...Typography.hero,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  swatchItem: {
    width: '30%',
    marginBottom: Spacing.md,
  },
  swatch: {
    width: '100%',
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  swatchName: {
    ...Typography.tiny,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  swatchValue: {
    ...Typography.tiny,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardInteractive: {
    borderColor: Colors.primary,
  },
  cardWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  cardIcon: {
    fontSize: 36,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  btnSecondaryText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  btnGhost: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  btnGhostText: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
  },
  btnDanger: {
    backgroundColor: Colors.danger,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  btnDangerText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  btnDisabled: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    opacity: 0.4,
  },
  btnDisabledText: {
    ...Typography.bodyBold,
    color: Colors.textMuted,
  },
  btnLoading: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    opacity: 0.7,
  },
  btnLoadingText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  btnSpacer: {
    height: Spacing.md,
  },
  inputLabel: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.textMuted,
    opacity: 0.6,
  },
  errorText: {
    ...Typography.tiny,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h2,
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    borderColor: Colors.danger,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
});