// app/(tabs)/_layout.tsx
// Tab bar hidden — Bamba uses custom in-screen navigation.
// This layout declares all screens under (tabs).
// Routing logic (which screen to show) lives in the screens themselves.

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
      <Tabs.Screen name="home" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="contributions" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}