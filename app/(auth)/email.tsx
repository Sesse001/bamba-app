// app/(auth)/email.tsx
// Email sign-up / sign-in with mode toggle.
// If current user is anonymous guest, sign-up UPGRADES them (same UID, preserves data).

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { signUpWithEmail, signInWithEmail } from '../../services/auth';

export default function EmailAuth() {
  const router = useRouter();

  const [mode, setMode] = useState('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === 'signup';

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in email and password.');
      return;
    }
    if (isSignup && !displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const result = isSignup
      ? await signUpWithEmail(email.trim(), password, displayName.trim())
      : await signInWithEmail(email.trim(), password);

    setLoading(false);

    if (result.ok) {
      router.replace('/(tabs)/home');
    } else {
      setError(result.error);
    }
  };

  const toggleMode = () => {
    setMode(isSignup ? 'signin' : 'signup');
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraHeight={120}
      >
        {/* Back */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {/* Title */}
        <Text style={styles.title}>
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignup
            ? 'Save your progress and contributions.'
            : 'Sign in to continue.'}
        </Text>

        {/* Fields */}
        <View style={styles.form}>
          {isSignup && (
            <>
              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                editable={!loading}
              />
            </>
          )}

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={12}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {isSignup ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </Pressable>

        {/* Mode toggle */}
        <Pressable onPress={toggleMode} disabled={loading} hitSlop={12}>
          <Text style={styles.toggleText}>
            {isSignup
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </Text>
        </Pressable>

        {/* Guest note */}
        <Text style={styles.guestNote}>
          You can also continue as a guest from the previous screen.
        </Text>
      </KeyboardAwareScrollView>
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
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.huge,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backText: {
    ...Typography.body,
    color: Colors.primaryLight,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
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

  // Password field with eye toggle
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingRight: Spacing.sm,
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.lg,
    color: Colors.text,
    fontSize: 16,
  },
  eyeBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  eyeText: {
    fontSize: 20,
  },

  errorBox: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
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
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  toggleText: {
    ...Typography.caption,
    color: Colors.primaryLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  guestNote: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});