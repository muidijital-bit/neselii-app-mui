import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/option-sheet';
import { RangeSlider } from '@/components/range-slider';
import { Text } from '@/components/text';
import { categoryIcons } from '@/constants/categories';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useBrands, useCategories, useListingCount } from '@/features/listings/api';
import { searchStore } from '@/features/listings/search-store';
import { formatNumber } from '@/lib/format';
import type { FilterField, SavedSearchFilters } from '@/types/database';

type FieldValue = { min?: number; max?: number } | string | undefined;

// Kaydırıcı ölçekleri. Fiyat ve km karesel: düşük değerlerde daha hassas.
const PRICE_MAX = 10_000_000;
const KM_MAX = 1_500_000;
const YEAR_MIN = 1990;
const YEAR_MAX = new Date().getFullYear() + 1;

const quadratic = (max: number, step: number) => ({
  toValue: (t: number) => Math.round((t * t * max) / step) * step,
  toPosition: (v: number | undefined, fallback: number) => (v == null ? fallback : Math.sqrt(Math.min(v, max) / max)),
});
const priceScale = quadratic(PRICE_MAX, 25_000);
const kmScale = quadratic(KM_MAX, 5_000);
const yearScale = {
  toValue: (t: number) => Math.round(YEAR_MIN + t * (YEAR_MAX - YEAR_MIN)),
  toPosition: (v: number | undefined, fallback: number) =>
    v == null ? fallback : (Math.min(Math.max(v, YEAR_MIN), YEAR_MAX) - YEAR_MIN) / (YEAR_MAX - YEAR_MIN),
};

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: '1 Milyon altı', max: 1_000_000 },
  { label: '1 – 3 Milyon', min: 1_000_000, max: 3_000_000 },
  { label: '3 – 5 Milyon', min: 3_000_000, max: 5_000_000 },
  { label: '5 Milyon +', min: 5_000_000 },
];

const compactMoney = (v: number) =>
  v >= 1_000_000 ? `${formatNumber(Math.round(v / 100_000) / 10)} Mn` : `${formatNumber(Math.round(v / 1000))} Bin`;

function rangeLabel(min: number | undefined, max: number | undefined, format: (v: number) => string, all = 'Tümü') {
  if (min == null && max == null) return all;
  if (min == null) return `${format(max!)} ve altı`;
  if (max == null) return `${format(min)} ve üstü`;
  return `${format(min)} – ${format(max)}`;
}

const parseNumber = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
};

/** Değer durulduktan sonra güncellenir (kaydırıcı sürüklenirken her adımda sorgu atılmasın) */
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function FilterScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const [filters, setFilters] = useState<SavedSearchFilters>(() => searchStore.get().filters);
  const [brandOpen, setBrandOpen] = useState(false);
  const brands = useBrands(filters.category);
  const query = searchStore.get().query;
  const count = useListingCount({ query, filters: useDebounced(filters, 300) });

  const category = categories.data?.find((c) => c.slug === filters.category);
  const fields = category?.filter_fields ?? [];
  const showKm = !category || fields.some((f) => f.key === 'km');
  const totalCount = categories.data?.reduce((sum, c) => sum + c.listing_count, 0);

  const update = (patch: Partial<SavedSearchFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const setField = (key: string, value: FieldValue) =>
    setFilters((f) => {
      const fieldsNext = { ...f.fields };
      if (value === undefined) delete fieldsNext[key];
      else fieldsNext[key] = value;
      return { ...f, fields: fieldsNext };
    });
  const km = typeof filters.fields?.km === 'object' ? filters.fields.km : {};

  const selectCategory = (slug?: string) =>
    // Kategori değişince tip, marka ve kategoriye özel alanlar sıfırlanır
    update({ category: slug, subtype: undefined, brand: undefined, fields: undefined });

  const apply = () => {
    searchStore.set({ filters });
    if (next === 'listings') {
      router.dismiss();
      router.push('/listings');
    } else {
      router.back();
    }
  };

  const resultTitle =
    count.data == null ? 'Sonuçları Göster' : count.data === 0 ? 'Eşleşen ilan yok' : `${count.data} ilanı göster`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable hitSlop={12} accessibilityLabel="Kapat" onPress={() => router.back()} style={styles.headerSide}>
          <Icon name="x" size={28} />
        </Pressable>
        <Text variant="heading">Filtrele</Text>
        <Pressable hitSlop={12} onPress={() => setFilters({})} style={[styles.headerSide, styles.headerRight]}>
          <Text variant="bodySemibold" color="green">
            Temizle
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Kategori">
          <EqualGrid columns={3}>
            {[
              { slug: undefined, name: 'Tümü', icon: 'grid' as const, count: totalCount },
              ...(categories.data ?? []).map((c) => ({
                slug: c.slug,
                name: c.name,
                icon: categoryIcons[c.icon] ?? ('grid' as const),
                count: c.listing_count,
              })),
            ].map((c) => {
              const selected = filters.category === c.slug;
              return (
                <Pressable
                  key={c.slug ?? 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectCategory(c.slug)}
                  style={[styles.categoryTile, selected && styles.categoryTileSelected, c.count === 0 && styles.categoryTileEmpty]}>
                  <Icon name={c.icon} size={28} color={selected ? 'white' : 'heading'} />
                  <Text
                    variant="smallSemibold"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ color: selected ? Colors.white : Colors.heading }}>
                    {c.name}
                  </Text>
                  <Text variant="caption" style={{ color: selected ? Colors.greenSoft : Colors.textTertiary }}>
                    {c.count ?? '–'} ilan
                  </Text>
                </Pressable>
              );
            })}
          </EqualGrid>
        </Section>

        {category?.subtypes.length ? (
          <Section title={`${category.name} tipi`}>
            <Segmented
              options={['Tümü', ...category.subtypes]}
              selected={filters.subtype ?? 'Tümü'}
              onSelect={(value) => update({ subtype: value === 'Tümü' ? undefined : value })}
            />
          </Section>
        ) : null}

        <Section title="Marka">
          <Pressable style={styles.selectRow} onPress={() => setBrandOpen(true)} accessibilityRole="button">
            <Icon name="tag" size={20} color="textSecondary" />
            <Text variant="bodyMedium" style={styles.flex} color={filters.brand ? 'text' : 'textSecondary'}>
              {filters.brand ?? 'Tüm markalar'}
            </Text>
            {filters.brand ? (
              <Pressable hitSlop={10} accessibilityLabel="Markayı temizle" onPress={() => update({ brand: undefined })}>
                <Icon name="x-circle" size={20} color="textTertiary" />
              </Pressable>
            ) : (
              <Icon name="chevron-right" size={22} color="textTertiary" />
            )}
          </Pressable>
        </Section>

        <Section
          title="Fiyat"
          value={rangeLabel(filters.minPrice, filters.maxPrice, (v) => `${compactMoney(v)} TL`)}>
          <RangeSlider
            low={priceScale.toPosition(filters.minPrice, 0)}
            high={priceScale.toPosition(filters.maxPrice, 1)}
            onChange={(lo, hi) => {
              const min = priceScale.toValue(lo);
              const max = priceScale.toValue(hi);
              update({ minPrice: min > 0 ? min : undefined, maxPrice: max < PRICE_MAX ? max : undefined });
            }}
          />
          <EqualGrid columns={2}>
            {PRICE_PRESETS.map((preset) => {
              const selected = filters.minPrice === preset.min && filters.maxPrice === preset.max;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() =>
                    update(selected ? { minPrice: undefined, maxPrice: undefined } : { minPrice: preset.min, maxPrice: preset.max })
                  }
                  style={[styles.preset, selected && styles.presetSelected]}>
                  <Text variant="smallSemibold" style={{ color: selected ? Colors.white : Colors.heading }}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </EqualGrid>
          <View style={styles.pair}>
            <NumberBox label="En az" suffix="TL" value={filters.minPrice} onChange={(minPrice) => update({ minPrice })} />
            <NumberBox label="En fazla" suffix="TL" value={filters.maxPrice} onChange={(maxPrice) => update({ maxPrice })} />
          </View>
        </Section>

        <Section title="Model yılı" value={rangeLabel(filters.minYear, filters.maxYear, String)}>
          <RangeSlider
            low={yearScale.toPosition(filters.minYear, 0)}
            high={yearScale.toPosition(filters.maxYear, 1)}
            onChange={(lo, hi) => {
              const min = yearScale.toValue(lo);
              const max = yearScale.toValue(hi);
              update({ minYear: min > YEAR_MIN ? min : undefined, maxYear: max < YEAR_MAX ? max : undefined });
            }}
          />
          <View style={styles.scaleLabels}>
            <Text variant="caption">{YEAR_MIN} ve öncesi</Text>
            <Text variant="caption">{YEAR_MAX}</Text>
          </View>
        </Section>

        {showKm ? (
          <Section title="Kilometre" value={rangeLabel(km.min, km.max, (v) => `${formatNumber(v)} km`)}>
            <RangeSlider
              low={kmScale.toPosition(km.min, 0)}
              high={kmScale.toPosition(km.max, 1)}
              onChange={(lo, hi) => {
                const min = kmScale.toValue(lo);
                const max = kmScale.toValue(hi);
                const value = { min: min > 0 ? min : undefined, max: max < KM_MAX ? max : undefined };
                setField('km', value.min == null && value.max == null ? undefined : value);
              }}
            />
            <View style={styles.scaleLabels}>
              <Text variant="caption">0 km</Text>
              <Text variant="caption">{formatNumber(KM_MAX)} km +</Text>
            </View>
          </Section>
        ) : null}

        {fields
          .filter((f) => f.key !== 'km')
          .map((field) => (
            <SpecialField key={field.key} field={field} value={filters.fields?.[field.key]} onChange={(v) => setField(field.key, v)} />
          ))}

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.financingIcon}>
              <Icon name="credit-card" size={20} color="success" />
            </View>
            <View style={styles.flex}>
              <Text variant="bodySemibold">Taksit veya kredi imkânı</Text>
              <Text variant="small">Kredi kartına taksit ya da uygun faizli kredi</Text>
            </View>
            <Switch
              value={!!filters.financing}
              onValueChange={(on) => update({ financing: on || undefined })}
              trackColor={{ false: Colors.disabled, true: Colors.green }}
              thumbColor={Colors.white}
              ios_backgroundColor={Colors.disabled}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title={resultTitle} icon="search" disabled={count.data === 0} onPress={apply} />
      </View>

      <OptionSheet
        visible={brandOpen}
        title="Marka"
        options={(brands.data ?? []).map((b) => ({ value: b, label: b }))}
        selected={filters.brand}
        clearLabel="Tüm markalar"
        onSelect={(brand) => update({ brand: brand ?? undefined })}
        onClose={() => setBrandOpen(false)}
      />
    </View>
  );
}

function Section({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text variant="subheading">{title}</Text>
        {value ? (
          <Text variant="smallSemibold" color={value === 'Tümü' ? 'textTertiary' : 'green'}>
            {value}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Çocukları eşit genişlikte satırlara dizer; son satır boş hücrelerle tamamlanır. */
function EqualGrid({ columns, children }: { columns: number; children: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % columns === 0) rows.push([]);
    rows[rows.length - 1].push(child);
  });
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((child, c) => (
            <View key={c} style={styles.flex}>
              {child}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={styles.flex} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Eşit genişlikte bölmeli seçici (en fazla 4 sütun) */
function Segmented({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <EqualGrid columns={Math.min(options.length, 4)}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option)}
            style={[styles.segment, isSelected && styles.segmentSelected]}>
            <Text
              variant="smallSemibold"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: isSelected ? Colors.white : Colors.heading }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </EqualGrid>
  );
}

function NumberBox({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix?: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <View style={styles.numberBox}>
      <Text variant="caption">{label}</Text>
      <View style={styles.numberRow}>
        <TextInput
          value={value != null ? formatNumber(value) : ''}
          onChangeText={(t) => onChange(parseNumber(t))}
          placeholder="—"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          style={styles.numberInput}
        />
        {suffix ? <Text variant="smallSemibold" color="textTertiary">{suffix}</Text> : null}
      </View>
    </View>
  );
}

function SpecialField({ field, value, onChange }: { field: FilterField; value: FieldValue; onChange: (v: FieldValue) => void }) {
  if (field.type === 'select') {
    return (
      <Section title={field.label}>
        <Segmented
          options={['Tümü', ...(field.options ?? [])]}
          selected={typeof value === 'string' ? value : 'Tümü'}
          onSelect={(option) => onChange(option === 'Tümü' ? undefined : option)}
        />
      </Section>
    );
  }
  const range = typeof value === 'object' ? value : {};
  const set = (patch: { min?: number; max?: number }) => {
    const next = { ...range, ...patch };
    onChange(next.min == null && next.max == null ? undefined : next);
  };
  return (
    <Section title={field.label} value={rangeLabel(range.min, range.max, (v) => `${formatNumber(v)}${field.unit ? ` ${field.unit}` : ''}`)}>
      <View style={styles.pair}>
        <NumberBox label="En az" suffix={field.unit} value={range.min} onChange={(min) => set({ min })} />
        <NumberBox label="En fazla" suffix={field.unit} value={range.max} onChange={(max) => set({ max })} />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerSide: { minWidth: 72 },
  headerRight: { alignItems: 'flex-end' },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  grid: { gap: Spacing.two },
  gridRow: { flexDirection: 'row', gap: Spacing.two },
  categoryTile: {
    aspectRatio: 1.05,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.one,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryTileSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  categoryTileEmpty: { opacity: 0.45 },
  segment: {
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  segmentSelected: { backgroundColor: Colors.navy },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.three,
  },
  preset: {
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSelected: { backgroundColor: Colors.green, borderColor: Colors.green },
  pair: { flexDirection: 'row', gap: Spacing.two },
  numberBox: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  numberInput: { flex: 1, height: 34, fontFamily: Fonts.semibold, fontSize: 17, color: Colors.text },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -Spacing.two },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  financingIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
