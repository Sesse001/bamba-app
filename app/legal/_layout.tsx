// app/legal/_layout.tsx
// Layout wrapper for legal screens (Privacy, Terms).
// Hides the default header so each screen renders its own branded layout.

import { Stack } from 'expo-router';
import { Colors } from '../../theme';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}