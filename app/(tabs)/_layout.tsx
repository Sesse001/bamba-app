// app/(tabs)/_layout.tsx
// Tab bar is hidden — Bamba uses a custom in-screen navigation pattern
// rather than the native tab bar. This layout just declares the screens.

import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}