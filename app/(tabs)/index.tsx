// app/(tabs)/index.tsx
// Language picker — first screen after sign-in.
// User taps a language to select, then taps Continue to commit.
//
// Selection is written to:
//   - AsyncStorage (instant cache)
//   - Firestore users/{uid}.activeLanguageId (source of truth)

import { useState, useEffect } from 'react';
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
import { getAllLanguages, setActiveLanguageId } from '../../services/languages';
import { getCurrentUser } from '../../services/auth';

export default function LanguagePicker() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [languages, setLanguages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch languages on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      const result = await getAllLanguages();
      if (!mounted) return;

      if (result.ok) {
        setLanguages(result.data);
        // Pre-select the first language
        if (result.data.length > 0) {
          setSelectedId(result.data[0].id);
        }
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleContinue = async () => {
    if (!selectedId) return;

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
      // Placeholder route to showcase — M4 replaces with real home screen.
      router.replace('/dev/showcase');
    } else {
      setError(result.error);
      setSaving(false);
    }
  };

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
          <Text style={styles.title}>Choose a language</Text>
          <Text style={styles.subtitle}>
            Start with one — you can add more later.
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
                onPress={() => setSelectedId(lang.id)}
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

        {/* Catalogue note — real product state, not placeholder */}
        <Text style={styles.comingSoon}>
          8 more South African languages catalogued — coming soon.
        </Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}

        {/* Continue */}
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
            <Text style={styles.btnPrimaryText}>Continue</Text>
          )}
        </Pressable>

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  languageList: {
    gap: Spacing.md,
  },
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
  langFlag: {
    fontSize: 24,
  },
  langBody: {
    flex: 1,
  },
  langName: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  langNative: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  langMeta: {
    ...Typography.tiny,
    color: Colors.textMuted,
    marginTop: 4,
  },
  checkWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  checkMark: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
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
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
});