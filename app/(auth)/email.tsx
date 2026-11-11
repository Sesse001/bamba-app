// app/(auth)/email.tsx
// Email sign-up / sign-in with mode toggle.
// If current user is anonymous guest, sign-up UPGRADES them (same UID, preserves data).
//
// Forgot password flow (signin mode only):
//   - "Forgot password?" link below password field
//   - Tapping opens a confirmation state (uses typed email, or prompts for one)
//   - Calls sendPasswordReset() → neutral success message
//   - Neutral message to prevent email enumeration

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
import {
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
} from '../../services/auth';

export default function EmailAuth() {
  const router = useRouter();

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Password reset state
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const isSignup = mode === 'signup';

  // ─────────────────────────────────────────────
  // SUBMIT (signin or signup)
  // ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    setInfoMessage(null);

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
    setInfoMessage(null);
    setShowResetPrompt(false);
    setResetSuccess(false);
    setResetEmail('');
  };

  // ─────────────────────────────────────────────
  // PASSWORD RESET
  // ─────────────────────────────────────────────
  const handleForgotPasswordPress = () => {
    // Pre-fill with typed email if available
    setResetEmail(email.trim());
    setShowResetPrompt(true);
    setResetSuccess(false);
    setError(null);
    setInfoMessage(null);
  };

  const handleSendReset = async () => {
    setError(null);
    setInfoMessage(null);

    if (!resetEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setResetting(true);
    const result = await sendPasswordReset(resetEmail.trim());
    setResetting(false);

    if (result.ok) {
      // Firebase doesn't reveal whether the email exists — show neutral success
      setResetSuccess(true);
    } else {
      setError(result.error);
    }
  };

  const handleCancelReset = () => {
    setShowResetPrompt(false);
    setResetSuccess(false);
    setResetEmail('');
    setError(null);
    setInfoMessage(null);
  };

  // ─────────────────────────────────────────────
  // PASSWORD RESET VIEW
  // ─────────────────────────────────────────────
  if (showResetPrompt) {
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
            onPress={handleCancelReset}
            hitSlop={12}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          {/* Title */}
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            {resetSuccess
              ? "Check your email for the reset link."
              : "Enter the email you signed up with, and we'll send a reset link."}
          </Text>

          {resetSuccess ? (
            <>
              {/* Success state */}
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>Reset link sent</Text>
                <Text style={styles.successText}>
                  If an account exists with {resetEmail}, you'll receive an
                  email with instructions to reset your password. It may take
                  a minute or two to arrive.
                </Text>
                <Text style={styles.successHint}>
                  Check your spam folder if you don't see it.
                </Text>
              </View>

              <Pressable
                style={styles.btnPrimary}
                onPress={handleCancelReset}
              >
                <Text style={styles.btnPrimaryText}>Back to sign in</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Input state */}
              <View style={styles.form}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!resetting}
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{String(error)}</Text>
                </View>
              )}

              <Pressable
                style={[styles.btnPrimary, resetting && styles.btnDisabled]}
                onPress={handleSendReset}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator color={Colors.text} size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Send reset link</Text>
                )}
              </Pressable>

              <Pressable onPress={handleCancelReset} hitSlop={12}>
                <Text style={styles.toggleText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // NORMAL AUTH VIEW
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

          {/* Forgot password — signin mode only */}
          {!isSignup && (
            <Pressable
              style={styles.forgotBtn}
              onPress={handleForgotPasswordPress}
              hitSlop={12}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        {/* Info message */}
        {infoMessage && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{String(infoMessage)}</Text>
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

  // Forgot password link
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  forgotText: {
    ...Typography.caption,
    color: Colors.primaryLight,
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

  infoBox: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: Colors.info,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.info,
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

  // Success state (reset email sent)
  successBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.success,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  successIcon: {
    fontSize: 48,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  successTitle: {
    ...Typography.h3,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  successText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  successHint: {
    ...Typography.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});