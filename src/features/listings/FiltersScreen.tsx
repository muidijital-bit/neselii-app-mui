import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CATEGORY_CATALOG,
  CATEGORY_IDS,
  buildSearch,
  clearDraft,
  decodeSearchParam,
  encodeSearchParam,
  formatCompactTl,
  formatInteger,
  initialDraftForCategory,
  searchToDraft,
  showsDriveConfigs,
  showsRooms,
  specificKindFor,
  toggleCategory,
  type CategoryId,
  type DriveConfig,
  type FilterDraft,
  type FilterErrors,
  type FilterField,
  type RoomCount,
  type SearchableStatus,
  type SpecificDraft,
  type TrailerAxles,
} from '@/domain';
import { FormScroll, useScrollFocusedIntoView } from '@/features/auth/FormScroll';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { usePulseOnChange } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

import { TRAILER_BRAND_OPTIONS, VEHICLE_BRAND_OPTIONS } from './filterOptions';
import { CATEGORY_ICONS } from './presentation';
import { FilterRangeSlider, PriceRangeSlider, linearScale, numericText, quadraticScale } from './PriceRangeSlider';
import { resultsHref } from './routes';
import { SelectField } from './SelectField';
import { useBrandsQuery, useCategoriesQuery, useListingCountQuery } from './useListingsQueries';

const STATUS_OPTIONS: readonly { value: SearchableStatus; label: string }[] = [
  { value: 'published', label: 'Yayında' },
  { value: 'reserved', label: 'Rezerve' },
  { value: 'sold', label: 'Satıldı' },
];
const DRIVE_OPTIONS: readonly { value: DriveConfig; label: string }[] = [
  { value: '4x2', label: '4x2' },
  { value: '6x2', label: '6x2' },
  { value: '6x4', label: '6x4' },
];
const AXLE_OPTIONS: readonly { value: TrailerAxles; label: string }[] = [
  { value: 2, label: '2 Aks' },
  { value: 3, label: '3 Aks' },
  { value: 4, label: '4 Aks' },
];
const ROOM_OPTIONS: readonly { value: RoomCount; label: string }[] = [
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
  { value: '3+1', label: '3+1' },
  { value: '4+1', label: '4+1' },
];

// Kaydırıcı ölçekleri (main): km karesel, model yılı doğrusal. Uçlar ölçek sınırındayken alan boştur ("sınır yok").
const KM_MAX = 1_500_000;
const YEAR_MIN = 1990;
const YEAR_MAX = new Date().getFullYear() + 1;
const kmScale = quadraticScale(KM_MAX, 5_000);
const yearScale = linearScale(YEAR_MIN, YEAR_MAX);

const PRICE_PRESETS = [
  { key: 'u1', label: '1 Milyon altı', min: '', max: '1.000.000' },
  { key: '1-3', label: '1 – 3 Milyon', min: '1.000.000', max: '3.000.000' },
  { key: '3-5', label: '3 – 5 Milyon', min: '3.000.000', max: '5.000.000' },
  { key: '5p', label: '5 Milyon +', min: '5.000.000', max: '' },
] as const;

const toggled = <T,>(list: readonly T[], value: T): readonly T[] => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

/** Bölüm başlığındaki aralık özeti (main `rangeLabel`): geçersiz metin varsa özet gösterilmez. */
function rangeLabel(minText: string, maxText: string, format: (v: number) => string, all = 'Tümü'): string | undefined {
  const min = numericText(minText);
  const max = numericText(maxText);
  if ((minText.trim() && min === undefined) || (maxText.trim() && max === undefined)) return undefined;
  if (min == null && max == null) return all;
  if (min == null) return `${format(max!)} ve altı`;
  if (max == null) return `${format(min)} ve üstü`;
  return `${format(min)} – ${format(max)}`;
}

/** Değer durulduktan sonra güncellenir (kaydırıcı sürüklenirken her adımda sayım sorgusu atılmasın). */
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Filtreleme (05): kategoriye özel alanlar. Başlangıç seçimi `categoryId` rota parametresidir (geçersiz/eksik → tüm kategoriler);
 * 010'dan dönüşte `search` parametresi mevcut aramayı forma açar. "N ilanı göster", doğrulanmış normalize `ListingSearch`'ü sonuç
 * hedefine (`resultsHref`) aktarır.
 */
export function FiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string; search?: string }>();
  const [draft, setDraft] = useState<FilterDraft>(() => {
    const incoming = decodeSearchParam(params.search);
    return incoming ? searchToDraft(incoming) : initialDraftForCategory(params.categoryId);
  });
  const [errors, setErrors] = useState<FilterErrors>({});

  const kind = specificKindFor(draft.categories);
  // Kategoriler sunucudaki kategorilerdir (yüklenene kadar katalog); seçili ama listede olmayan kategori yine gösterilir.
  const categoriesQuery = useCategoriesQuery();
  const categoryTiles = (() => {
    const fromServer: { id: CategoryId; name: string; count: number | null; subtypes: readonly string[] }[] =
      categoriesQuery.data?.map(({ id, name, listingCount, subcategories }) => ({ id, name, count: listingCount, subtypes: subcategories })) ??
      CATEGORY_IDS.map((id) => ({ id, name: CATEGORY_CATALOG[id].name, count: null, subtypes: CATEGORY_CATALOG[id].subcategories }));
    const missing = draft.categories
      .filter((id) => !fromServer.some((tile) => tile.id === id))
      .map((id) => ({ id, name: CATEGORY_CATALOG[id].name, count: null, subtypes: CATEGORY_CATALOG[id].subcategories }));
    return [...fromServer, ...missing];
  })();
  // Tek kategori seçiliyken main'deki "<Kategori> tipi" seçimi (alt türler). Çekicide alt türler aks düzeniyle aynı olduğundan "Çekiş Tipi" ayrıca gösterilmez.
  const single = draft.categories.length === 1 ? categoryTiles.find((tile) => tile.id === draft.categories[0]) : undefined;
  const subtypeOptions = single?.subtypes ?? [];
  const showDrive = kind === 'vehicle' && showsDriveConfigs(draft.categories) && (single?.id !== 'cekici' || draft.specific.driveConfigs.length > 0);

  // "N ilanı göster": taslak geçerliyse eşleşen ilan sayısı canlı sorulur (300 ms durulduktan sonra).
  const built = buildSearch(draft);
  const debouncedKey = useDebounced(built.ok ? encodeSearchParam(built.search) : null, 300);
  const countSearch = useMemo(() => (debouncedKey === null ? null : decodeSearchParam(debouncedKey)), [debouncedKey]);
  const countQuery = useListingCountQuery(countSearch);
  const liveCount = countQuery.data ?? null;
  // Marka önerileri seçili kategorilerdeki gerçek ilanlardan; yüklenemezse sabit öneri listesi kullanılır.
  const brandsQuery = useBrandsQuery(draft.categories);
  const brandOptions = brandsQuery.data?.length ? brandsQuery.data : kind === 'trailer' ? TRAILER_BRAND_OPTIONS : VEHICLE_BRAND_OPTIONS;

  const setSpecific = (patch: Partial<SpecificDraft>, field?: FilterField) => {
    setDraft((current) => ({ ...current, specific: { ...current.specific, ...patch } }));
    if (field) setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const setCommon = (patch: Partial<FilterDraft>, field?: FilterField) => {
    setDraft((current) => ({ ...current, ...patch }));
    if (field) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const apply = () => {
    const result = buildSearch(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // Sonuç ekranından düzenlemeye gelindiyse o ekrana döner ve parametresini günceller (ekran birikmez); yoksa bu ekranın yerini alır.
    router.dismissTo(resultsHref(result.search));
  };

  const resultTitle = liveCount === null ? 'Sonuçları Göster' : liveCount === 0 ? 'Eşleşen ilan yok' : `${liveCount} ilanı göster`;
  // Sayı değişince buton küçük bir nabız atar (filtrenin sonucu etkilediği fark edilsin); hareketi azalt açıkken atmaz.
  const applyPulse = usePulseOnChange(liveCount);
  const yearMin = numericText(draft.specific.modelYearMin);
  const yearMax = numericText(draft.specific.modelYearMax);
  const kmMin = numericText(draft.specific.odometerMin);
  const kmMax = numericText(draft.specific.odometerMax);

  return (
    <View style={styles.container} testID="filters-screen">
      {/* iOS'ta sayfa modalı: üstteki boşluk siyah, açık yazı; Android'de tam ekran beyaz başlık, koyu yazı. */}
      <FocusStatusBar style={Platform.OS === 'ios' ? 'light' : 'dark'} />
      {/* Main'de bu ekran iOS'ta sayfa modalıdır (üst boşluk sabit); Android'de tam ekran açıldığı için durum çubuğu payı eklenir. */}
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: insets.top + Spacing.three }]}>
        <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Kapat" onPress={close} style={styles.headerSide} testID="filters-close">
          <Icon name="x" size={28} />
        </Pressable>
        <Text variant="heading" accessibilityRole="header">
          Filtrele
        </Text>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Temizle"
          onPress={() => {
            setDraft(clearDraft);
            setErrors({});
          }}
          style={[styles.headerSide, styles.headerRight]}
          testID="filters-clear">
          <Text variant="bodySemibold" color="green">
            Temizle
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Android'de klavye pencereyi küçültmez: sayı alanları klavyenin altında kalmasın diye odaklı alan klavyenin üstüne kaydırılır. */}
        <FormScroll style={styles.flex} contentContainerStyle={styles.content} testID="filters-scroll">
          <Section title="Kategori">
            <EqualGrid columns={2}>
              {categoryTiles.map(({ id, name, count }) => {
                const selected = draft.categories.includes(id);
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={count === null ? name : `${name}, ${count} ilan`}
                    onPress={() => {
                      // Kategori değişince alt tür seçimi de sıfırlanır (main); özel alanları domain temizler.
                      setDraft((current) => ({ ...toggleCategory(current, id), subtypes: [] }));
                      setErrors({});
                    }}
                    style={[styles.categoryTile, selected && styles.categoryTileSelected]}
                    testID={`filter-category-${id}`}>
                    <View style={[styles.categoryIcon, selected && styles.categoryIconSelected]}>
                      <Icon name={CATEGORY_ICONS[id]} size={24} color={selected ? 'white' : 'heading'} />
                    </View>
                    <View style={styles.flex}>
                      {/* 375 genişlikte iki sütunlu karoda "Ticari Araç" / "Gayrimenkul" sığmıyordu: kesmek yerine yazı tek satıra sığacak kadar küçülür. */}
                      <Text
                        variant="bodySemibold"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                        style={{ color: selected ? Colors.white : Colors.heading }}>
                        {name}
                      </Text>
                      {count !== null ? (
                        <Text variant="caption" style={{ color: selected ? Colors.greenSoft : Colors.textSecondary }}>
                          {count} ilan
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </EqualGrid>
          </Section>

          {single && subtypeOptions.length ? (
            <Section title={`${single.name} tipi`}>
              <Segmented
                options={subtypeOptions.map((value) => ({ value, label: value }))}
                selected={draft.subtypes}
                onChange={(subtypes) => setCommon({ subtypes })}
                testIDPrefix="filter-subtype"
                wrap
              />
            </Section>
          ) : null}

          {kind !== 'estate' ? (
            <Section title="Marka">
              <SelectField
                label="Marka"
                placeholder="Tüm markalar"
                leadingIcon="tag"
                value={draft.specific.brand}
                options={brandOptions}
                onChange={(brand) => setSpecific({ brand })}
                customInput={{ placeholder: 'Listede yoksa marka yazın' }}
                clearLabel="Tüm markalar"
                testID="filter-brand"
              />
            </Section>
          ) : null}

          <Section title="Fiyat" value={rangeLabel(draft.priceMinTl, draft.priceMaxTl, formatCompactTl)}>
            <PriceRangeSlider
              minText={draft.priceMinTl}
              maxText={draft.priceMaxTl}
              onChange={(end, tl) => {
                const text = tl === null ? '' : formatInteger(tl);
                setCommon(end === 'min' ? { priceMinTl: text } : { priceMaxTl: text }, 'price');
              }}
              testID="filter-price-slider"
            />
            <EqualGrid columns={2}>
              {PRICE_PRESETS.map((preset) => {
                const selected = draft.priceMinTl === preset.min && draft.priceMaxTl === preset.max;
                return (
                  <Pressable
                    key={preset.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setCommon(selected ? { priceMinTl: '', priceMaxTl: '' } : { priceMinTl: preset.min, priceMaxTl: preset.max }, 'price')}
                    style={[styles.preset, selected && styles.presetSelected]}
                    testID={`filter-price-preset-${preset.key}`}>
                    <Text variant="smallSemibold" style={{ color: selected ? Colors.white : Colors.heading }}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </EqualGrid>
            <View style={styles.pair}>
              <NumberBox label="En az" a11yLabel="Fiyat, en az" suffix="TL" value={draft.priceMinTl} onChange={(priceMinTl) => setCommon({ priceMinTl }, 'price')} invalid={!!errors.price} testID="filter-price-min" />
              <NumberBox label="En fazla" a11yLabel="Fiyat, en fazla" suffix="TL" value={draft.priceMaxTl} onChange={(priceMaxTl) => setCommon({ priceMaxTl }, 'price')} invalid={!!errors.price} testID="filter-price-max" />
            </View>
            <FieldError message={errors.price} testID="filter-price-error" />
          </Section>

          {kind !== 'estate' ? (
            <Section title="Model yılı" value={rangeLabel(draft.specific.modelYearMin, draft.specific.modelYearMax, String)}>
              <FilterRangeSlider
                low={yearScale.toPosition(yearMin, 0)}
                high={yearScale.toPosition(yearMax, 1)}
                onChange={(thumb, position) => {
                  const year = yearScale.toValue(position);
                  if (thumb === 'min') setSpecific({ modelYearMin: year > YEAR_MIN ? String(year) : '' }, 'modelYear');
                  else setSpecific({ modelYearMax: year < YEAR_MAX ? String(year) : '' }, 'modelYear');
                }}
                labels={{ min: 'Model yılı, en az', max: 'Model yılı, en fazla' }}
                valueTexts={{ min: yearMin === undefined ? 'Sınır yok' : String(yearMin), max: yearMax === undefined ? 'Sınır yok' : String(yearMax) }}
                thumbTestIDs={{ min: 'filter-year-min', max: 'filter-year-max' }}
                testID="filter-year-slider"
              />
              <View style={styles.scaleLabels}>
                <Text variant="caption">{YEAR_MIN} ve öncesi</Text>
                <Text variant="caption">{YEAR_MAX}</Text>
              </View>
              <FieldError message={errors.modelYear} testID="filter-year-error" />
            </Section>
          ) : null}

          <View style={styles.group} testID="filters-specific">
            {kind === 'vehicle' ? (
              <Section title="Kilometre" value={rangeLabel(draft.specific.odometerMin, draft.specific.odometerMax, (v) => `${formatInteger(v)} km`)}>
                <FilterRangeSlider
                  low={kmScale.toPosition(kmMin, 0)}
                  high={kmScale.toPosition(kmMax, 1)}
                  onChange={(thumb, position) => {
                    const km = kmScale.toValue(position);
                    if (thumb === 'min') setSpecific({ odometerMin: km > 0 ? String(km) : '' }, 'odometerKm');
                    else setSpecific({ odometerMax: km < KM_MAX ? String(km) : '' }, 'odometerKm');
                  }}
                  labels={{ min: 'Kilometre, en az', max: 'Kilometre, en fazla' }}
                  valueTexts={{ min: kmMin === undefined ? 'Sınır yok' : `${formatInteger(kmMin)} km`, max: kmMax === undefined ? 'Sınır yok' : `${formatInteger(kmMax)} km` }}
                  thumbTestIDs={{ min: 'filter-odometer-min', max: 'filter-odometer-max' }}
                  testID="filter-odometer-slider"
                />
                <View style={styles.scaleLabels}>
                  <Text variant="caption">0 km</Text>
                  <Text variant="caption">{formatInteger(KM_MAX)} km +</Text>
                </View>
                <FieldError message={errors.odometerKm} testID="filter-odometer-error" />
              </Section>
            ) : null}

            {showDrive ? (
              <Section title="Çekiş tipi">
                <Segmented options={DRIVE_OPTIONS} selected={draft.specific.driveConfigs} onChange={(driveConfigs) => setSpecific({ driveConfigs })} testIDPrefix="filter-drive" />
              </Section>
            ) : null}

            {kind === 'trailer' ? (
              <Section title="Aks sayısı">
                <Segmented options={AXLE_OPTIONS} selected={draft.specific.axles} onChange={(axles) => setSpecific({ axles })} testIDPrefix="filter-axles" />
              </Section>
            ) : null}

            {kind === 'estate' ? (
              <Section title="Alan" value={rangeLabel(draft.specific.areaMin, draft.specific.areaMax, (v) => `${formatInteger(v)} m²`)}>
                <View style={styles.pair}>
                  <NumberBox label="En az" a11yLabel="Alan (m²), en az" suffix="m²" value={draft.specific.areaMin} onChange={(areaMin) => setSpecific({ areaMin }, 'areaM2')} invalid={!!errors.areaM2} testID="filter-area-min" />
                  <NumberBox label="En fazla" a11yLabel="Alan (m²), en fazla" suffix="m²" value={draft.specific.areaMax} onChange={(areaMax) => setSpecific({ areaMax }, 'areaM2')} invalid={!!errors.areaM2} testID="filter-area-max" />
                </View>
                <FieldError message={errors.areaM2} testID="filter-area-error" />
              </Section>
            ) : null}

            {kind === 'estate' && showsRooms(draft.categories) ? (
              <Section title="Oda sayısı">
                <Segmented options={ROOM_OPTIONS} selected={draft.specific.rooms} onChange={(rooms) => setSpecific({ rooms })} testIDPrefix="filter-rooms" />
              </Section>
            ) : null}
          </View>

          <Section title="İlan durumu">
            <Segmented options={STATUS_OPTIONS} selected={draft.statuses} onChange={(statuses) => setCommon({ statuses })} testIDPrefix="filter-status" />
          </Section>

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
                value={draft.financing}
                onValueChange={(financing) => setCommon({ financing })}
                trackColor={{ false: Colors.disabled, true: Colors.green }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.disabled}
                accessibilityLabel="Taksit veya kredi imkânı"
                testID="filter-financing"
              />
            </View>
          </View>
        </FormScroll>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
          <Animated.View style={applyPulse}>
            <Button title={resultTitle} icon="search" disabled={liveCount === 0} onPress={apply} testID="filters-apply" />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text variant="subheading" accessibilityRole="header">
          {title}
        </Text>
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

/**
 * Main'deki eşit genişlikli bölmeli seçici ("Tümü" + seçenekler, en fazla 4 sütun). Bizim domain çoklu seçimi desteklediği için
 * seçenekler aç/kapa çalışır; hiçbiri seçili değilken "Tümü" seçili görünür ve "Tümü" seçimi temizler.
 * `wrap`: uzun etiketli seçenekler (alt türler: "Frigorifik", "Hatchback", "Ekskavatör") eşit hücreye sığmak için küçülüp kısa
 * etiketlerden farklı boyda görünüyordu; bu kipte çipler içeriğe göre genişler, satıra sığmayan alt satıra geçer, yazı boyu hep aynıdır.
 */
function Segmented<T extends string | number>({
  options,
  selected,
  onChange,
  testIDPrefix,
  wrap = false,
}: {
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onChange: (next: readonly T[]) => void;
  testIDPrefix: string;
  wrap?: boolean;
}) {
  const all = { key: 'all', label: 'Tümü', isSelected: selected.length === 0, onPress: () => onChange([]) };
  const cells = [
    all,
    ...options.map((option) => ({ key: String(option.value), label: option.label, isSelected: selected.includes(option.value), onPress: () => onChange(toggled(selected, option.value)) })),
  ];
  const chips = cells.map((cell) => (
    <Pressable
      key={cell.key}
      accessibilityRole="button"
      accessibilityState={{ selected: cell.isSelected }}
      onPress={cell.onPress}
      style={[styles.segment, wrap && styles.segmentWrap, cell.isSelected && styles.segmentSelected]}
      testID={`${testIDPrefix}-${cell.key}`}>
      <Text variant="smallSemibold" numberOfLines={1} adjustsFontSizeToFit={!wrap} style={{ color: cell.isSelected ? Colors.white : Colors.heading }}>
        {cell.label}
      </Text>
    </Pressable>
  ));
  if (wrap) return <View style={styles.wrapRow}>{chips}</View>;
  return <EqualGrid columns={Math.min(cells.length, 4)}>{chips}</EqualGrid>;
}

function NumberBox({
  label,
  a11yLabel,
  suffix,
  value,
  onChange,
  invalid,
  testID,
}: {
  label: string;
  a11yLabel: string;
  suffix?: string;
  value: string;
  onChange: (text: string) => void;
  invalid: boolean;
  testID: string;
}) {
  const onFocus = useScrollFocusedIntoView();
  // 360 dp genişlikte kutu ~90 dp yazı alanı bırakır: "10.000.000" gibi uzun değerlerde yazı küçülür, baştaki rakam kaymaz/kesilmez.
  const long = value.length > 9;
  return (
    <View style={[styles.numberBox, invalid && styles.invalid]}>
      <Text variant="caption">{label}</Text>
      <View style={styles.numberRow}>
        <TextInput
          onFocus={onFocus}
          value={value}
          onChangeText={onChange}
          placeholder="—"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          accessibilityLabel={`${a11yLabel}${invalid ? ', hata' : ''}`}
          style={[styles.numberInput, long && styles.numberInputLong]}
          testID={testID}
        />
        {suffix ? (
          <Text variant="smallSemibold" color="textTertiary">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function FieldError({ message, testID }: { message?: string; testID: string }) {
  if (!message) return null;
  return (
    <Text variant="caption" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" testID={testID}>
      {message}
    </Text>
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
  group: { gap: Spacing.three },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    height: 68,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.two + 2,
  },
  categoryTileSelected: { backgroundColor: Colors.navy },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconSelected: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segment: {
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  segmentSelected: { backgroundColor: Colors.navy },
  // Çip içeriğe göre genişler; satırda artan yer çiplere paylaştırılır (satır sonu boşluk kalmaz)
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  segmentWrap: { flexGrow: 1, paddingHorizontal: Spacing.three },
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
    paddingHorizontal: Spacing.three - 4,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  invalid: { borderWidth: 1.5, borderColor: Colors.danger },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  // Android TextInput varsayılan iç boşluk ve yazı tipi payı ekler: 34 dp kutuda rakamların alt yarısı kesiliyordu. Boşluklar sıfırlanır,
  // kutu yüksekliği yazı boyunu rahat taşır ve metin dikeyde ortalanır (`includeFontPadding`/`textAlignVertical` yalnız Android'de etkili).
  numberInput: {
    flex: 1,
    minWidth: 0,
    height: 34,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: Fonts.semibold,
    fontSize: 17,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: Colors.text,
  },
  numberInputLong: { fontSize: 15 },
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
