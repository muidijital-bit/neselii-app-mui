import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { colors, fontFamily, radii } from '@/theme';

/** Favori işlemi başarısız olup kalp geri alındığında listelerde gösterilen görünür uyarı (ekran okuyucuya duyurulur). */
export function FavoriteFailureNotice({ message, testID }: { message: string | null; testID: string }) {
  if (!message) return null;
  return (
    <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID={testID}>
      <Icon name="info" size={18} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  text: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
});
