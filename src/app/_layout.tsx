import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/bootstrap';
import { RootNavigator, ShellProviders } from '@/features/shell';
import { useAppFonts } from '@/ui/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Fontlar uygulamayla paketlendiğinden hata beklenmez; yine de hata durumunda sistem fontuyla açılır.
  if (!fontsLoaded && !fontError) return null;

  // Servis kabı (Supabase) + QueryClient + bootstrap (getSession). Hazır olana kadar rotalar render edilmez; onboarding/giriş/sekme
  // yönlendirmesi bu hazır sonuçtan türer (RootNavigator). SafeAreaProvider'ı Expo Router sağlar. GestureHandlerRootView: liste satırlarındaki
  // kaydırarak silme (ReanimatedSwipeable) gibi gesture-handler hareketleri için kökte bir kez.
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppProviders>
        <ShellProviders>
          <RootNavigator />
        </ShellProviders>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
