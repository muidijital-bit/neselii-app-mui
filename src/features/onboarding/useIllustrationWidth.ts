import { useWindowDimensions } from 'react-native';

import { spacing } from '@/theme';

/** Ekran genişliği − yatay dolgu (2 × 24). */
export function useIllustrationWidth(): number {
  return useWindowDimensions().width - spacing['3xl'] * 2;
}
