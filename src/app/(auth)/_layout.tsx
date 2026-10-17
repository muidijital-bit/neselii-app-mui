import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: 'Giriş yap' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Kayıt ol' }} />
    </Stack>
  );
}
