// app/_layout.tsx
// Root layout — decides what to show on launch:
//   1. Onboarding (very first launch only)
//   2. Auth flow (not signed in)
//   3. Tabs (signed in)
//
// Onboarding persistence uses THREE sources (in order of check):
//   1. In-memory "justOnboarded" ref — set immediately when user finishes/skips
//   2. AsyncStorage — fast, local, but may have write-lag
//   3. Firestore user doc — durable backup (only available once signed in)
//
// SAFETY: 6-second timeout on AsyncStorage read. If storage hangs,
// we proceed with defaults rather than showing infinite spinner.

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
import { doc, getDoc } from 'firebase/firestore';
import { Colors } from '../theme';
import { onAuthChange } from '../services/auth';
import { db } from '../services/firebase';

const ONBOARDED_KEY = 'bamba.onboarded';
const STORAGE_TIMEOUT_MS = 6000;
const AUTH_TIMEOUT_MS = 8000;

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(null);

  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const redirecting = useRef(false);
  const justOnboarded = useRef(false);
  const authTimeoutRef = useRef(null);
  const storageTimeoutRef = useRef(null);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) {
        setInitializing(false);
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      }
    });

    // Safety net: if auth doesn't resolve in 8 seconds, proceed anyway
    authTimeoutRef.current = setTimeout(() => {
      setInitializing(false);
    }, AUTH_TIMEOUT_MS);

    return () => {
      unsubscribe();
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  // Read onboarding flag from AsyncStorage with timeout safety
  useEffect(() => {
    let mounted = true;

    // Safety net: if storage doesn't respond in 6 seconds, assume not onboarded
    storageTimeoutRef.current = setTimeout(() => {
      if (mounted && hasOnboarded === null) {
        setHasOnboarded(false);
      }
    }, STORAGE_TIMEOUT_MS);

    (async () => {
      try {
        const flag = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (mounted) {
          setHasOnboarded(flag === 'true');
          if (storageTimeoutRef.current) {
            clearTimeout(storageTimeoutRef.current);
            storageTimeoutRef.current = null;
          }
        }
      } catch {
        if (mounted) {
          setHasOnboarded(false);
          if (storageTimeoutRef.current) {
            clearTimeout(storageTimeoutRef.current);
            storageTimeoutRef.current = null;
          }
        }
      }
    })();

    return () => {
      mounted = false;
      if (storageTimeoutRef.current) clearTimeout(storageTimeoutRef.current);
    };
  }, []);

  // Routing effect
  useEffect(() => {
    if (initializing || hasOnboarded === null) return;
    if (!navState?.key) return;
    if (redirecting.current) return;

    let cancelled = false;

    (async () => {
      let onboarded = justOnboarded.current;
      if (!onboarded) {
        onboarded = hasOnboarded;
      }

      if (!onboarded) {
        try {
          const flag = await AsyncStorage.getItem(ONBOARDED_KEY);
          if (flag === 'true') {
            onboarded = true;
            justOnboarded.current = true;
          }
        } catch {}
      }

      if (!onboarded && user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().onboarded === true) {
            onboarded = true;
            justOnboarded.current = true;
            try {
              await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
            } catch {}
          }
        } catch {}
      }

      if (cancelled) return;

      if (onboarded !== hasOnboarded) {
        setHasOnboarded(onboarded);
      }

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

      if (!onboarded) {
        if (!onOnboarding) {
          safeReplace('/(auth)/onboarding');
        }
        return;
      }

      if (onOnboarding) {
        return;
      }

      if (!user) {
        if (!inAuthGroup) {
          safeReplace('/(auth)/welcome');
        }
        return;
      }

      if (isGuest && onEmailScreen) return;

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