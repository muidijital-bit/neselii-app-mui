import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function OnboardingLayout() {
  // Üç adım tek yığında: Android geri tuşu ve iOS kenar kaydırma bir önceki adıma döner; ilk adımda geri uygulamadan çıkar.
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.navy } }} />;
}
