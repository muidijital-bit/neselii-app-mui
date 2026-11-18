import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EMPTY_FILTER_DRAFT, buildSearch, formatInteger, formatMoney, formatRatePercent, maxPriceForBudget, type ListingSearch } from '@/domain';
import { useListingCountQuery } from '@/features/listings/useListingsQueries';
import { resultsHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useFinanceSettings } from './useFinance';

/** Yazılan tutardan rakamları alır: "150.000" → 150000 (TL). */
const parseTl = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

/** Yazarken binlik ayraç: "150000" → "150.000". */
const formatInput = (text: string) => {
  const value = parseTl(text);
  return value > 0 ? formatInteger(value) : '';
};

/**
 * "Bütçeme göre araç bul": aylık ödenebilecek tutar, peşinat ve vade girilir; firmanın faiz oranı ve en düşük peşinat oranıyla alınabilecek
 * en yüksek fiyat hesaplanır ve bu fiyata kadar olan ilanlar listelenir.
 */
export function BudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useFinanceSettings();
  const [monthly, setMonthly] = useState('');
  const [down, setDown] = useState('');
  const [term, setTerm] = useState<number | null>(null);

  const terms = settings.data?.terms ?? [];
  const selectedTerm = term !== null && terms.includes(term) ? term : (terms[terms.length - 1] ?? 12);
  const maxPriceKurus = settings.data ? maxPriceForBudget(parseTl(monthly) * 100, parseTl(down) * 100, selectedTerm, settings.data) : 0;
  const maxPriceTl = Math.floor(maxPriceKurus / 100);

  const search = useMemo((): ListingSearch | null => {
    if (maxPriceTl <= 0) return null;
    const built = buildSearch({ ...EMPTY_FILTER_DRAFT, priceMaxTl: String(maxPriceTl) });
    return built.ok ? built.search : null;
  }, [maxPriceTl]);
  const count = useListingCountQuery(search);

  if (settings.isPending) {
    return (
      <View style={styles.container}>
        <PageHeader title="Bütçeme Göre Bul" testID="budget-back" />
        <StateView loading />
      </View>
    );
  }
  if (!settings.data) {
    return (
      <View style={styles.container}>
        <PageHeader title="Bütçeme Göre Bul" testID="budget-back" />
        <StateView title="Hesaplama yüklenemedi" actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void settings.refetch() }]} />
      </View>
    );
  }

  const minDown = settings.data.minDownPaymentPercent;
  const buttonTitle = search === null ? 'Bütçenizi girin' : count.data === undefined ? 'İlanları göster' : `${count.data} ilanı göster`;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="budget-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Bütçeme Göre Bul" testID="budget-back" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="body" color="textSecondary">
          Aylık ödeyebileceğiniz tutarı ve peşinatınızı girin; bütçenize uygun araçları listeleyelim.
        </Text>
        <TextField
          label="Aylık ödeyebileceğim tutar (TL)"
          value={monthly}
          onChangeText={(text) => setMonthly(formatInput(text))}
          keyboardType="number-pad"
          placeholder="Ör. 100.000"
          testID="budget-monthly"
        />
        <TextField
          label="Peşinat (TL)"
          value={down}
          onChangeText={(text) => setDown(formatInput(text))}
          keyboardType="number-pad"
          placeholder="Ör. 750.000"
          helper={minDown > 0 ? `Peşinat, araç fiyatının en az %${minDown}'i olmalıdır.` : undefined}
          testID="budget-down"
        />
        <View style={styles.group}>
          <Text variant="smallMedium" color="textSecondary">
            Vade
          </Text>
          <View style={styles.wrap}>
            {terms.map((months) => (
              <Chip key={months} label={`${months} ay`} selected={months === selectedTerm} onPress={() => setTerm(months)} />
            ))}
          </View>
        </View>
        <View style={styles.result} testID="budget-result">
          <Text variant="small">Alabileceğiniz en yüksek araç fiyatı</Text>
          <Text variant="priceLarge" style={styles.resultPrice} testID="budget-max-price">
            {maxPriceKurus > 0 ? formatMoney({ amountKurus: maxPriceTl * 100, currency: 'TRY' }) : '—'}
          </Text>
          <Text variant="caption">
            Aylık {formatRatePercent(settings.data.monthlyRatePercent)} faiz, {selectedTerm} ay vade ile tahmini hesaplamadır.
          </Text>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Button
          title={buttonTitle}
          icon="search"
          disabled={search === null || count.data === 0}
          loading={search !== null && count.isFetching && count.data === undefined}
          onPress={() => search && router.push(resultsHref(search))}
          testID="budget-show-results"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  result: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  resultPrice: { color: Colors.success },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
