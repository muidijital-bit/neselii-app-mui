import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AppProviders } from '@/bootstrap';
import { RootNavigator, ShellProviders } from '@/features/shell';
import { useAppFonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Fontlar uygulamayla paketlendiğinden hata beklenmez; yine de hata durumunda sistem fontuyla açılır.
  if (!fontsLoaded && !fontError) return null;

  // Servis kabı (Supabase) + QueryClient + bootstrap (getSession). Hazır olana kadar rotalar render edilmez; onboarding/giriş/sekme
  // yönlendirmesi bu hazır sonuçtan türer (RootNavigator). SafeAreaProvider'ı Expo Router sağlar.
  return (
    <AppProviders>
      <ShellProviders>
        <RootNavigator />
      </ShellProviders>
    </AppProviders>
  );
}
