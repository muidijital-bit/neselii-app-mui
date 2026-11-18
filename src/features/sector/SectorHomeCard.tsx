import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SECTORS, sectorById, shortcutSearch, type ListingSearch } from '@/domain';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { GUIDES_HREF } from '@/features/guides/routes';

import { useSector } from './SectorProvider';

/**
 * Ana sayfa "Size uygun araçlar" kartı (madde 1). Sektör seçilmediyse "Aracı hangi iş için kullanacaksınız?" sorusu ve sektör çipleri; seçildiyse
 * o sektöre uygun araç türleri (dokununca arama açılır), "Değiştir" ve "Araç Bulucu" bağlantısı. Kart beyaz, ana sayfadaki kart diliyle aynıdır.
 */
export function SectorHomeCard({ onSearch, onFinder }: { onSearch: (search: ListingSearch) => void; onFinder: () => void }) {
  const { sector, setSector } = useSector();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const chosen = sector && !editing ? sectorById(sector) : null;

  return (
    <View style={styles.card} testID="home-sector">
      {chosen ? (
        <>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Icon name={chosen.icon as IconName} size={22} color="white" />
            </View>
            <View style={styles.flex}>
              <Text variant="caption">Size uygun araçlar</Text>
              <Text variant="subheading" numberOfLines={1}>
                {chosen.label}
              </Text>
            </View>
            <Pressable hitSlop={10} accessibilityRole="button" onPress={() => setEditing(true)} testID="home-sector-change">
              <Text variant="smallSemibold" color="green">
                Değiştir
              </Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {chosen.shortcuts.map((shortcut) => (
              <Pressable
                key={shortcut.key}
                accessibilityRole="button"
                onPress={() => onSearch(shortcutSearch(shortcut))}
                style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
                testID={`home-sector-shortcut-${shortcut.key}`}>
                <Text variant="smallSemibold" color="heading">
                  {shortcut.label}
                </Text>
                <Icon name="arrow-right" size={16} color="heading" />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <Text variant="subheading">Aracı hangi iş için kullanacaksınız?</Text>
          <Text variant="small">Seçin, size uygun araç türlerini öne çıkaralım.</Text>
          <View style={styles.wrap}>
            {SECTORS.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: option.id === sector }}
                onPress={() => {
                  setSector(option.id);
                  setEditing(false);
                }}
                style={({ pressed }) => [styles.option, option.id === sector && styles.optionSelected, pressed && styles.pressed]}
                testID={`home-sector-${option.id}`}>
                <Icon name={option.icon as IconName} size={18} color={option.id === sector ? 'white' : 'heading'} />
                <Text variant="smallSemibold" style={{ color: option.id === sector ? Colors.white : Colors.heading }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {/* Madde 46: sektör rehberi. */}
      <Pressable accessibilityRole="button" onPress={() => router.push(GUIDES_HREF)} style={({ pressed }) => [styles.finder, pressed && styles.pressed]} testID="home-sector-guides">
        <Icon name="book-open" size={20} color="heading" />
        <Text variant="smallSemibold" color="heading" style={styles.flex}>
          {chosen ? `${chosen.label} rehberi` : 'Sektör rehberi'}: ipuçları ve yazılar
        </Text>
        <Icon name="chevron-right" size={20} color="textTertiary" />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onFinder} style={({ pressed }) => [styles.finder, pressed && styles.pressed]} testID="home-sector-finder">
        <Icon name="mci:magnify-scan" size={20} color="success" />
        <Text variant="smallSemibold" color="success" style={styles.flex}>
          Araç Bulucu: 4 soruda size uygun aracı bulalım
        </Text>
        <Icon name="chevron-right" size={20} color="success" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two + 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: Spacing.two, paddingRight: Spacing.two },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHighlight,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.surface,
  },
  optionSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  finder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pressed: { opacity: 0.8 },
});
