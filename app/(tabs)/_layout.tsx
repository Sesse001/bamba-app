// app/(tabs)/_layout.tsx
// Tab bar hidden — Bamba uses custom in-screen navigation.

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
      <Tabs.Screen name="about" />
      <Tabs.Screen name="tier-detail" />
      <Tabs.Screen name="review-queue" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}