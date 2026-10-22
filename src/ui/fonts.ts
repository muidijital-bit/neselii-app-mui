import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat/800ExtraBold';
import { useFonts } from 'expo-font';

import { Fonts } from './theme';

/** Uygulamayla birlikte paketlenen fontlar (ağdan indirilmez). Anahtarlar `Fonts` (main tasarımı) aile adlarıdır. */
export const fontSources = {
  [Fonts.regular]: Inter_400Regular,
  [Fonts.medium]: Inter_500Medium,
  [Fonts.semibold]: Inter_600SemiBold,
  [Fonts.bold]: Inter_700Bold,
  [Fonts.heading]: Montserrat_700Bold,
  [Fonts.headingHeavy]: Montserrat_800ExtraBold,
};

/** [yüklendi, hata]. Paketlenmiş fontlar olduğundan hata beklenmez; yine de uygulama açılışı bloklanmamalı. */
export function useAppFonts() {
  return useFonts(fontSources);
}
