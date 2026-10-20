import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme';

type Props = {
  children: ReactNode;
  /** Zemin rengi; durum çubuğu simgeleri buna göre seçilir (`dark` zemin → açık simgeler). */
  background?: string;
  statusBar?: 'light' | 'dark';
  /** Güvenli alan kenarları; sekme çubuğu olan ekranlarda `bottom` çıkarılır (TabBar kendisi ekler). */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Gerçek sistem çubuklarına (çentik, durum çubuğu, hareket çubuğu) saygılı ekran kabı. */
export function Screen({ children, background = colors.surface, statusBar = 'dark', edges = ['top', 'bottom', 'left', 'right'], style, testID }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: background }, style]} testID={testID}>
      <StatusBar style={statusBar} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
