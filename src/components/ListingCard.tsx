import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, radii, sizes, textStyles } from '@/theme';

import { Badge, type StatusVariant } from './Badge';
import { StripePlaceholder } from './StripePlaceholder';
import { Icon } from './icons/Icon';

type Props = {
  title: string;
  location: string;
  /** "Bugün", "12 Eki" gibi hazır gösterim metni. */
  dateLabel: string;
  /** Hazır gösterim metni (ör. "2.850.000 TL"); biçimlendirme servis/domain katmanındadır. */
  price: string;
  category: string;
  photoCount: number;
  hasVideo?: boolean;
  status?: StatusVariant;
  /** Verilmezse tasarımdaki şeritli yer tutucu gösterilir. */
  imageUri?: string;
  favorite?: boolean;
  /**
   * Verilirse kalp dokunulabilir olur (favori aç/kapa). Kalp kartın düğmesinin İÇİNDE değil kardeş katmanıdır: iç içe düğme ekran okuyucuda
   * dış düğmenin içinde kaybolurdu. Görsel (18px, pasif `slateFaint` / favoride dolu `danger`) değişmez; dokunma alanı 44px'e genişler.
   */
  onToggleFavorite?: () => void;
  /** Favori işlemi sürerken ikinci dokunuş engellenir. */
  favoriteBusy?: boolean;
  favoriteTestID?: string;
  onPress?: () => void;
  testID?: string;
};

/**
 * Bu yazı ölçeğine kadar fiyat tek satırda kalır: Android'de `numberOfLines` olmadan flexShrink'li fiyat 1 px dar ölçülüp "TL" ikinci satıra
 * düşüyor ve karttaki sabit görsel yüksekliği yüzünden görünmüyordu (021 cihaz bulgusu). Daha büyük yazıda "3.4…" gibi kesmek yerine sarılır.
 */
const PRICE_SINGLE_LINE_MAX_FONT_SCALE = 1.3;

export function ListingCard({
  title,
  location,
  dateLabel,
  price,
  category,
  photoCount,
  hasVideo = false,
  status,
  imageUri,
  favorite = false,
  onToggleFavorite,
  favoriteBusy = false,
  favoriteTestID,
  onPress,
  testID,
}: Props) {
  const largeText = useWindowDimensions().fontScale > PRICE_SINGLE_LINE_MAX_FONT_SCALE;
  const priceLines = largeText ? undefined : 1;
  const meta = `${location} · ${dateLabel}`;
  const a11yLabel = [
    title,
    price,
    meta,
    category,
    status ? `Durum: ${statusLabel[status]}` : null,
    `${photoCount} fotoğraf`,
    hasVideo ? 'videolu' : null,
    favorite ? 'favorilerde' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surface }]}>
        <View style={styles.imageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
          ) : (
            <>
              <StripePlaceholder width={sizes.listingImageWidth} height={sizes.listingImageHeight} />
              <View style={styles.placeholderLabel} pointerEvents="none">
                <Text style={[textStyles.mono, styles.placeholderText]} maxFontSizeMultiplier={1.2}>
                  {'araç\nfotoğrafı'}
                </Text>
              </View>
            </>
          )}
          {status ? (
            <View style={styles.statusSlot}>
              <Badge variant={status} />
            </View>
          ) : null}
          <View style={styles.mediaRow}>
            <View style={styles.mediaChip}>
              <Icon name="camera" size={12} color={colors.white} />
              <Text style={[textStyles.badge, styles.mediaText]} maxFontSizeMultiplier={1.2}>
                {photoCount}
              </Text>
            </View>
            {hasVideo ? (
              <View style={[styles.mediaChip, styles.videoChip]}>
                <Icon name="play" size={11} color={colors.white} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[textStyles.cardTitle, styles.title]} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.heartSlot}>
              <Icon name="heart" size={18} color={favorite ? colors.danger : colors.slateFaint} filled={favorite} />
            </View>
          </View>
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={13} color={colors.slateLight} />
            <Text style={[textStyles.caption, styles.meta]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          <View style={styles.spacer} />
          <View style={[styles.bottomRow, largeText && styles.bottomRowStacked]}>
            <Text style={[textStyles.price, styles.price, !largeText && styles.priceKeep]} numberOfLines={priceLines}>
              {price}
            </Text>
            <Text style={[textStyles.tag, styles.category]} numberOfLines={1}>
              {category}
            </Text>
          </View>
        </View>
      </Pressable>
      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          accessibilityState={{ selected: favorite, busy: favoriteBusy }}
          disabled={favoriteBusy}
          hitSlop={13}
          onPress={onToggleFavorite}
          style={styles.heartButton}
          testID={favoriteTestID}
        />
      ) : null}
    </View>
  );
}

const statusLabel: Record<StatusVariant, string> = { yeni: 'Yeni', yayinda: 'Yayında', rezerve: 'Rezerve', satildi: 'Satıldı', taslak: 'Taslak' };

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  heartSlot: { width: 18, height: 18 },
  // Kalbin kart içindeki yeri (kart iç boşluğu 10): sağ üst; dokunma katmanı bunun üstüne biner.
  heartButton: { position: 'absolute', top: 10, right: 10, width: 18, height: 18 },
  card: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  imageBox: {
    width: sizes.listingImageWidth,
    height: sizes.listingImageHeight,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  placeholderLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.slatePale, textAlign: 'center' },
  statusSlot: { position: 'absolute', top: 6, left: 6 },
  mediaRow: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', gap: 4 },
  mediaChip: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.navyDeep,
  },
  videoChip: { width: 20, paddingHorizontal: 0, justifyContent: 'center' },
  mediaText: { color: colors.white },
  info: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, minWidth: 0, color: colors.navy },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flexShrink: 1, color: colors.slateLight },
  spacer: { flex: 1 },
  // Fiyat tek satıra kısıtlanmaz (numberOfLines yok): büyük yazıda "3.4…" diye kesilmek yerine ikinci satıra iner. (flexWrap + flexShrink:0 denendi: Android'de "TL" görünmez oluyordu.)
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  // Büyük yazıda kategori etiketi fiyatın altına geçer (yan yana kalırsa fiyat "98/5.0/00" diye bölünüyordu).
  bottomRowStacked: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 4 },
  price: { flexShrink: 1, color: colors.navy },
  // Normal yazıda dar ekranda (360 dp) "8.500.00…" olmasın: fiyat hiç daralmaz, uzun kategori etiketi kısalır ("Gayrimen…").
  priceKeep: { flexShrink: 0 },
  category: {
    flexShrink: 1,
    color: colors.inkMuted,
    backgroundColor: colors.lineSoft,
    paddingHorizontal: 7,
    paddingVertical: 4, // 11 px yazı × 1.2 satır yüksekliği + 2×4 ≈ kaynaktaki 11 + 2×5
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
});
