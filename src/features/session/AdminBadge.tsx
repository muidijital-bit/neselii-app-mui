import { StyleSheet, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

import { useIsAdmin } from './useIsAdmin';

/** Yönetici girişi yapılmışsa ekran başlığının sağında duran lacivert "Yönetici" etiketi; müşteride hiçbir şey çizmez. */
export function AdminBadge({ testID }: { testID?: string }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <View style={styles.badge} accessible accessibilityLabel="Yönetici girişi" testID={testID}>
      <Icon name="shield" size={15} color="white" />
      <Text style={styles.text}>Yönetici</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.navy,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: 6,
  },
  text: { fontFamily: Fonts.bold, fontSize: 13, lineHeight: 17, color: Colors.white },
});
