import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily } from '@/theme';

/** Tasarımdaki anahtar (12b): 51×31 iz, 27 yuvarlak, açık = yeşil iz + sağda. Geçiş animasyonu yoktur (kaynaktaki 0,2 sn geçiş uygulanmadı). */
function SwitchVisual({ on }: { on: boolean }) {
  return (
    <View style={[styles.track, { backgroundColor: on ? colors.green : colors.line }]}>
      <View style={[styles.knob, { left: on ? 22 : 2 }]} />
    </View>
  );
}

export type PreferenceRowProps = {
  label: string;
  sub: string;
  on: boolean;
  onPress: () => void;
  /** Eylem sürerken dokunma yok sayılır (görünüm değişmez; durum zaten hedef değeri gösterir). */
  busy?: boolean;
  testID: string;
};

/** Tercih satırı: tek dokunuşluk anahtar. Ekran okuyucuya `switch` rolü, açık/kapalı durumu ve alt metin bildirilir. */
export function PreferenceRow({ label, sub, on, onPress, busy = false, testID }: PreferenceRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={sub}
      accessibilityState={{ checked: on, busy }}
      onPress={busy ? undefined : onPress}
      style={styles.row}
      testID={testID}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub} testID={`${testID}-sub`}>
          {sub}
        </Text>
      </View>
      <SwitchVisual on={on} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.white,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontFamily: fontFamily.inter500, fontSize: 15, lineHeight: 15 * 1.3, color: colors.ink },
  sub: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 12 * 1.35, color: colors.slateLight },
  track: { width: 51, height: 31, borderRadius: 16 },
  knob: {
    position: 'absolute',
    top: 2,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.white,
    shadowColor: '#07182b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
});
