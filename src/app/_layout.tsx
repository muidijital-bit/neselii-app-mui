import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useOnboardingComplete } from '@/lib/app-storage';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { session, isLoading, isPasswordRecovery } = useAuth();
  const onboarded = useOnboardingComplete();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  const ready = !isLoading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  const signedIn = !!session;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={onboarded && !signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={onboarded && signedIn && isPasswordRecovery}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>

        <Stack.Protected guard={onboarded && signedIn && !isPasswordRecovery}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listings" />
          <Stack.Screen name="filter" options={{ presentation: 'modal' }} />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen
            name="gallery/[id]"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="announcement/[id]" />
          <Stack.Screen name="account/edit" />
          <Stack.Screen name="account/favorites" />
          <Stack.Screen name="account/saved-searches" />
          <Stack.Screen name="account/notification-settings" />
          <Stack.Screen name="account/privacy" />
          <Stack.Screen name="account/delete" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </QueryClientProvider>
  );
}
