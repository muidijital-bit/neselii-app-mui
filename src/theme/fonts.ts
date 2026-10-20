import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat/800ExtraBold';
import { useFonts } from 'expo-font';

import { fontFamily } from './typography';

/** Uygulamayla birlikte paketlenen fontlar (ağdan indirilmez). Anahtarlar `fontFamily` adlarıdır. */
export const fontSources = {
  [fontFamily.inter400]: Inter_400Regular,
  [fontFamily.inter500]: Inter_500Medium,
  [fontFamily.inter600]: Inter_600SemiBold,
  [fontFamily.inter700]: Inter_700Bold,
  [fontFamily.montserrat500]: Montserrat_500Medium,
  [fontFamily.montserrat600]: Montserrat_600SemiBold,
  [fontFamily.montserrat700]: Montserrat_700Bold,
  [fontFamily.montserrat800]: Montserrat_800ExtraBold,
};

/** [yüklendi, hata]. Paketlenmiş fontlar olduğundan hata beklenmez; yine de uygulama açılışı bloklanmamalı. */
export function useAppFonts() {
  return useFonts(fontSources);
}
