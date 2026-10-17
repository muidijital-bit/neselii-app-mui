import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { OptionSheet, type Option } from '@/components/option-sheet';
import { RangeSlider } from '@/components/range-slider';
import { Text } from '@/components/text';
import { Chip } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useBrands, useCategories } from '@/features/listings/api';
import { searchStore } from '@/features/listings/search-store';
import { formatNumber } from '@/lib/format';
import type { FilterField, SavedSearchFilters } from '@/types/database';

const PRICE_MAX = 20_000_000;
const PRICE_STEP = 50_000;
const currentYear = new Date().getFullYear();
const yearOptions: Option<string>[] = Array.from({ length: currentYear - 1979 }, (_, i) => {
  const y = String(currentYear - i);
  return { value: y, label: y };
});

// Kaydırıcı karesel ölçeklenir: düşük fiyatlarda daha hassas
const toPrice = (t: number) => Math.round((t * t * PRICE_MAX) / PRICE_STEP) * PRICE_STEP;
const toPosition = (price: number | undefined, fallback: number) =>
  price == null ? fallback : Math.sqrt(Math.min(price, PRICE_MAX) / PRICE_MAX);

const parseNumber = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
};

type Sheet = 'brand' | 'minYear' | 'maxYear' | null;
type FieldValue = { min?: number; max?: number } | string | undefined;

export default function FilterScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const [filters, setFilters] = useState<SavedSearchFilters>(() => searchStore.get().filters);
  const [sheet, setSheet] = useState<Sheet>(null);
  const brands = useBrands(filters.category);

  const category = categories.data?.find((c) => c.slug === filters.category);
  const update = (patch: Partial<SavedSearchFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const updateField = (key: string, value: FieldValue) =>
    setFilters((f) => {
      const fields = { ...f.fields };
      if (value === undefined) delete fields[key];
      else fields[key] = value;
      return { ...f, fields };
    });

  const apply = () => {
    searchStore.set({ filters });
    if (next === 'listings') {
      router.dismiss();
      router.push('/listings');
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable hitSlop={12} accessibilityLabel="Kapat" onPress={() => router.back()}>
          <Icon name="x" size={28} />
        </Pressable>
        <Text variant="heading" style={styles.headerTitle}>
          Filtrele
        </Text>
        <Pressable hitSlop={12} onPress={() => setFilters({})}>
          <Text variant="bodySemibold" color="heading">
            Temizle
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Kategori">
          <View style={styles.wrap}>
            {categories.data?.map((c) => (
              <Chip
                key={c.slug}
                label={c.name}
                selected={filters.category === c.slug}
                onPress={() =>
                  // Kategori değişince kategoriye özel alanlar ve marka sıfırlanır
                  update({
                    category: filters.category === c.slug ? undefined : c.slug,
                    fields: undefined,
                    brand: undefined,
                  })
                }
              />
            ))}
          </View>
        </Section>

        <Section title="Marka">
          <SelectBox value={filters.brand} placeholder="Marka seçin" onPress={() => setSheet('brand')} />
        </Section>

        <Section title="Model Yılı">
          <View style={styles.pair}>
            <SelectBox
              value={filters.minYear?.toString()}
              placeholder="En az"
              onPress={() => setSheet('minYear')}
            />
            <Text variant="body" color="textTertiary">
              –
            </Text>
            <SelectBox
              value={filters.maxYear?.toString()}
              placeholder="En fazla"
              onPress={() => setSheet('maxYear')}
            />
          </View>
        </Section>

        <Section title="Fiyat Aralığı (TL)">
          <RangeSlider
            low={toPosition(filters.minPrice, 0)}
            high={toPosition(filters.maxPrice, 1)}
            onChange={(lo, hi) => {
              const minPrice = toPrice(lo);
              const maxPrice = toPrice(hi);
              update({ minPrice: minPrice > 0 ? minPrice : undefined, maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined });
            }}
          />
          <View style={styles.pair}>
            <NumberBox value={filters.minPrice} placeholder="En az" onChange={(minPrice) => update({ minPrice })} />
            <Text variant="body" color="textTertiary">
              –
            </Text>
            <NumberBox value={filters.maxPrice} placeholder="En fazla" onChange={(maxPrice) => update({ maxPrice })} />
          </View>
        </Section>

        {category?.filter_fields.length ? (
          <View style={styles.special}>
            <Text variant="overline">{category.name} için özel alanlar</Text>
            {category.filter_fields.map((field) => (
              <SpecialField
                key={field.key}
                field={field}
                value={filters.fields?.[field.key]}
                onChange={(value) => updateField(field.key, value)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title="Sonuçları Göster" onPress={apply} />
      </View>

      <OptionSheet
        visible={sheet === 'brand'}
        title="Marka"
        options={(brands.data ?? []).map((b) => ({ value: b, label: b }))}
        selected={filters.brand}
        clearLabel="Tüm markalar"
        onSelect={(brand) => update({ brand: brand ?? undefined })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'minYear' || sheet === 'maxYear'}
        title={sheet === 'minYear' ? 'En eski model yılı' : 'En yeni model yılı'}
        options={yearOptions}
        selected={(sheet === 'minYear' ? filters.minYear : filters.maxYear)?.toString()}
        clearLabel="Farketmez"
        onSelect={(year) =>
          update(sheet === 'minYear' ? { minYear: year ? Number(year) : undefined } : { maxYear: year ? Number(year) : undefined })
        }
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="subheading">{title}</Text>
      {children}
    </View>
  );
}

function SelectBox({ value, placeholder, onPress }: { value?: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable style={styles.box} onPress={onPress} accessibilityRole="button">
      <Text variant="body" color={value ? 'text' : 'textTertiary'} style={styles.flex} numberOfLines={1}>
        {value ?? placeholder}
      </Text>
      <Icon name="chevron-down" size={22} color="textSecondary" />
    </Pressable>
  );
}

function NumberBox({
  value,
  placeholder,
  onChange,
}: {
  value?: number;
  placeholder: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <TextInput
      value={value != null ? formatNumber(value) : ''}
      onChangeText={(t) => onChange(parseNumber(t))}
      placeholder={placeholder}
      placeholderTextColor={Colors.textTertiary}
      keyboardType="number-pad"
      style={[styles.box, styles.input]}
    />
  );
}

function SpecialField({
  field,
  value,
  onChange,
}: {
  field: FilterField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  if (field.type === 'select') {
    return (
      <View style={styles.fieldBlock}>
        <Text variant="bodyMedium">{field.label}</Text>
        <View style={styles.wrap}>
          {field.options?.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={value === option}
              onPress={() => onChange(value === option ? undefined : option)}
            />
          ))}
        </View>
      </View>
    );
  }
  const range = typeof value === 'object' ? value : {};
  const set = (patch: { min?: number; max?: number }) => {
    const nextRange = { ...range, ...patch };
    onChange(nextRange.min == null && nextRange.max == null ? undefined : nextRange);
  };
  return (
    <View style={styles.fieldBlock}>
      <Text variant="bodyMedium">
        {field.label}
        {field.unit ? ` (${field.unit})` : ''}
      </Text>
      <View style={styles.pair}>
        <NumberBox value={range.min} placeholder="En az" onChange={(min) => set({ min })} />
        <Text variant="body" color="textTertiary">
          –
        </Text>
        <NumberBox value={range.max} placeholder="En fazla" onChange={(max) => set({ max })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1, paddingTop: Spacing.two },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  section: { gap: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pair: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  box: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
  },
  input: { fontFamily: Fonts.regular, fontSize: 17, color: Colors.text },
  special: { gap: Spacing.three, backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.three },
  fieldBlock: { gap: Spacing.two },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
