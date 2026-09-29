// app/(tabs)/index.tsx
// Language picker — shown when no active language, OR when user explicitly
// taps "Switch ▸" on Home (?forceSwitch=1).
//
// State is reset on every focus so we never get stuck mid-save.

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import {
  getAllLanguages,
  setActiveLanguageId,
  getActiveLanguageId,
} from '../../services/languages';
import { getCurrentUser } from '../../services/auth';

export default function LanguagePicker() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const forceSwitch = params.forceSwitch === '1';

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────
  // RESET ON FOCUS
  // Every time the picker mounts OR comes into focus, reset all flags.
  // This guarantees we never re-enter with a stuck "saving" state.
  // ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setSaving(false);
      setError(null);
    }, [])
  );

  // ─────────────────────────────────────────────
  // INITIAL CHECK
  // ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      const user = getCurrentUser();
      if (!user) {
        if (mounted) setChecking(false);
        return;
      }

      const activeRes = await getActiveLanguageId(user.uid);
      if (!mounted) return;

      // Only auto-redirect if user did NOT explicitly ask to switch
      if (!forceSwitch && activeRes.ok && activeRes.languageId) {
        router.replace('/(tabs)/home');
        return;
      }

      if (mounted) setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, forceSwitch]);

  // ─────────────────────────────────────────────
  // LOAD LANGUAGES
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (checking) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      const result = await getAllLanguages();
      if (!mounted) return;

      if (result.ok) {
        setLanguages(result.data);

        // Pre-select the currently active language when switching
        if (forceSwitch) {
          const user = getCurrentUser();
          if (user) {
            const activeRes = await getActiveLanguageId(user.uid);
            if (!mounted) return;
            if (activeRes.ok && activeRes.languageId) {
              setSelectedId(activeRes.languageId);
            } else if (result.data.length > 0) {
              setSelectedId(result.data[0].id);
            }
          }
        } else if (result.data.length > 0) {
          setSelectedId(result.data[0].id);
        }
        setError(null);
      } else {
        setError(result.error);
      }
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [checking, forceSwitch]);

  // ─────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────
  const handleContinue = async () => {
    if (!selectedId || saving) return;

    setSaving(true);
    setError(null);

    const user = getCurrentUser();
    if (!user) {
      setError('Not signed in. Please restart the app.');
      setSaving(false);
      return;
    }

    const result = await setActiveLanguageId(user.uid, selectedId);

    if (result.ok) {
      // Reset saving BEFORE navigating, so if we come back here
      // via Switch again, the button isn't stuck.
      setSaving(false);
      const stamp = Date.now();
      router.replace(`/(tabs)/home?t=${stamp}`);
    } else {
      setError(result.error);
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {forceSwitch ? 'Switch language' : 'Choose a language'}
          </Text>
          <Text style={styles.subtitle}>
            {forceSwitch
              ? 'Pick a different language to focus on.'
              : 'Start with one — you can switch anytime.'}
          </Text>
        </View>

        {/* Language cards */}
        <View style={styles.languageList}>
          {languages.map((lang) => {
            const isSelected = selectedId === lang.id;
            const regionText = lang.regions?.join(', ') ?? '';
            const metaLine = [lang.family, regionText]
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable
                key={lang.id}
                style={[
                  styles.langCard,
                  isSelected && styles.langCardSelected,
                ]}
                onPress={() => !saving && setSelectedId(lang.id)}
                disabled={saving}
              >
                <View style={styles.langFlagWrap}>
                  <Text style={styles.langFlag}>🇿🇦</Text>
                </View>

                <View style={styles.langBody}>
                  <Text style={styles.langName}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.nativeName}</Text>
                  {metaLine ? (
                    <Text style={styles.langMeta}>{metaLine}</Text>
                  ) : null}
                </View>

                <View style={styles.checkWrap}>
                  <View
                    style={[
                      styles.checkCircle,
                      isSelected && styles.checkCircleSelected,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.comingSoon}>
          8 more South African languages catalogued — coming soon.
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        <Pressable
          style={[
            styles.btnPrimary,
            (!selectedId || saving) && styles.btnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedId || saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {forceSwitch ? 'Switch' : 'Continue'}
            </Text>
          )}
        </Pressable>

        <View style={{ height: Spacing.huge }} />
      </ScrollView>
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
  },
  loadingText: { ...Typography.caption, color: Colors.textSecondary },
  content: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  header: { marginBottom: Spacing.xxl },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  languageList: { gap: Spacing.md },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  langCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  langFlagWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langFlag: { fontSize: 24 },
  langBody: { flex: 1 },
  langName: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  langNative: { ...Typography.caption, color: Colors.textSecondary },
  langMeta: {
    ...Typography.tiny,
    color: Colors.textMuted,
    marginTop: 4,
  },
  checkWrap: { justifyContent: 'center', alignItems: 'center' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkMark: { color: Colors.text, fontSize: 14, fontWeight: 'bold' },
  comingSoon: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
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
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.xxl,
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { ...Typography.bodyBold, color: Colors.text },
});