import { Stack } from 'expo-router';

import { Colors } from '@/ui/theme';

/** Giriş lacivert, kayıt / şifre ekranları beyaz zeminlidir; iç geçişler kayar ama zemin (ve kayma sırasında görünen alan) ekranla aynı renktir. */
const WHITE = { contentStyle: { backgroundColor: Colors.surface } };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.navy } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" options={WHITE} />
      <Stack.Screen name="forgot-password" options={WHITE} />
      <Stack.Screen name="reset-password" options={WHITE} />
    </Stack>
  );
}
