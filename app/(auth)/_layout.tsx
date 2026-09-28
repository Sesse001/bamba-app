// app/(auth)/_layout.tsx
// Layout wrapper for authentication screens.
// Matches the pattern used by app/(tabs)/_layout.tsx — hides the header
// so each auth screen can render its own branded layout.

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
      <Stack.Screen name="welcome" />
      <Stack.Screen name="email" />
    </Stack>
  );
}