import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  CAB_TYPES,
  CAB_TYPE_LABELS,
  EMPTY_TRUST_CHECKS,
  TRUST_CHECKS,
  USAGE_TYPES,
  asAdvisorId,
  asListingId,
  formatTrDate,
  linesToItems,
  parseTrDate,
  trustScore,
  userMessage,
  type CabType,
  type LocalFile,
  type ListingDetail,
  type ListingInsightsInput,
  type TrustChecks,
} from '@/domain';
import { useAdvisorsQuery } from '@/features/advisors/useAdvisors';
import { ListingVideosEditor } from './ListingVideosEditor';
import { useListingQuery } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { OptionSheet } from '@/ui/OptionSheet';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip, Divider, ToggleRow } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül yalnız PDF seçilirken yüklenir
const documentPicker = () => require('expo-document-picker') as typeof import('expo-document-picker');

/**
 * Yönetici: ilanın teknik bilgileri (madde 3, yalnız araçlarda), güven kontrolleri (madde 12), araç geçmişi (madde 11) ve uzman görüşü (madde 13). Kaydedince ilan detayı yenilenir ve
 * müşteriler yeni bilgileri görür. Güçlü yönler / dikkat edilecekler her satıra bir madde yazılır.
 */
export function ListingInsightsEditScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string | string[] }>();
  const id = typeof listingId === 'string' ? listingId.trim() : '';
  const listing = useListingQuery(id);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="insights-edit-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Araç Bilgileri" subtitle={listing.data?.title} testID="insights-edit-back" right={<AdminBadge />} />
      {listing.isPending ? (
        <StateView loading />
      ) : listing.data ? (
        <InsightsForm listing={listing.data} />
      ) : (
        <StateView title="İlan yüklenemedi" message={userMessage(listing.error)} actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void listing.refetch() }]} />
      )}
    </KeyboardAvoidingView>
  );
}

const toNumber = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

function InsightsForm({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const { listings } = useServices();
  const queryClient = useQueryClient();
  const advisors = useAdvisorsQuery();
  const initial = listing.insights;
  const vehicle = listing.specs.group === 'vehicle' ? listing.specs : null;
  const [tonnage, setTonnage] = useState(vehicle?.tonnage !== undefined ? String(vehicle.tonnage) : '');
  const [power, setPower] = useState(vehicle?.enginePowerHp !== undefined ? String(vehicle.enginePowerHp) : '');
  const [cabType, setCabType] = useState<CabType | null>(vehicle?.cabType ?? null);
  const [chassis, setChassis] = useState(vehicle?.chassis ?? '');
  const [bodyBuilder, setBodyBuilder] = useState(vehicle?.bodyBuilder ?? '');

  const [checks, setChecks] = useState<TrustChecks>(initial?.checks ?? EMPTY_TRUST_CHECKS);
  const [usageType, setUsageType] = useState(initial?.usageType ?? '');
  const [ownerCount, setOwnerCount] = useState(initial?.ownerCount != null ? String(initial.ownerCount) : '');
  const [serviceDate, setServiceDate] = useState(formatTrDate(initial?.lastServiceDate ?? null));
  const [serviceKm, setServiceKm] = useState(initial?.lastServiceKm != null ? String(initial.lastServiceKm) : '');
  const [historyNote, setHistoryNote] = useState(initial?.historyNote ?? '');
  const [expertId, setExpertId] = useState<string | null>(initial?.expert?.id ?? null);
  const [strengths, setStrengths] = useState((initial?.strengths ?? []).join('\n'));
  const [cautions, setCautions] = useState((initial?.cautions ?? []).join('\n'));
  // Madde 9: sağlık kartı; madde 10: ekspertiz raporu PDF'i.
  const [expertiseSummary, setExpertiseSummary] = useState(initial?.health.expertiseSummary ?? '');
  const [mechanical, setMechanical] = useState(initial?.health.mechanicalCondition ?? '');
  const [tire, setTire] = useState(initial?.health.tirePercent != null ? String(initial.health.tirePercent) : '');
  const [inspection, setInspection] = useState(formatTrDate(initial?.health.inspectionValidUntil ?? null));
  const [defects, setDefects] = useState((initial?.health.knownDefects ?? []).join('\n'));
  const [reportPath, setReportPath] = useState<string | null>(initial?.expertiseReportPath ?? null);
  const [reportFile, setReportFile] = useState<LocalFile | null>(null);
  const [inspectionError, setInspectionError] = useState<string | undefined>();

  const pickReport = async () => {
    const result = await documentPicker().getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if ((asset.size ?? 0) > 20 * 1024 * 1024) {
      setFailure('PDF en fazla 20 MB olabilir.');
      return;
    }
    setReportFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf' });
  };
  const [pickExpert, setPickExpert] = useState(false);
  const [dateError, setDateError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const score = trustScore(checks);
  const expertName = advisors.data?.find((a) => a.id === expertId)?.fullName ?? initial?.expert?.fullName ?? null;

  const save = async () => {
    const parsedDate = serviceDate.trim() ? parseTrDate(serviceDate) : null;
    if (serviceDate.trim() && !parsedDate) {
      setDateError('Tarihi GG.AA.YYYY biçiminde girin.');
      return;
    }
    const inspectionDate = inspection.trim() ? parseTrDate(inspection) : null;
    if (inspection.trim() && !inspectionDate) {
      setInspectionError('Tarihi GG.AA.YYYY biçiminde girin.');
      return;
    }
    setInspectionError(undefined);
    setDateError(undefined);
    setFailure(null);
    setSaving(true);
    const input: ListingInsightsInput = {
      usageType: usageType.trim() || null,
      ownerCount: toNumber(ownerCount),
      lastServiceDate: parsedDate,
      lastServiceKm: toNumber(serviceKm),
      historyNote: historyNote.trim() || null,
      checks,
      expertId: expertId ? asAdvisorId(expertId) : null,
      strengths: linesToItems(strengths),
      cautions: linesToItems(cautions),
      health: {
        expertiseSummary: expertiseSummary.trim() || null,
        mechanicalCondition: mechanical.trim() || null,
        tirePercent: toNumber(tire),
        inspectionValidUntil: inspectionDate,
        knownDefects: linesToItems(defects),
      },
      expertiseReportPath: reportPath,
    };
    try {
      if (vehicle) {
        await listings.saveSpecs(asListingId(listing.id), {
          tonnage: toNumber(tonnage) ?? undefined,
          enginePowerHp: toNumber(power) ?? undefined,
          cabType: cabType ?? undefined,
          chassis,
          bodyBuilder,
        });
      }
      const uploadedPath = reportFile ? await listings.uploadListingDocument(asListingId(listing.id), reportFile) : null;
      await listings.saveInsights(asListingId(listing.id), uploadedPath ? { ...input, expertiseReportPath: uploadedPath } : input);
      // Yalnız bu ilanın detay önbelleği yenilenir (anahtar: ['listings', userId, 'detail', listingId]).
      await queryClient.invalidateQueries({ queryKey: ['listings'], predicate: (q) => q.queryKey[2] === 'detail' && q.queryKey[3] === listing.id });
      router.back();
    } catch (error) {
      setFailure(userMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {vehicle ? (
        <View style={styles.group}>
          <Text variant="subheading">Teknik bilgiler</Text>
          <Text variant="small">Ticari araç filtrelerinde (tonaj, motor gücü, kabin) ve ilanın özellikler tablosunda kullanılır.</Text>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label="Tonaj (ton)" value={tonnage} onChangeText={setTonnage} keyboardType="number-pad" placeholder="Ör. 26" testID="insights-tonnage" />
            </View>
            <View style={styles.flex}>
              <TextField label="Motor gücü (HP)" value={power} onChangeText={setPower} keyboardType="number-pad" placeholder="Ör. 480" testID="insights-power" />
            </View>
          </View>
          <Text variant="smallMedium" color="textSecondary">
            Kabin tipi
          </Text>
          <View style={styles.wrap}>
            {CAB_TYPES.map((type) => (
              <Chip key={type} label={CAB_TYPE_LABELS[type]} selected={cabType === type} onPress={() => setCabType(cabType === type ? null : type)} />
            ))}
          </View>
          <TextField label="Şasi" value={chassis} onChangeText={setChassis} placeholder="Ör. Uzun şasi, 7,2 m" maxLength={120} testID="insights-chassis" />
          <TextField label="Üstyapı" value={bodyBuilder} onChangeText={setBodyBuilder} placeholder="Ör. Hidrolik damper, Hardox kasa" maxLength={120} testID="insights-body-builder" />
        </View>
      ) : null}

      {/* Madde 7: bölüm etiketli videolar (hemen yüklenir; Kaydet'ten bağımsız). */}
      <ListingVideosEditor listing={listing} />

      <View style={styles.group}>
        <View style={styles.titleRow}>
          <Text variant="subheading" style={styles.flex}>
            Güven kontrolleri
          </Text>
          <Text variant="bodySemibold" color="success" testID="insights-score">
            Puan: {score}/100
          </Text>
        </View>
        <Card>
          {TRUST_CHECKS.map(({ key, label }, i) => (
            <View key={key}>
              {i > 0 ? <Divider inset={Spacing.four} /> : null}
              <ToggleRow title={label} value={checks[key]} onChange={(value) => setChecks((current) => ({ ...current, [key]: value }))} />
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.group}>
        <Text variant="subheading">Araç geçmişi</Text>
        <Text variant="smallMedium" color="textSecondary">
          Önceki kullanım
        </Text>
        <View style={styles.wrap}>
          {USAGE_TYPES.map((type) => (
            <Chip key={type} label={type} selected={usageType === type} onPress={() => setUsageType(usageType === type ? '' : type)} />
          ))}
        </View>
        <TextField value={usageType} onChangeText={setUsageType} placeholder="Ya da kendiniz yazın" maxLength={60} testID="insights-usage" />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label="Sahip sayısı" value={ownerCount} onChangeText={setOwnerCount} keyboardType="number-pad" placeholder="Ör. 1" testID="insights-owners" />
          </View>
          <View style={styles.flex}>
            <TextField label="Son bakım km" value={serviceKm} onChangeText={setServiceKm} keyboardType="number-pad" placeholder="Ör. 480000" testID="insights-service-km" />
          </View>
        </View>
        <TextField
          label="Son bakım tarihi"
          value={serviceDate}
          onChangeText={(text) => {
            setServiceDate(text);
            if (dateError) setDateError(undefined);
          }}
          keyboardType="numbers-and-punctuation"
          placeholder="GG.AA.YYYY"
          error={dateError}
          testID="insights-service-date"
        />
        <TextField
          label="Not (isteğe bağlı)"
          value={historyNote}
          onChangeText={setHistoryNote}
          placeholder="Ör. Tek firmada kullanıldı, bakımları yetkili serviste yapıldı."
          multiline
          maxLength={1000}
          style={styles.multiline}
          testID="insights-history-note"
        />
      </View>

      <View style={styles.group}>
        <Text variant="subheading">Araç sağlık kartı</Text>
        <TextField
          label="Ekspertiz özeti"
          value={expertiseSummary}
          onChangeText={setExpertiseSummary}
          placeholder="Ör. Şasi ve motor temiz, sol kapı boyalı."
          multiline
          maxLength={500}
          style={styles.multiline}
          testID="insights-expertise-summary"
        />
        <TextField label="Mekanik durum" value={mechanical} onChangeText={setMechanical} placeholder="Ör. Motor, şanzıman ve diferansiyel sorunsuz" maxLength={300} testID="insights-mechanical" />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label="Lastik durumu (%)" value={tire} onChangeText={setTire} keyboardType="number-pad" placeholder="Ör. 70" testID="insights-tire" />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Muayene geçerlilik"
              value={inspection}
              onChangeText={(t) => {
                setInspection(t);
                if (inspectionError) setInspectionError(undefined);
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="GG.AA.YYYY"
              error={inspectionError}
              testID="insights-inspection"
            />
          </View>
        </View>
        <TextField
          label="Bilinen kusurlar (her satıra bir madde)"
          value={defects}
          onChangeText={setDefects}
          placeholder={'Ör.\nKlima gazı azalmış'}
          multiline
          style={styles.multiline}
          testID="insights-defects"
        />
        <Text variant="smallMedium" color="textSecondary">
          Ekspertiz raporu (PDF)
        </Text>
        <Card>
          <View style={styles.pickRow}>
            <Icon name="file-text" size={20} color="textSecondary" />
            <Text variant="body" numberOfLines={1} style={styles.flex}>
              {reportFile ? reportFile.name : reportPath ? 'Rapor yüklü' : 'Rapor yüklenmedi'}
            </Text>
            {reportFile || reportPath ? (
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                onPress={() => {
                  setReportFile(null);
                  setReportPath(null);
                }}
                testID="insights-report-remove">
                <Text variant="smallSemibold" color="danger">
                  Kaldır
                </Text>
              </Pressable>
            ) : null}
            <Pressable hitSlop={8} accessibilityRole="button" onPress={() => void pickReport()} testID="insights-report-pick">
              <Text variant="smallSemibold" color="green">
                {reportFile || reportPath ? 'Değiştir' : 'PDF Seç'}
              </Text>
            </Pressable>
          </View>
        </Card>
      </View>

      <View style={styles.group}>
        <Text variant="subheading">Uzman görüşü</Text>
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Uzman: ${expertName ?? 'seçilmedi'}, değiştir`}
            onPress={() => setPickExpert(true)}
            style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}
            testID="insights-expert">
            <Icon name="user" size={20} color="textSecondary" />
            <Text variant="body" color="textSecondary" style={styles.flex}>
              Uzman (danışman)
            </Text>
            <Text variant="bodySemibold">{expertName ?? 'Seçin'}</Text>
            <Icon name="chevron-right" size={20} color="textTertiary" />
          </Pressable>
        </Card>
        <TextField
          label="Güçlü yönler (her satıra bir madde)"
          value={strengths}
          onChangeText={setStrengths}
          placeholder={'Ör.\nTek sahibinden, bakımlı\nLastikler yeni'}
          multiline
          style={styles.multiline}
          testID="insights-strengths"
        />
        <TextField
          label="Dikkat edilecekler (her satıra bir madde)"
          value={cautions}
          onChangeText={setCautions}
          placeholder={'Ör.\nKasa boyası yenilenmeli'}
          multiline
          style={styles.multiline}
          testID="insights-cautions"
        />
      </View>

      {failure ? (
        <Text variant="small" color="danger" accessibilityRole="alert" testID="insights-error">
          {failure}
        </Text>
      ) : null}
      <Button title="Kaydet" loading={saving} onPress={() => void save()} testID="insights-save" />

      <OptionSheet
        visible={pickExpert}
        title="Uzman seçin"
        options={(advisors.data ?? []).map((advisor) => ({ value: advisor.id as string, label: advisor.fullName }))}
        selected={expertId}
        clearLabel="Uzman yok"
        onSelect={setExpertId}
        onClose={() => setPickExpert(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  group: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.three },
  multiline: { minHeight: 96, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
});
