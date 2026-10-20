import { StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Icon, type IconName } from '@/components/icons/Icon';
import { colors, radii, sizes, spacing, textStyles } from '@/theme';

/** Boş / hata durumu: simge, başlık, açıklama ve isteğe bağlı eylem (hata durumunda "Tekrar dene"). */
export function StateMessage({
  icon,
  title,
  message,
  actionLabel,
  actionIcon = 'refresh-cw',
  onAction,
  testID,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
  testID: string;
}) {
  return (
    <View style={styles.state} testID={testID}>
      <View style={styles.stateIcon}>
        <Icon name={icon} size={28} color={colors.blue} />
      </View>
      <Text style={[textStyles.titleSection, styles.stateTitle]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[textStyles.bodySmall, styles.stateMessage]}>{message}</Text>
      {actionLabel && onAction ? <Btn label={actionLabel} onPress={onAction} variant="navy" icon={actionIcon} style={styles.action} testID={`${testID}-action`} /> : null}
    </View>
  );
}

/** Yükleniyor: ilan kartıyla aynı ölçüde iskelet satırlar (içerik gelince yerleşim kaymaz). */
export function ListingSkeletons({ count = 4, testID }: { count?: number; testID: string }) {
  return (
    <View style={styles.skeletonList} accessible accessibilityLabel="İlanlar yükleniyor" accessibilityState={{ busy: true }} testID={testID}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={[styles.bar, { width: '86%', height: 14 }]} />
            <View style={[styles.bar, { width: '56%', height: 12 }]} />
            <View style={styles.skeletonSpacer} />
            <View style={styles.skeletonBottom}>
              <View style={[styles.bar, { width: 96, height: 16 }]} />
              <View style={[styles.bar, { width: 56, height: 18 }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', paddingHorizontal: spacing['4xl'], paddingVertical: spacing['4xl'], gap: spacing.lg },
  stateIcon: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: colors.navy, textAlign: 'center' },
  stateMessage: { color: colors.slate, textAlign: 'center' },
  action: { marginTop: spacing.md, maxWidth: 240 },
  skeletonList: { gap: 10, paddingHorizontal: spacing.xl },
  skeletonCard: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  skeletonImage: { width: sizes.listingImageWidth, height: sizes.listingImageHeight, borderRadius: radii.lg, backgroundColor: colors.lineSoft },
  skeletonInfo: { flex: 1, gap: spacing.xs },
  skeletonSpacer: { flex: 1 },
  skeletonBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
});
