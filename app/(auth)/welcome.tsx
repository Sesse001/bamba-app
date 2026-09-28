// app/(auth)/welcome.tsx
// First screen users see when not signed in.
// Two paths: continue as guest (instant), or sign in with email.

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { signInAsGuest } from '../../services/auth';

export default function Welcome() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGuest = async () => {
    setLoading(true);
    setError(null);
    const result = await signInAsGuest();
    setLoading(false);
    if (result.ok) {
      router.replace('/(tabs)');
    } else {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandBlock}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.appName}>Bamba</Text>
          <Text style={styles.tagline}>
            Learn South African languages.{'\n'}Contribute to their future.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleGuest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>Continue as Guest</Text>
            )}
          </Pressable>

          <View style={styles.spacer} />

          <Pressable
            style={styles.btnSecondary}
            onPress={() => router.push('/(auth)/email')}
            disabled={loading}
          >
            <Text style={styles.btnSecondaryText}>Sign in with Email</Text>
          </Pressable>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Built for South African language preservation.
        </Text>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    justifyContent: 'space-between',
  },
  brandBlock: {
    alignItems: 'center',
    marginTop: Spacing.huge,
  },
  logo: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  appName: {
    ...Typography.hero,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    marginTop: Spacing.huge,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: {
    opacity: 0.6,
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
  spacer: {
    height: Spacing.md,
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
  footer: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.huge,
  },
});