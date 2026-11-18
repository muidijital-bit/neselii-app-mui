import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LOAD_CLASSES,
  SECTORS,
  finderSearch,
  formatInteger,
  formatMoney,
  maxPriceForBudget,
  sectorById,
  type FinderAnswers,
  type LoadClass,
  type SectorId,
} from '@/domain';
import { useFinanceSettings } from '@/features/finance/useFinance';
import { resultsHref } from '@/features/listings/routes';
import { useListingCountQuery } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useSector } from './SectorProvider';

const STEPS = 4;
type BudgetMode = 'any' | 'cash' | 'credit';

const parseTl = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};
const formatInput = (text: string) => {
  const value = parseTl(text);
  return value > 0 ? formatInteger(value) : '';
};

/**
 * Akıllı araç bulucu (madde 2): 1) kullanım amacı (sektör), 2) yük, 3) bütçe (peşin toplam ya da aylık ödeme + peşinat), 4) özet ve sonuçlar.
 * Cevaplar normal aramaya çevrilir (kategori, alt tür, en yüksek fiyat); sonuç ekranında filtreler çip olarak görünür ve değiştirilebilir.
 */
export function FinderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sector: savedSector, setSector } = useSector();
  const finance = useFinanceSettings();
  const [step, setStep] = useState(0);
  const [sector, setLocalSector] = useState<SectorId | null>(savedSector);
  const [load, setLoad] = useState<LoadClass | null>(null);
  const [mode, setMode] = useState<BudgetMode>('any');
  const [cash, setCash] = useState('');
  const [monthly, setMonthly] = useState('');
  const [down, setDown] = useState('');

  const term = finance.data?.terms.length ? Math.max(...finance.data.terms) : 36;
  const maxPriceTl =
    mode === 'cash'
      ? parseTl(cash) || null
      : mode === 'credit' && finance.data
        ? Math.floor(maxPriceForBudget(parseTl(monthly) * 100, parseTl(down) * 100, term, finance.data) / 100) || null
        : null;
  const answers: FinderAnswers = { sector, load: load ?? 'medium', maxPriceTl };
  const search = finderSearch(answers);
  const withoutBudget = finderSearch({ ...answers, maxPriceTl: null });
  const count = useListingCountQuery(step === STEPS - 1 ? search : null);

  const canNext = step === 1 ? load !== null : step === 2 ? mode === 'any' || maxPriceTl !== null : true;
  const next = () => {
    if (step === 0 && sector) setSector(sector);
    setStep((current) => Math.min(STEPS - 1, current + 1));
  };
  const back = () => (step === 0 ? (router.canGoBack() ? router.back() : router.replace('/')) : setStep(step - 1));

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="finder-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Araç Bulucu" subtitle={`Adım ${step + 1} / ${STEPS}`} testID="finder-back">
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS) * 100}%` }]} />
        </View>
      </PageHeader>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Text variant="title">Aracı hangi iş için kullanacaksınız?</Text>
            {SECTORS.map((option) => (
              <OptionRow
                key={option.id}
                icon={option.icon as IconName}
                title={option.label}
                subtitle={option.description}
                selected={sector === option.id}
                onPress={() => setLocalSector(option.id)}
                testID={`finder-sector-${option.id}`}
              />
            ))}
            <OptionRow icon="help-circle" title="Diğer / emin değilim" selected={sector === null} onPress={() => setLocalSector(null)} testID="finder-sector-none" />
          </>
        ) : step === 1 ? (
          <>
            <Text variant="title">Ne kadar yük taşıyacaksınız?</Text>
            {LOAD_CLASSES.map((option) => (
              <OptionRow
                key={option.id}
                icon={option.icon as IconName}
                title={option.label}
                subtitle={option.description}
                selected={load === option.id}
                onPress={() => setLoad(option.id)}
                testID={`finder-load-${option.id}`}
              />
            ))}
          </>
        ) : step === 2 ? (
          <>
            <Text variant="title">Bütçeniz nedir?</Text>
            <View style={styles.wrap}>
              <Chip label="Fark etmez" selected={mode === 'any'} onPress={() => setMode('any')} />
              <Chip label="Peşin alacağım" selected={mode === 'cash'} onPress={() => setMode('cash')} />
              <Chip label="Kredili / taksitli" selected={mode === 'credit'} onPress={() => setMode('credit')} />
            </View>
            {mode === 'cash' ? (
              <TextField label="Toplam bütçe (TL)" value={cash} onChangeText={(t) => setCash(formatInput(t))} keyboardType="number-pad" placeholder="Ör. 2.500.000" testID="finder-cash" />
            ) : null}
            {mode === 'credit' ? (
              <>
                <TextField label="Aylık ödeyebileceğim (TL)" value={monthly} onChangeText={(t) => setMonthly(formatInput(t))} keyboardType="number-pad" placeholder="Ör. 100.000" testID="finder-monthly" />
                <TextField
                  label="Peşinat (TL)"
                  value={down}
                  onChangeText={(t) => setDown(formatInput(t))}
                  keyboardType="number-pad"
                  placeholder="Ör. 750.000"
                  helper={finance.data ? `${term} ay vade, aylık %${String(finance.data.monthlyRatePercent).replace('.', ',')} faizle hesaplanır.` : undefined}
                  testID="finder-down"
                />
              </>
            ) : null}
            {mode !== 'any' && maxPriceTl ? (
              <View style={styles.result}>
                <Text variant="small">En yüksek araç fiyatı</Text>
                <Text variant="price" style={styles.resultPrice} testID="finder-max-price">
                  {formatMoney({ amountKurus: maxPriceTl * 100, currency: 'TRY' })}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="title">Size uygun araçlar</Text>
            <View style={styles.summary}>
              <SummaryRow label="Kullanım" value={sector ? sectorById(sector).label : 'Belirtilmedi'} />
              <SummaryRow label="Yük" value={LOAD_CLASSES.find((l) => l.id === load)?.label ?? '—'} />
              <SummaryRow label="Bütçe" value={maxPriceTl ? `En fazla ${formatMoney({ amountKurus: maxPriceTl * 100, currency: 'TRY' })}` : 'Sınır yok'} />
            </View>
            <Text variant="small">Sonuç ekranında filtreleri değiştirebilir, aramayı kaydedebilirsiniz.</Text>
            {count.data === 0 && maxPriceTl ? (
              <View style={styles.empty} testID="finder-no-results">
                <Icon name="info" size={18} color="warning" />
                <Text variant="small" style={styles.flex}>
                  Bu bütçede uygun ilan yok. Bütçe sınırı olmadan bakabilir ya da danışmanımızdan yardım isteyebilirsiniz.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Button title={step === 0 ? 'Vazgeç' : 'Geri'} variant="outline" onPress={back} style={styles.footerButton} testID="finder-prev" />
        {step < STEPS - 1 ? (
          <Button title="Devam" icon="arrow-right" disabled={!canNext} onPress={next} style={styles.footerWide} testID="finder-next" />
        ) : count.data === 0 && maxPriceTl ? (
          <Button title="Bütçesiz göster" icon="search" onPress={() => router.push(resultsHref(withoutBudget))} style={styles.footerWide} testID="finder-results-unbounded" />
        ) : (
          <Button
            title={count.data === undefined ? 'İlanları göster' : `${count.data} ilanı göster`}
            icon="search"
            loading={count.isPending && count.fetchStatus === 'fetching'}
            onPress={() => router.push(resultsHref(search))}
            style={styles.footerWide}
            testID="finder-results"
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function OptionRow({ icon, title, subtitle, selected, onPress, testID }: { icon: IconName; title: string; subtitle?: string; selected: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
      testID={testID}>
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Icon name={icon} size={22} color={selected ? 'white' : 'heading'} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodySemibold">{title}</Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      <Icon name={selected ? 'check-circle' : 'circle'} size={22} color={selected ? 'success' : 'textTertiary'} />
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant="body" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodySemibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  progress: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.chip, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.green },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionSelected: { borderColor: Colors.green },
  optionIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  optionIconSelected: { backgroundColor: Colors.navy },
  pressed: { opacity: 0.85 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  result: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  resultPrice: { color: Colors.success },
  summary: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.three },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  empty: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Colors.warningSoft },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerButton: { flex: 1 },
  footerWide: { flex: 2 },
});
