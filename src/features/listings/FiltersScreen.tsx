import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/Btn';
import { CategoryGlyph } from '@/components/CategoryGlyph';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { FormScroll, useScrollFocusedIntoView } from '@/features/auth/FormScroll';
import {
  CATEGORY_CATALOG,
  CATEGORY_IDS,
  buildSearch,
  clearDraft,
  decodeSearchParam,
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
import { colors, radii, sizes, textStyles } from '@/theme';

import { MODEL_YEAR_OPTIONS, TRAILER_BRAND_OPTIONS, VEHICLE_BRAND_OPTIONS } from './filterOptions';
import { PriceRangeSlider } from './PriceRangeSlider';
import { resultsHref } from './routes';
import { SelectField } from './SelectField';
import { useBrandsQuery, useCategoriesQuery, useListingCountQuery } from './useListingsQueries';

const STATUS_CHIPS: readonly { value: SearchableStatus; label: string }[] = [
  { value: 'published', label: 'Yayında' },
  { value: 'reserved', label: 'Rezerve' },
  { value: 'sold', label: 'Satıldı' },
];
const DRIVE_CHIPS: readonly DriveConfig[] = ['4x2', '6x2', '6x4'];
const AXLE_CHIPS: readonly { value: TrailerAxles; label: string }[] = [
  { value: 2, label: '2 Aks' },
  { value: 3, label: '3 Aks' },
  { value: 4, label: '4 Aks' },
];
const ROOM_CHIPS: readonly RoomCount[] = ['1+1', '2+1', '3+1', '4+1'];

const toggled = <T,>(list: readonly T[], value: T): readonly T[] => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

/** Tasarımdaki özel alan başlıkları (`specTitle`): kamyon/çekici (ve boş seçim) tasarımda "ÇEKİCİ"; diğer araçlar için genel başlık. */
function specificTitle(categories: FilterDraft['categories'], kind: ReturnType<typeof specificKindFor>): string {
  if (kind === 'estate') return 'GAYRİMENKUL İÇİN ÖZEL ALANLAR';
  if (kind === 'trailer') return 'DORSE İÇİN ÖZEL ALANLAR';
  return showsDriveConfigs(categories) ? 'ÇEKİCİ İÇİN ÖZEL ALANLAR' : 'ARAÇ İÇİN ÖZEL ALANLAR';
}

/**
 * Filtreleme (05): kategoriye özel alanlar. Başlangıç seçimi `categoryId` rota parametresidir (geçersiz/eksik → tüm kategoriler);
 * 010'dan dönüşte `search` parametresi mevcut aramayı forma açar. "Sonuçları Göster", doğrulanmış normalize `ListingSearch`'ü sonuç
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
  // Kategori çipleri sunucudaki kategorilerdir (yüklenene kadar katalog); seçili ama listede olmayan kategori yine gösterilir.
  const categoriesQuery = useCategoriesQuery();
  const categoryChips = (() => {
    const fromServer: { id: CategoryId; name: string; count: number | null }[] =
      categoriesQuery.data?.map(({ id, name, listingCount }) => ({ id, name, count: listingCount })) ?? CATEGORY_IDS.map((id) => ({ id, name: CATEGORY_CATALOG[id].name, count: null }));
    const missing = draft.categories.filter((id) => !fromServer.some((chip) => chip.id === id)).map((id) => ({ id, name: CATEGORY_CATALOG[id].name, count: null }));
    return [...fromServer, ...missing];
  })();
  // "N ilanı göster": taslak geçerliyse eşleşen ilan sayısı canlı sorulur (geçersizken önceki sayı korunur).
  const built = buildSearch(draft);
  const countQuery = useListingCountQuery(built.ok ? built.search : null);
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

  return (
    <Screen background={colors.navyDeep} statusBar="light" edges={['top', 'left', 'right']} testID="filters-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.sheet}>
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={close} style={styles.headerButton} testID="filters-close">
              <Icon name="x" size={22} color={colors.navy} />
            </Pressable>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Filtrele
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Temizle"
              onPress={() => {
                setDraft(clearDraft);
                setErrors({});
              }}
              style={styles.clearButton}
              testID="filters-clear">
              <Text style={styles.clearLabel}>Temizle</Text>
            </Pressable>
          </View>

          {/* Android'de klavye pencereyi küçültmez: sayı alanları (fiyat/km/m²) klavyenin altında kalıyordu (360×640 dp'de ölçüldü) → odaklı alan klavyenin üstüne kaydırılır. */}
          <FormScroll style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="filters-scroll">
            <Card title="Kategori">
              <View style={styles.tiles}>
                {categoryChips.map(({ id, name, count }) => {
                  const selected = draft.categories.includes(id);
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={count === null ? name : `${name}, ${count} ilan`}
                      onPress={() => {
                        setDraft((current) => toggleCategory(current, id));
                        setErrors({});
                      }}
                      style={[styles.tile, selected && styles.tileSelected]}
                      testID={`filter-category-${id}`}>
                      <View style={styles.tileIcon}>
                        <CategoryGlyph category={CATEGORY_CATALOG[id]} size={22} color={colors.navy} />
                      </View>
                      <View style={styles.tileText}>
                        <Text style={[styles.tileName, selected && styles.tileNameSelected]} numberOfLines={1}>
                          {name}
                        </Text>
                        {count !== null ? <Text style={[styles.tileCount, selected && styles.tileCountSelected]}>{`${count} ilan`}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {kind !== 'estate' ? (
              <>
                <Card title="Marka">
                  <SelectField
                    label="Marka"
                    placeholder="Tüm markalar"
                    appearance="row"
                    leadingIcon="tag"
                    value={draft.specific.brand}
                    options={brandOptions}
                    onChange={(brand) => setSpecific({ brand })}
                    customInput={{ placeholder: 'Listede yoksa marka yazın' }}
                    clearLabel="Tüm markalar"
                    testID="filter-brand"
                  />
                </Card>
              </>
            ) : null}

            <Card title="Fiyat" aside={priceSummary(draft)} gap={14}>
              <PriceRangeSlider
                minText={draft.priceMinTl}
                maxText={draft.priceMaxTl}
                onChange={(end, tl) => {
                  const text = tl === null ? '' : formatInteger(tl);
                  setCommon(end === 'min' ? { priceMinTl: text } : { priceMaxTl: text }, 'price');
                }}
                testID="filter-price-slider"
              />
              <View style={styles.presets}>
                {PRICE_PRESETS.map((preset) => {
                  const selected = draft.priceMinTl === preset.min && draft.priceMaxTl === preset.max;
                  return (
                    <Pressable
                      key={preset.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setCommon(selected ? { priceMinTl: '', priceMaxTl: '' } : { priceMinTl: preset.min, priceMaxTl: preset.max }, 'price')}
                      style={[styles.preset, selected && styles.presetSelected]}
                      testID={`filter-price-preset-${preset.key}`}>
                      <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.rangeWrap}>
                <View style={styles.rangeRow}>
                  <PriceBox label="En az" value={draft.priceMinTl} onChangeText={(priceMinTl) => setCommon({ priceMinTl }, 'price')} invalid={!!errors.price} testID="filter-price-min" />
                  <PriceBox label="En fazla" value={draft.priceMaxTl} onChangeText={(priceMaxTl) => setCommon({ priceMaxTl }, 'price')} invalid={!!errors.price} testID="filter-price-max" />
                </View>
                {errors.price ? (
                  <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="filter-price-error">
                    {errors.price}
                  </Text>
                ) : null}
              </View>
            </Card>

            {kind !== 'estate' ? (
            <Card title="Model Yılı">
              <View style={styles.rangeWrap}>
                <View style={styles.rangeRow}>
                  <View style={styles.flex}>
                    <SelectField
                      label="Model yılı, en az"
                      title="Model yılı (en az)"
                      placeholder="En az"
                      value={draft.specific.modelYearMin}
                      options={MODEL_YEAR_OPTIONS}
                      onChange={(modelYearMin) => setSpecific({ modelYearMin }, 'modelYear')}
                      customInput={{ placeholder: 'Yıl yazın', numeric: true }}
                      clearLabel="Sınır yok"
                      invalid={!!errors.modelYear}
                      testID="filter-year-min"
                    />
                  </View>
                  <Text style={styles.dash}>–</Text>
                  <View style={styles.flex}>
                    <SelectField
                      label="Model yılı, en fazla"
                      title="Model yılı (en fazla)"
                      placeholder="En fazla"
                      value={draft.specific.modelYearMax}
                      options={MODEL_YEAR_OPTIONS}
                      onChange={(modelYearMax) => setSpecific({ modelYearMax }, 'modelYear')}
                      customInput={{ placeholder: 'Yıl yazın', numeric: true }}
                      clearLabel="Sınır yok"
                      invalid={!!errors.modelYear}
                      testID="filter-year-max"
                    />
                  </View>
                </View>
                {errors.modelYear ? (
                  <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="filter-year-error">
                    {errors.modelYear}
                  </Text>
                ) : null}
              </View>
            </Card>
            ) : null}

            {kind === 'vehicle' ? (
              <SpecificBox title={specificTitle(draft.categories, kind)}>
                <SubSection label="Kilometre">
                  <RangeRow
                    label="Kilometre"
                    minValue={draft.specific.odometerMin}
                    maxValue={draft.specific.odometerMax}
                    onMin={(odometerMin) => setSpecific({ odometerMin }, 'odometerKm')}
                    onMax={(odometerMax) => setSpecific({ odometerMax }, 'odometerKm')}
                    error={errors.odometerKm}
                    compact
                    testID="filter-odometer"
                  />
                </SubSection>
                {showsDriveConfigs(draft.categories) ? (
                  <SubSection label="Çekiş Tipi">
                    <View style={styles.chips}>
                      {DRIVE_CHIPS.map((value) => (
                        <Chip key={value} label={value} selected={draft.specific.driveConfigs.includes(value)} onPress={() => setSpecific({ driveConfigs: toggled(draft.specific.driveConfigs, value) })} testID={`filter-drive-${value}`} />
                      ))}
                    </View>
                  </SubSection>
                ) : null}
              </SpecificBox>
            ) : null}

            {kind === 'trailer' ? (
              <SpecificBox title={specificTitle(draft.categories, kind)}>
                <SubSection label="Aks Sayısı">
                  <View style={styles.chips}>
                    {AXLE_CHIPS.map(({ value, label }) => (
                      <Chip key={value} label={label} selected={draft.specific.axles.includes(value)} onPress={() => setSpecific({ axles: toggled(draft.specific.axles, value) })} testID={`filter-axles-${value}`} />
                    ))}
                  </View>
                </SubSection>
              </SpecificBox>
            ) : null}

            {kind === 'estate' ? (
              <SpecificBox title={specificTitle(draft.categories, kind)}>
                <SubSection label="Alan (m²)">
                  <RangeRow
                    label="Alan (m²)"
                    minValue={draft.specific.areaMin}
                    maxValue={draft.specific.areaMax}
                    onMin={(areaMin) => setSpecific({ areaMin }, 'areaM2')}
                    onMax={(areaMax) => setSpecific({ areaMax }, 'areaM2')}
                    error={errors.areaM2}
                    compact
                    testID="filter-area"
                  />
                </SubSection>
                {showsRooms(draft.categories) ? (
                  <SubSection label="Oda Sayısı">
                    <View style={styles.chips}>
                      {ROOM_CHIPS.map((value) => (
                        <Chip key={value} label={value} selected={draft.specific.rooms.includes(value)} onPress={() => setSpecific({ rooms: toggled(draft.specific.rooms, value) })} testID={`filter-rooms-${value}`} />
                      ))}
                    </View>
                  </SubSection>
                ) : null}
              </SpecificBox>
            ) : null}

            <Card title="İlan Durumu">
              <View style={styles.chips}>
                {STATUS_CHIPS.map(({ value, label }) => (
                  <Chip key={value} label={label} selected={draft.statuses.includes(value)} onPress={() => setCommon({ statuses: toggled(draft.statuses, value) })} testID={`filter-status-${value}`} />
                ))}
              </View>
            </Card>
          </FormScroll>

          <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
            <Btn label={liveCount === null ? 'Sonuçları Göster' : `${liveCount} ilanı göster`} icon="search" onPress={apply} testID="filters-apply" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const PRICE_PRESETS = [
  { key: 'u1', label: '1 Milyon altı', min: '', max: '1.000.000' },
  { key: '1-3', label: '1 – 3 Milyon', min: '1.000.000', max: '3.000.000' },
  { key: '3-5', label: '3 – 5 Milyon', min: '3.000.000', max: '5.000.000' },
  { key: '5p', label: '5 Milyon +', min: '5.000.000', max: '' },
] as const;

/** Fiyat kartı başlığındaki özet: hazır aralık adı, elle girilen aralık ya da "Tümü". */
function priceSummary(draft: FilterDraft): string {
  const preset = PRICE_PRESETS.find((item) => item.min === draft.priceMinTl && item.max === draft.priceMaxTl);
  if (preset) return preset.label;
  if (!draft.priceMinTl && !draft.priceMaxTl) return 'Tümü';
  if (draft.priceMinTl && draft.priceMaxTl) return `${draft.priceMinTl} – ${draft.priceMaxTl} TL`;
  return draft.priceMinTl ? `${draft.priceMinTl} TL+` : `${draft.priceMaxTl} TL'ye kadar`;
}

function Card({ title, aside, gap = 12, children }: { title: string; aside?: string; gap?: number; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { gap }]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        {aside ? <Text style={styles.cardAside}>{aside}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function PriceBox({ label, value, onChangeText, invalid, testID }: { label: string; value: string; onChangeText: (text: string) => void; invalid: boolean; testID: string }) {
  const onFocus = useScrollFocusedIntoView();
  return (
    <View style={[styles.priceBox, invalid && styles.inputInvalid]}>
      <Text style={styles.priceBoxLabel}>{label}</Text>
      <View style={styles.priceBoxRow}>
        <TextInput
          onFocus={onFocus}
          value={value}
          onChangeText={onChangeText}
          placeholder="—"
          placeholderTextColor={colors.slateFaint}
          accessibilityLabel={`Fiyat, ${label.toLocaleLowerCase('tr-TR')}${invalid ? ', hata' : ''}`}
          keyboardType="number-pad"
          style={styles.priceBoxInput}
          testID={testID}
        />
        <Text style={styles.priceBoxUnit}>TL</Text>
      </View>
    </View>
  );
}

function SpecificBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.specificBox} testID="filters-specific">
      <Text style={styles.specificTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.subSection}>
      <Text style={styles.subLabel}>{label}</Text>
      {children}
    </View>
  );
}

type TextBoxProps = { value: string; onChangeText: (text: string) => void; placeholder: string; label: string; numeric?: boolean; compact?: boolean; invalid?: boolean; testID: string };

function TextBox({ value, onChangeText, placeholder, label, numeric = false, compact = false, invalid = false, testID }: TextBoxProps) {
  const onFocus = useScrollFocusedIntoView();
  return (
    <TextInput
      onFocus={onFocus}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.slateFaint}
      accessibilityLabel={invalid ? `${label}, hata` : label}
      keyboardType={numeric ? 'number-pad' : 'default'}
      autoCorrect={false}
      autoCapitalize={numeric ? 'none' : 'words'}
      style={[styles.input, compact && styles.inputCompact, invalid && styles.inputInvalid]}
      testID={testID}
    />
  );
}

type RangeRowProps = {
  label: string;
  minValue: string;
  maxValue: string;
  onMin: (text: string) => void;
  onMax: (text: string) => void;
  error?: string;
  compact?: boolean;
  testID: string;
};

/** "En az – En fazla" sayı çifti (tasarım: iki alan arası "–"). Hata, çiftin altında tek ileti olarak gösterilir. */
function RangeRow({ label, minValue, maxValue, onMin, onMax, error, compact = false, testID }: RangeRowProps) {
  return (
    <View style={styles.rangeWrap}>
      <View style={styles.rangeRow}>
        <View style={styles.flex}>
          <TextBox value={minValue} onChangeText={onMin} placeholder="En az" label={`${label}, en az`} numeric compact={compact} invalid={!!error} testID={`${testID}-min`} />
        </View>
        <Text style={styles.dash}>–</Text>
        <View style={styles.flex}>
          <TextBox value={maxValue} onChangeText={onMax} placeholder="En fazla" label={`${label}, en fazla`} numeric compact={compact} invalid={!!error} testID={`${testID}-max`} />
        </View>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite" testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { flex: 1, marginTop: 12, backgroundColor: colors.white, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet },
  grabberRow: { alignItems: 'center', paddingTop: 8 },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.line },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  headerButton: { width: sizes.minTouchTarget, height: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...textStyles.titleSection, fontSize: 17, color: colors.navy },
  clearButton: { height: sizes.minTouchTarget, paddingHorizontal: 12, justifyContent: 'center' },
  clearLabel: { ...textStyles.button, color: colors.green },
  content: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, gap: 16, backgroundColor: colors.surface, flexGrow: 1 },
  card: { padding: 16, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontFamily: textStyles.titleSection.fontFamily, fontSize: 18, color: colors.navy },
  cardAside: { ...textStyles.bodySmall, color: colors.slateLight },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: colors.blueTint, borderWidth: 1.5, borderColor: colors.blueTint },
  tileSelected: { borderColor: colors.navy, backgroundColor: colors.white },
  tileIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileText: { flex: 1, gap: 2 },
  tileName: { fontFamily: textStyles.button.fontFamily, fontSize: 16, color: colors.navy },
  tileNameSelected: { color: colors.navy },
  tileCount: { ...textStyles.caption, fontSize: 13, color: colors.slate },
  tileCountSelected: { color: colors.green },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  preset: { width: '48.5%', height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  presetSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  presetText: { ...textStyles.button, fontSize: 15, color: colors.navy },
  presetTextSelected: { color: colors.greenPressed },
  priceBox: { flex: 1, minHeight: 64, borderRadius: 14, backgroundColor: colors.blueTint, paddingHorizontal: 14, paddingTop: 8, borderWidth: 1, borderColor: colors.blueTint },
  priceBoxLabel: { ...textStyles.caption, color: colors.slate },
  priceBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceBoxInput: { flex: 1, height: 34, paddingVertical: 0, color: colors.ink, ...textStyles.body, fontSize: 16, includeFontPadding: false },
  priceBoxUnit: { ...textStyles.bodySmall, color: colors.slate },
  sectionTitle: { ...textStyles.titleSection, fontSize: 14, color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specificBox: { gap: 12, padding: 14, borderRadius: radii.card, backgroundColor: colors.surface },
  specificTitle: { ...textStyles.badge, letterSpacing: 0.88, color: colors.slate },
  subSection: { gap: 8 },
  subLabel: { ...textStyles.label, color: colors.inkSoft },
  rangeWrap: { gap: 6 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash: { ...textStyles.body, color: colors.slateFaint },
  input: {
    minHeight: sizes.fieldHeight,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    color: colors.ink,
    ...textStyles.body,
    includeFontPadding: false,
  },
  inputCompact: { height: 48 },
  inputInvalid: { borderColor: colors.danger },
  error: { ...textStyles.caption, color: colors.danger },
  footer: { paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.lineSoft, backgroundColor: colors.white },
});
