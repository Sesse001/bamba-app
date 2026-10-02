// app/_layout.tsx
// Root layout — decides what to show on launch:
//   1. Onboarding (very first launch only)
//   2. Auth flow (not signed in)
//   3. Tabs (signed in)
//
// Onboarding persistence uses TWO sources:
//   1. AsyncStorage  — fast, local
//   2. Firestore     — durable, cloud (users/{uid}.onboarded)
//
// Why two sources: AsyncStorage on Expo Go / Android dev builds is not
// always reliable across full app restarts. The Firestore flag acts as a
// backup — if the local flag is lost, we recover it from the user doc.
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

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Initial AsyncStorage check (fast path)
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
      // Determine "onboarded" from multiple sources:
      //   1. AsyncStorage (fast) — if 'true', we trust it
      //   2. Firestore user doc — if storage says false/missing but user
      //      exists and doc says onboarded: true, recover.
      let onboarded = hasOnboarded;

      if (!onboarded && user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().onboarded === true) {
            onboarded = true;
            try {
              await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
            } catch {}
          }
        } catch {
          // Firestore check failed — fall through with current value
        }
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