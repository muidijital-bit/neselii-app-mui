import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppError,
  DAMAGE_OPTIONS,
  TRADE_IN_CATEGORIES,
  TRADE_IN_SECTIONS,
  differenceInstallments,
  formatInteger,
  formatMoney,
  tradeDifference,
  userMessage,
  type KurusRange,
  type Lead,
  type TradeInDetail,
} from '@/domain';
import { useFinanceSettings } from '@/features/finance/useFinance';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Divider } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useSetValuation, useTradeInQuery } from './useTradeIns';

const tl = (kurus: number) => formatMoney({ amountKurus: kurus, currency: 'TRY' });
const rangeText = (r: KurusRange) => (r.minKurus === r.maxKurus ? tl(r.minKurus) : `${tl(r.minKurus)} – ${tl(r.maxKurus)}`);

/**
 * Talep detayında takas / satış bölümü (Adım 7): aracın bilgileri (madde 35), bölümlere göre fotoğraf-videolar (madde 36), ön değerlendirme
 * (madde 37; yönetici girer, müşteri görür) ve takasta seçilen ilanla takas farkı + farkın aylık taksiti (madde 38).
 */
export function TradeInLeadSection({ lead, isAdmin }: { lead: Lead; isAdmin: boolean }) {
  const query = useTradeInQuery(lead.id, true);
  if (query.isPending) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator color={Colors.navy} />
      </Card>
    );
  }
  if (!query.data) {
    return (
      <Card style={styles.card}>
        <Text variant="small">{query.isError ? userMessage(query.error) : 'Araç bilgisi bulunamadı.'}</Text>
      </Card>
    );
  }
  return (
    <>
      <VehicleCard detail={query.data} />
      <MediaCard detail={query.data} />
      <ValuationCard lead={lead} detail={query.data} isAdmin={isAdmin} />
    </>
  );
}

function VehicleCard({ detail }: { detail: TradeInDetail }) {
  const v = detail.vehicle;
  const rows = [
    ['Kategori', TRADE_IN_CATEGORIES.find((c) => c.id === v.category)?.label ?? ''],
    ['Marka / model', [v.brand, v.model].filter(Boolean).join(' ')],
    ['Model yılı', v.year ? String(v.year) : ''],
    ['Kilometre', v.km !== null ? `${formatInteger(v.km)} km` : ''],
    ['Hasar durumu', DAMAGE_OPTIONS.find((d) => d.id === v.damageStatus)?.label ?? ''],
    ['Beklenen fiyat', v.expectedPriceKurus !== null ? tl(v.expectedPriceKurus) : ''],
  ].filter(([, value]) => value);
  return (
    <Card style={styles.card}>
      <Text variant="subheading">Müşterinin aracı</Text>
      {rows.map(([label, value], i) => (
        <View key={label}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.row}>
            <Text variant="body" color="textSecondary" style={styles.flex}>
              {label}
            </Text>
            <Text variant="bodySemibold" style={styles.value}>
              {value}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

function MediaCard({ detail }: { detail: TradeInDetail }) {
  if (detail.media.length === 0) return null;
  return (
    <Card style={styles.card}>
      <Text variant="subheading">Fotoğraf ve videolar ({detail.media.length})</Text>
      {TRADE_IN_SECTIONS.map((section) => {
        const items = detail.media.filter((m) => m.section === section.id);
        if (items.length === 0) return null;
        return (
          <View key={section.id} style={styles.mediaGroup}>
            <Text variant="smallMedium" color="textSecondary">
              {section.label}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.kind === 'video' ? 'Videoyu aç' : 'Fotoğrafı aç'}
                  disabled={!item.uri}
                  onPress={() => item.uri && void Linking.openURL(item.uri).catch(() => undefined)}>
                  {item.kind === 'photo' ? (
                    <ListingImage uri={item.uri} style={styles.thumb} iconSize={20} />
                  ) : (
                    <View style={[styles.thumb, styles.video]}>
                      <Icon name="play" size={24} color="white" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })}
    </Card>
  );
}

const parseTl = (text: string) => {
  const value = text.replace(/\D/g, '');
  return value ? Number(value) : 0;
};
const group = (text: string) => {
  const value = parseTl(text);
  return value ? formatInteger(value) : '';
};

function ValuationCard({ lead, detail, isAdmin }: { lead: Lead; detail: TradeInDetail; isAdmin: boolean }) {
  const finance = useFinanceSettings();
  const setValuation = useSetValuation(lead.id);
  const current = detail.vehicle.valuation;
  const [min, setMin] = useState(current ? formatInteger(Math.round(current.minKurus / 100)) : '');
  const [max, setMax] = useState(current ? formatInteger(Math.round(current.maxKurus / 100)) : '');
  const fieldError = setValuation.error instanceof AppError ? setValuation.error.fieldErrors?.valuation : undefined;

  const difference = current && lead.listing && lead.topic === 'trade_in' ? tradeDifference(lead.listing.price.amountKurus, current) : null;
  const installments = difference && !difference.customerReceives && finance.data ? differenceInstallments(difference.range, finance.data) : null;

  return (
    <Card style={styles.card}>
      <Text variant="subheading">Ön değerlendirme</Text>
      {current ? (
        <View style={styles.result} testID="trade-in-valuation">
          <Text variant="small">Aracınız için tahmini değer aralığı</Text>
          <Text variant="price" style={styles.success}>
            {rangeText(current)}
          </Text>
        </View>
      ) : (
        <Text variant="small">{isAdmin ? 'Henüz değerlendirme girilmedi.' : 'Danışmanınız aracınızı inceliyor; değerlendirme hazır olunca bildirim alacaksınız.'}</Text>
      )}

      {difference ? (
        <View style={styles.difference} testID="trade-in-difference">
          <Text variant="smallMedium" color="textSecondary">
            Takas farkı · {lead.listing?.title}
          </Text>
          <Text variant="bodySemibold">
            {difference.customerReceives ? 'Size ödenecek: ' : 'Ödenecek fark: '}
            {rangeText(difference.range)}
          </Text>
          {installments ? (
            <Text variant="small">
              Farkın aylık taksiti ({installments.term} ay, peşinatsız): {rangeText(installments.range)}
            </Text>
          ) : null}
          <Text variant="caption">Kesin tutar ekspertiz sonrası netleşir.</Text>
        </View>
      ) : null}

      {isAdmin ? (
        <View style={styles.editor}>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label="En az (TL)" value={min} onChangeText={(t) => setMin(group(t))} keyboardType="number-pad" testID="valuation-min" />
            </View>
            <View style={styles.flex}>
              <TextField label="En çok (TL)" value={max} onChangeText={(t) => setMax(group(t))} keyboardType="number-pad" testID="valuation-max" />
            </View>
          </View>
          {fieldError || (setValuation.isError && !fieldError) ? (
            <Text variant="small" color="danger">
              {fieldError ?? userMessage(setValuation.error)}
            </Text>
          ) : null}
          <Button
            title={current ? 'Değerlendirmeyi Güncelle' : 'Değerlendirmeyi Gönder'}
            icon="send"
            disabled={!parseTl(min) || !parseTl(max)}
            loading={setValuation.isPending}
            onPress={() => setValuation.mutate({ minKurus: parseTl(min) * 100, maxKurus: parseTl(max) * 100 })}
            testID="valuation-save"
          />
          <Text variant="caption">Gönderince müşteriye “Aracınızın ön değerlendirmesi hazır” bildirimi gider.</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.two },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two, gap: Spacing.two },
  value: { flexShrink: 1, textAlign: 'right' },
  mediaGroup: { gap: Spacing.one },
  thumbs: { gap: Spacing.two },
  thumb: { width: 84, height: 84, borderRadius: Radius.sm },
  video: { backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  result: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  success: { color: Colors.success },
  difference: { backgroundColor: Colors.surfaceHighlight, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  editor: { gap: Spacing.two, marginTop: Spacing.one },
  pair: { flexDirection: 'row', gap: Spacing.three },
});
