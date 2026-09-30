// app/_layout.tsx
// Root layout — decides what to show on launch:
//   1. Onboarding (very first launch only)
//   2. Auth flow (not signed in)
//   3. Tabs (signed in)
//
// Handles auto-login: if a user is already signed in when they launch,
// we skip Welcome entirely and go straight to tabs.
//
// Special case: signed-in GUESTS can reach (auth)/email to UPGRADE their
// account via linkWithCredential.

import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';
import { onAuthChange } from '../services/auth';

const ONBOARDED_KEY = 'bamba.onboarded';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(null);

  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  // Guard — only one redirect allowed at a time
  const redirecting = useRef(false);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Initial check of the onboarding flag
  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(ONBOARDED_KEY);
        setHasOnboarded(flag === 'true');
      } catch {
        setHasOnboarded(false);
      }
    })();
  }, []);

  // Routing effect — runs whenever segments/auth/onboarding change
  useEffect(() => {
    if (initializing || hasOnboarded === null) return;
    if (!navState?.key) return;
    if (redirecting.current) return;

    let cancelled = false;

    (async () => {
      // Re-read the flag fresh on every segment change.
      // This avoids stale state when onboarding has just set it.
      let onboarded = hasOnboarded;
      try {
        const flag = await AsyncStorage.getItem(ONBOARDED_KEY);
        onboarded = flag === 'true';
        if (onboarded !== hasOnboarded) {
          setHasOnboarded(onboarded);
        }
      } catch {
        // fall through with whatever we had
      }

      if (cancelled) return;

      const inAuthGroup = segments[0] === '(auth)';
      const onOnboarding = inAuthGroup && segments[1] === 'onboarding';
      const onEmailScreen = inAuthGroup && segments[1] === 'email';
      const onWelcome = inAuthGroup && segments[1] === 'welcome';
      const isGuest = user?.isAnonymous === true;

      const safeReplace = (path) => {
        redirecting.current = true;
        router.replace(path);
        setTimeout(() => {
          redirecting.current = false;
        }, 150);
      };

      // 1. Not onboarded → force onboarding
      if (!onboarded) {
        if (!onOnboarding) {
          safeReplace('/(auth)/onboarding');
        }
        return;
      }

      // 2. Onboarding is handling its own exit.
      //    Don't interfere — it will navigate to welcome or tabs itself.
      if (onOnboarding) {
        return;
      }

      // 3. Onboarded + no user + not on auth → welcome
      if (!user) {
        if (!inAuthGroup) {
          safeReplace('/(auth)/welcome');
        }
        return;
      }

      // 4. Guest on email screen is UPGRADING — allow, don't touch
      if (isGuest && onEmailScreen) return;

      // 5. Signed-in user stuck on Welcome → tabs
      //    (onboarding is already excluded by rule 2 above)
      if (user && onWelcome) {
        safeReplace('/(tabs)');
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, segments, initializing, hasOnboarded, navState?.key, router]);

  // Splash while Firebase + AsyncStorage checks complete
  if (initializing || hasOnboarded === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});