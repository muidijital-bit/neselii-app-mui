import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListingCardModel } from '@/features/listings/presentation';
import { colors, fontFamily } from '@/theme';

import { Badge } from './Badge';
import { Icon } from './icons/Icon';

type Props = {
  card: ListingCardModel;
  favorite: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
  testID: string;
};

/**
 * Sonuç listesinin büyük ilan kartı (2. aşama): tam genişlik görsel + kalp, büyük harf kategori ve tarih, başlık, simgeli yıl / km /
 * şehir satırı, ayırıcı, fiyat (küçük "TL") ve finansman rozeti. Satıldı/rezerve durumu görselin sol üstünde rozet olarak kalır.
 */
export function ListingCardLarge({ card, favorite, favoriteBusy = false, onToggleFavorite, onPress, testID }: Props) {
  const meta = [
    card.yearLabel ? { icon: 'calendar' as const, text: card.yearLabel } : null,
    card.kmLabel ? { icon: 'gauge' as const, text: card.kmLabel } : null,
    card.city ? { icon: 'map-pin' as const, text: card.city } : null,
  ].filter((item): item is { icon: 'calendar' | 'gauge' | 'map-pin'; text: string } => item !== null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.price}${card.financing ? `, ${card.financing}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={testID}>
      <View style={styles.image}>
        {card.imageUri ? (
          <Image source={{ uri: card.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="truck" size={56} color={colors.slateFaint} />
        )}
        {card.status === 'satildi' || card.status === 'rezerve' ? (
          <View style={styles.status}>
            <Badge variant={card.status} />
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          accessibilityState={{ busy: favoriteBusy }}
          disabled={favoriteBusy}
          onPress={onToggleFavorite}
          hitSlop={8}
          style={styles.heart}
          testID={`favorite-toggle-${card.id}`}>
          <Icon name="heart" size={22} color={favorite ? colors.danger : colors.navy} filled={favorite} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.category} numberOfLines={1}>
            {card.category.toLocaleUpperCase('tr-TR')}
          </Text>
          <Text style={styles.date}>{card.dateLabel}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {card.title}
        </Text>
        {meta.length > 0 ? (
          <View style={styles.metaRow}>
            {meta.map(({ icon, text }) => (
              <View key={icon} style={styles.metaItem}>
                <Icon name={icon} size={16} color={colors.slate} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.priceRow}>
          <Text style={styles.price} numberOfLines={1}>
            {card.priceAmount}
            <Text style={styles.currency}> TL</Text>
          </Text>
          {card.financingShort ? (
            <View style={styles.finance}>
              <Icon name="credit-card" size={16} color={colors.navy} />
              <Text style={styles.financeText}>{card.financingShort}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, backgroundColor: colors.white, overflow: 'hidden', borderWidth: 1, borderColor: colors.lineSoft },
  pressed: { opacity: 0.9 },
  image: { height: 248, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  status: { position: 'absolute', top: 14, left: 14 },
  heart: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  category: { flexShrink: 1, fontFamily: fontFamily.inter600, fontSize: 12, letterSpacing: 1.2, color: colors.slate },
  date: { fontFamily: fontFamily.inter400, fontSize: 13, color: colors.slateLight },
  title: { fontFamily: fontFamily.inter600, fontSize: 17, lineHeight: 23, color: colors.ink },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fontFamily.inter400, fontSize: 14, color: colors.slate },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  price: { flexShrink: 1, fontFamily: fontFamily.montserrat800, fontSize: 24, color: colors.navy },
  currency: { fontFamily: fontFamily.inter600, fontSize: 13, color: colors.slate },
  finance: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: colors.blueTint },
  financeText: { fontFamily: fontFamily.inter600, fontSize: 13, color: colors.navy },
});
