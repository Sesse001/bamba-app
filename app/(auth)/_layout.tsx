// app/(auth)/_layout.tsx
// Layout wrapper for authentication + onboarding screens.
// Hides the default header so each screen renders its own branded layout.

import { Stack } from 'expo-router';
import { Colors } from '../../theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="email" />
    </Stack>
  );
}