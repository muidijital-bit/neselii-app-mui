import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

export type PreferenceRowProps = {
  label: string;
  sub: string;
  on: boolean;
  onPress: () => void;
  /** Eylem sürerken dokunma yok sayılır (görünüm değişmez; durum zaten hedef değeri gösterir). */
  busy?: boolean;
  testID: string;
};

/**
 * Tercih satırı: `@/ui/Ui` ToggleRow ile birebir aynı görünüm (main tasarımı: başlık + alt metin + sistem anahtarı). Satıra ya da anahtara dokunmak
 * aynı eylemi başlatır; anahtar denetimlidir (izin verilmezse eski değerine döner). Ekran okuyucuya `switch` rolü ve açık/kapalı durumu bildirilir.
 */
export function PreferenceRow({ label, sub, on, onPress, busy = false, testID }: PreferenceRowProps) {
  const press = () => {
    if (!busy) onPress();
  };
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={sub}
      accessibilityState={{ checked: on, busy }}
      onPress={press}
      style={styles.row}
      testID={testID}>
      <View style={styles.flex}>
        <Text variant="bodyMedium" style={styles.title}>
          {label}
        </Text>
        <Text variant="small" testID={`${testID}-sub`}>
          {sub}
        </Text>
      </View>
      <Switch
        value={on}
        onValueChange={press}
        trackColor={{ false: Colors.disabled, true: Colors.green }}
        thumbColor={Colors.white}
        ios_backgroundColor={Colors.disabled}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
