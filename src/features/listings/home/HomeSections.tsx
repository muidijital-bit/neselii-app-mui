import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useState, type ComponentProps } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/icons/Icon';
import { buildSearch, EMPTY_FILTER_DRAFT, EMPTY_SPECIFIC_DRAFT, type FilterDraft, type ListingSearch } from '@/domain';
import { colors, fontFamily } from '@/theme';

import type { ListingCardModel } from '../presentation';

const H_PAD = 16;

// --- Hızlı filtreler -------------------------------------------------------------------------------------------------

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type QuickFilter = { readonly key: string; readonly label: string; readonly glyph: GlyphName; readonly draft: FilterDraft };

const draft = (patch: Partial<FilterDraft>): FilterDraft => ({ ...EMPTY_FILTER_DRAFT, ...patch });

/** Tasarımdaki yuvarlak kısayollar; her biri gerçek bir aramaya karşılık gelir (alt tür, finansman, model yılı, kategori). */
export const QUICK_FILTERS: readonly QuickFilter[] = [
  { key: 'cekici', label: 'Çekici', glyph: 'truck', draft: draft({ categories: ['cekici'] }) },
  { key: 'damperli', label: 'Damperli', glyph: 'dump-truck', draft: draft({ subtypes: ['Damperli'] }) },
  { key: 'taksitli', label: 'Taksitli', glyph: 'credit-card-outline', draft: draft({ financing: true }) },
  { key: '2020', label: '2020+', glyph: 'calendar-star', draft: draft({ specific: { ...EMPTY_SPECIFIC_DRAFT, modelYearMin: '2020' } }) },
  { key: 'kasali', label: 'Kasalı', glyph: 'truck-cargo-container', draft: draft({ subtypes: ['Kasalı'] }) },
  { key: 'ticari', label: 'Ticari', glyph: 'van-utility', draft: draft({ categories: ['ticari-arac'] }) },
];

export function quickFilterSearch(filter: QuickFilter): ListingSearch | null {
  const built = buildSearch(filter.draft);
  return built.ok ? built.search : null;
}

export function QuickFilters({ onSelect }: { onSelect: (filter: QuickFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow} testID="home-quick-filters">
      {QUICK_FILTERS.map((filter) => (
        <Pressable
          key={filter.key}
          accessibilityRole="button"
          accessibilityLabel={`${filter.label} ilanları`}
          onPress={() => onSelect(filter)}
          style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}
          testID={`home-quick-${filter.key}`}>
          <View style={styles.quickCircle}>
            <MaterialCommunityIcons name={filter.glyph} size={30} color={colors.navy} />
          </View>
          <Text style={styles.quickLabel} numberOfLines={1}>
            {filter.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// --- Taksit kampanyası -----------------------------------------------------------------------------------------------

export function FinancingPromo({ count, onPress }: { count: number | null; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kredi kartına 18 ay taksit. ${count ?? ''} ilan`}
      onPress={onPress}
      style={({ pressed }) => [styles.promo, pressed && styles.pressed]}
      testID="home-financing-promo">
      <View style={styles.promoIcon}>
        <Icon name="credit-card" size={26} color={colors.orange} />
      </View>
      <View style={styles.promoText}>
        <Text style={styles.promoTitle}>Kredi kartına 18 ay taksit</Text>
        <Text style={styles.promoBody}>%2,85’ten başlayan kredi seçenekleriyle</Text>
      </View>
      <View style={styles.promoPill}>
        <Text style={styles.promoPillText}>{count === null ? 'İlanlar' : `${count} ilan`}</Text>
        <Icon name="chevron-right" size={16} color={colors.white} />
      </View>
    </Pressable>
  );
}

// --- Bölüm başlığı ---------------------------------------------------------------------------------------------------

export function SectionHeader({ title, onAll, testID }: { title: string; onAll?: () => void; testID: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {onAll ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}, tümü`} onPress={onAll} hitSlop={8} style={styles.allLink} testID={`${testID}-all`}>
          <Text style={styles.allText}>Tümü</Text>
          <Icon name="chevron-right" size={18} color={colors.navy} />
        </Pressable>
      ) : null}
    </View>
  );
}

// --- Öne çıkan ilanlar -----------------------------------------------------------------------------------------------

const PEEK = 30;

function Gradient({ id }: { id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 1 1">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.25" stopColor="#07182b" stopOpacity="0" />
          <Stop offset="1" stopColor="#07182b" stopOpacity="0.92" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
    </Svg>
  );
}

export function FeaturedCarousel({ cards, onOpen }: { cards: readonly ListingCardModel[]; onOpen: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - H_PAD * 2 - PEEK;
  const step = cardWidth + 12;
  const [index, setIndex] = useState(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / step);
    if (next !== index) setIndex(Math.max(0, Math.min(cards.length - 1, next)));
  };

  return (
    <View>
      <FlatList
        horizontal
        data={cards}
        keyExtractor={(card) => card.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentContainerStyle={styles.featuredRow}
        onScroll={onScroll}
        scrollEventThrottle={32}
        testID="home-featured"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Öne çıkan ilan: ${item.title}, ${item.price}`}
            onPress={() => onOpen(item.id)}
            style={[styles.featuredCard, { width: cardWidth }]}
            testID={`featured-card-${item.id}`}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.featuredPlaceholder]}>
                <Icon name="truck" size={48} color={colors.blueLight} />
              </View>
            )}
            <Gradient id={`g-${item.id}`} />
            <View style={styles.featuredTop}>
              <View style={styles.featuredBadge}>
                <Icon name="sparkles" size={14} color={colors.white} />
                <Text style={styles.featuredBadgeText}>ÖNE ÇIKAN</Text>
              </View>
              {item.financingShort ? (
                <View style={styles.featuredFinance}>
                  <Text style={styles.featuredFinanceText}>{item.financingShort}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.featuredBottom}>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.featuredMeta} numberOfLines={1}>
                {[item.yearLabel, item.kmLabel, item.city].filter(Boolean).join('  •  ')}
              </Text>
              <View style={styles.featuredPriceRow}>
                <Text style={styles.featuredPrice} numberOfLines={1}>
                  {item.priceAmount}
                  <Text style={styles.featuredCurrency}> TL</Text>
                </Text>
                <View style={styles.featuredGo}>
                  <Icon name="arrow-up-right" size={22} color={colors.navy} />
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
      {cards.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {cards.map((card, dot) => (
            <View key={card.id} style={[styles.dot, dot === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// --- Yeni gelenler ızgarası ------------------------------------------------------------------------------------------

type GridProps = {
  cards: readonly ListingCardModel[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (id: string) => void;
};

export function NewArrivalsGrid({ cards, isFavorite, onToggleFavorite, onOpen }: GridProps) {
  return (
    <View style={styles.grid} testID="home-new-arrivals">
      {cards.map((card) => {
        const favorite = isFavorite(card.id);
        return (
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}, ${card.price}`}
            onPress={() => onOpen(card.id)}
            style={({ pressed }) => [styles.gridCard, pressed && styles.pressed]}
            testID={`listing-card-${card.id}`}>
            <View style={styles.gridImage}>
              {card.imageUri ? (
                <Image source={{ uri: card.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
              ) : (
                <Icon name="truck" size={40} color={colors.slateFaint} />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                onPress={() => onToggleFavorite(card.id)}
                hitSlop={8}
                style={styles.gridHeart}
                testID={`favorite-toggle-${card.id}`}>
                <Icon name="heart" size={18} color={favorite ? colors.danger : colors.navy} filled={favorite} />
              </Pressable>
              {card.financing ? (
                <View style={styles.gridFinance}>
                  <Icon name="credit-card" size={14} color={colors.navy} />
                  <Text style={styles.gridFinanceText}>Taksit</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.gridBody}>
              <Text style={styles.gridTitle} numberOfLines={2}>
                {card.title}
              </Text>
              <Text style={styles.gridMeta} numberOfLines={1}>
                {[card.yearLabel, card.kmLabel].filter(Boolean).join(' · ') || card.city}
              </Text>
              <Text style={styles.gridPrice} numberOfLines={1}>
                {card.priceAmount}
                <Text style={styles.gridCurrency}> TL</Text>
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Aradığını bulamadın mı? -----------------------------------------------------------------------------------------

export function CallCard({ onCall }: { onCall: () => void }) {
  return (
    <View style={styles.callCard} testID="home-call-card">
      <View style={styles.callIcon}>
        <Icon name="phone-call" size={26} color={colors.white} />
      </View>
      <Text style={styles.callTitle} accessibilityRole="header">
        Aradığını bulamadın mı?
      </Text>
      <Text style={styles.callBody}>Filomuz her gün yenileniyor. İhtiyacını söyle, sana uygun aracı birlikte bulalım.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Hemen Ara" onPress={onCall} style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]} testID="home-call">
        <Icon name="phone" size={22} color={colors.white} />
        <Text style={styles.callButtonText}>Hemen Ara</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },

  quickRow: { paddingHorizontal: H_PAD, gap: 22, paddingVertical: 4 },
  quickItem: { alignItems: 'center', gap: 10, width: 70 },
  quickCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontFamily: fontFamily.inter600, fontSize: 13, color: colors.navy },

  promo: {
    marginHorizontal: H_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.orangeTint,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
  },
  promoIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  promoText: { flex: 1, gap: 4 },
  promoTitle: { fontFamily: fontFamily.montserrat700, fontSize: 16, lineHeight: 21, color: colors.navy },
  promoBody: { fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  promoPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 12, paddingRight: 8, height: 34, borderRadius: 17, backgroundColor: colors.orange },
  promoPillText: { fontFamily: fontFamily.inter700, fontSize: 13, color: colors.white },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, marginBottom: 14 },
  sectionTitle: { flexShrink: 1, fontFamily: fontFamily.montserrat700, fontSize: 20, lineHeight: 26, color: colors.navy },
  allLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  allText: { fontFamily: fontFamily.inter600, fontSize: 14, color: colors.navy },

  featuredRow: { paddingHorizontal: H_PAD, gap: 12 },
  featuredCard: { height: 306, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.navyRaised, justifyContent: 'space-between' },
  featuredPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: colors.orange },
  featuredBadgeText: { fontFamily: fontFamily.inter700, fontSize: 12, letterSpacing: 1, color: colors.white },
  featuredFinance: { paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: colors.white, justifyContent: 'center' },
  featuredFinanceText: { fontFamily: fontFamily.inter700, fontSize: 12, color: colors.navy },
  featuredBottom: { padding: 16, gap: 6 },
  featuredTitle: { fontFamily: fontFamily.montserrat700, fontSize: 19, lineHeight: 24, color: colors.white },
  featuredMeta: { fontFamily: fontFamily.inter400, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  featuredPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  featuredPrice: { flexShrink: 1, fontFamily: fontFamily.montserrat800, fontSize: 26, color: colors.white },
  featuredCurrency: { fontFamily: fontFamily.inter600, fontSize: 14, color: colors.white },
  featuredGo: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { width: 22, backgroundColor: colors.navy },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: H_PAD, rowGap: 16 },
  gridCard: { width: '48%', borderRadius: 20, backgroundColor: colors.white, overflow: 'hidden', borderWidth: 1, borderColor: colors.lineSoft },
  gridImage: { height: 142, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
  gridHeart: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  gridFinance: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 26, borderRadius: 8, backgroundColor: colors.white },
  gridFinanceText: { fontFamily: fontFamily.inter600, fontSize: 12, color: colors.navy },
  gridBody: { padding: 10, gap: 4 },
  gridTitle: { fontFamily: fontFamily.inter600, fontSize: 14, lineHeight: 18, color: colors.ink, minHeight: 36 },
  gridMeta: { fontFamily: fontFamily.inter400, fontSize: 12, color: colors.slateLight },
  gridPrice: { fontFamily: fontFamily.montserrat800, fontSize: 18, color: colors.navy, marginTop: 2 },
  gridCurrency: { fontFamily: fontFamily.inter600, fontSize: 11, color: colors.slate },

  callCard: { marginHorizontal: H_PAD, padding: 24, borderRadius: 24, backgroundColor: colors.navy, gap: 12 },
  callIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  callTitle: { fontFamily: fontFamily.montserrat700, fontSize: 21, lineHeight: 27, color: colors.white },
  callBody: { fontFamily: fontFamily.inter400, fontSize: 15, lineHeight: 22, color: colors.bluePale },
  callButton: { marginTop: 8, height: 52, borderRadius: 14, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  callButtonPressed: { backgroundColor: colors.greenPressed },
  callButtonText: { fontFamily: fontFamily.inter700, fontSize: 17, color: colors.white },
});
