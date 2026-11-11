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
// The "justOnboarded" ref prevents the loop where AsyncStorage write hasn't
// flushed before the routing effect re-reads it.

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

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(null);

  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const redirecting = useRef(false);
  // Set immediately when onboarding completes — bypasses AsyncStorage lag
  const justOnboarded = useRef(false);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Initial AsyncStorage check
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

  // Routing effect
  useEffect(() => {
    if (initializing || hasOnboarded === null) return;
    if (!navState?.key) return;
    if (redirecting.current) return;

    let cancelled = false;

    (async () => {
      // Determine "onboarded" from multiple sources.
      // 1. In-memory ref takes priority (just finished onboarding)
      // 2. AsyncStorage
      // 3. Firestore user doc (only if signed in)
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

      // 1. Not onboarded → force onboarding
      if (!onboarded) {
        if (!onOnboarding) {
          safeReplace('/(auth)/onboarding');
        }
        return;
      }

      // 2. Onboarding is handling its own exit
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

      // 4. Guest on email screen is UPGRADING — allow
      if (isGuest && onEmailScreen) return;

      // 5. Signed-in user stuck on Welcome → tabs
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