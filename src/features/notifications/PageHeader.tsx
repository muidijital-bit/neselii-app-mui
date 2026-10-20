import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { colors, sizes, spacing, textStyles } from '@/theme';

/** Bildirim alt ekranlarının üst çubuğu (56 yükseklik): geri düğmesi + başlık. Geçmiş yoksa (soğuk bağlantı açılışı) ana sayfaya düşer. */
export function PageHeader({ title, testID }: { title: string; testID: string }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={styles.back}
        testID={testID}>
        <Icon name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'} size={Platform.OS === 'ios' ? 26 : 24} color={colors.navy} />
      </Pressable>
      <Text style={[textStyles.titlePage, styles.title]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingRight: spacing.xl, paddingLeft: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  back: { width: sizes.minTouchTarget, height: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.navy },
});
