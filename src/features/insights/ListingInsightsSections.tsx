import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  TRUST_CHECKS,
  formatInteger,
  formatTrDate,
  hasAnyCheck,
  hasExpertOpinion,
  hasHistory,
  trustScore,
  trustScoreLabel,
  type ListingInsights,
} from '@/domain';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { initials } from '@/ui/format';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { listingInsightsHref } from './routes';

/**
 * İlan detayındaki yönetici bilgileri (madde 11–13): Neşeli güven puanı, araç geçmişi ve uzman görüşü. Her bölüm yalnız veri girilmişse çizilir;
 * görünüm detayın diğer beyaz bölümleriyle aynıdır. Yöneticide ayrıca "düzenle" bölümü görünür.
 */
export function ListingInsightsSections({ listingId, insights, isAdmin }: { listingId: string; insights: ListingInsights | null; isAdmin: boolean }) {
  return (
    <>
      {insights && hasAnyCheck(insights) ? <TrustSection insights={insights} /> : null}
      {insights && hasHistory(insights) ? <HistorySection insights={insights} /> : null}
      {insights && hasExpertOpinion(insights) ? <ExpertSection insights={insights} /> : null}
      {isAdmin ? <AdminEditSection listingId={listingId} hasData={insights !== null} /> : null}
    </>
  );
}

function TrustSection({ insights }: { insights: ListingInsights }) {
  const score = trustScore(insights.checks);
  return (
    <View style={styles.section} testID="listing-trust">
      <Text variant="heading" accessibilityRole="header">
        Neşeli Güven Puanı
      </Text>
      <View style={styles.scoreRow} accessible accessibilityLabel={`Güven puanı ${score} / 100, ${trustScoreLabel(score)}`}>
        <View style={styles.scoreCircle}>
          <Text variant="title" style={styles.scoreText} testID="listing-trust-score">
            {score}
          </Text>
          <Text variant="caption" style={styles.scoreMax}>
            /100
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="subheading">{trustScoreLabel(score)}</Text>
          <Text variant="small">Firmamızın kontrol maddelerinden hesaplanır.</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${score}%` }]} />
          </View>
        </View>
      </View>
      {TRUST_CHECKS.map(({ key, label }) => {
        const met = insights.checks[key];
        return (
          <View key={key} style={styles.checkRow} testID={`listing-trust-${key}`}>
            <Icon name={met ? 'check-circle' : 'minus-circle'} size={20} color={met ? 'success' : 'textTertiary'} />
            <Text variant="body" color={met ? 'text' : 'textTertiary'} style={styles.flex}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function HistorySection({ insights }: { insights: ListingInsights }) {
  const service = [formatTrDate(insights.lastServiceDate), insights.lastServiceKm !== null ? `${formatInteger(insights.lastServiceKm)} km` : '']
    .filter(Boolean)
    .join(' · ');
  const rows = [
    insights.usageType ? { key: 'usage', label: 'Önceki kullanım', value: insights.usageType } : null,
    insights.ownerCount !== null ? { key: 'owners', label: 'Sahip sayısı', value: String(insights.ownerCount) } : null,
    service ? { key: 'service', label: 'Son bakım', value: service } : null,
  ].filter((row): row is { key: string; label: string; value: string } => row !== null);

  return (
    <View style={styles.section} testID="listing-history">
      <Text variant="heading" accessibilityRole="header">
        Araç Geçmişi
      </Text>
      {rows.map((row) => (
        <View key={row.key} style={styles.specRow} testID={`listing-history-${row.key}`}>
          <Text variant="body" color="textSecondary">
            {row.label}
          </Text>
          <Text variant="bodySemibold" style={styles.specValue}>
            {row.value}
          </Text>
        </View>
      ))}
      {insights.historyNote ? (
        <Text variant="body" style={styles.note} testID="listing-history-note">
          {insights.historyNote}
        </Text>
      ) : null}
    </View>
  );
}

function ExpertSection({ insights }: { insights: ListingInsights }) {
  const name = insights.expert?.fullName ?? 'Neşeli Otomotiv';
  return (
    <View style={styles.section} testID="listing-expert">
      <Text variant="heading" accessibilityRole="header">
        Uzman Görüşü
      </Text>
      <View style={styles.expertHead}>
        <View style={styles.avatar}>
          <Text variant="smallSemibold" style={styles.avatarText} maxFontSizeMultiplier={1.2}>
            {initials(name)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="bodySemibold">{name}</Text>
          <Text variant="small">Neşeli Otomotiv danışmanı</Text>
        </View>
      </View>
      {insights.strengths.length ? <ItemList title="Güçlü yönler" items={insights.strengths} tone="good" /> : null}
      {insights.cautions.length ? <ItemList title="Dikkat edilecekler" items={insights.cautions} tone="warn" /> : null}
    </View>
  );
}

function ItemList({ title, items, tone }: { title: string; items: readonly string[]; tone: 'good' | 'warn' }) {
  return (
    <View style={styles.list} testID={`listing-expert-${tone}`}>
      <Text variant="smallSemibold" color={tone === 'good' ? 'success' : 'warning'}>
        {title}
      </Text>
      {items.map((item, i) => (
        <View key={`${i}-${item}`} style={styles.item}>
          <Icon name={tone === 'good' ? 'check' : 'alert-triangle'} size={18} color={tone === 'good' ? 'success' : 'warning'} />
          <Text variant="body" style={styles.flex}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AdminEditSection({ listingId, hasData }: { listingId: string; hasData: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.section} testID="listing-insights-admin">
      <View style={styles.adminHead}>
        <Icon name="shield" size={18} color="heading" />
        <Text variant="subheading" style={styles.flex}>
          Yönetici: araç bilgileri
        </Text>
      </View>
      <Text variant="small">
        {hasData
          ? 'Teknik bilgiler, güven kontrolleri, araç geçmişi ve uzman görüşü müşteriye bu ilanda gösteriliyor.'
          : 'Teknik bilgiler (tonaj, motor gücü, kabin), güven kontrolleri, araç geçmişi ve uzman görüşünü buradan girin.'}
      </Text>
      <Button title={hasData ? 'Bilgileri Düzenle' : 'Bilgileri Gir'} icon="edit-2" variant="outline" onPress={() => router.push(listingInsightsHref(listingId))} testID="listing-insights-edit" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: Colors.surface, padding: Spacing.three, gap: Spacing.two, marginBottom: Spacing.two },
  flex: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginVertical: Spacing.one },
  scoreCircle: {
    width: 76,
    height: 76,
    borderRadius: Radius.pill,
    borderWidth: 4,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: Colors.success, lineHeight: 28 },
  scoreMax: { marginTop: -2 },
  bar: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.chip, marginTop: Spacing.two, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.green },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  specValue: { flexShrink: 1, textAlign: 'right' },
  note: { marginTop: Spacing.two },
  expertHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  avatar: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white },
  list: { gap: Spacing.one, marginTop: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  adminHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
