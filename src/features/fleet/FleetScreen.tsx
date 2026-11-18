import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLEET_DATE_LABELS, formatInteger, nextDue, renewalDue, userMessage, type FleetVehicle } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Badge, Card } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { NEW_VEHICLE, fleetVehicleHref } from './routes';
import { useFleetQuery } from './useFleet';

/**
 * Filom (madde 48–50): müşterinin araçları; her satırda plaka, marka/model/yıl, km ve en yakın tarih rozeti (muayene / sigorta / bakım; 14 gün ve
 * altı turuncu, geçmişse kırmızı) ve yenileme zamanı geldiyse "Yenileme zamanı". Hatırlatmalar her sabah bildirim olarak gelir.
 */
export function FleetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useFleetQuery();
  const { refetch } = query;
  const { pulling, onRefresh } = usePullRefresh(refetch);
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Filo yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="fleet-error" />;
  } else {
    empty = (
      <StateMessage
        top
        icon="truck"
        title="Filonuza araç ekleyin"
        message="Muayene, sigorta ve bakım tarihlerini girin; zamanı yaklaşınca hatırlatalım. Aracınız yenileme yaşına gelince haber verelim."
        testID="fleet-empty"
      />
    );
  }

  return (
    <View style={styles.container} testID="fleet-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Filom" testID="fleet-back" />
      <FlatList
        style={styles.flex}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        data={query.data ?? []}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VehicleRow vehicle={item} onPress={() => router.push(fleetVehicleHref(item.id))} />}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="fleet-list"
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Button title="Araç Ekle" icon="plus" onPress={() => router.push(fleetVehicleHref(NEW_VEHICLE))} testID="fleet-add" />
      </View>
    </View>
  );
}

function VehicleRow({ vehicle, onPress }: { vehicle: FleetVehicle; onPress: () => void }) {
  const due = nextDue(vehicle);
  const renewal = renewalDue(vehicle);
  const dueTone = due && due.days < 0 ? 'danger' : due && due.days <= 14 ? 'warning' : 'neutral';
  const dueText = due ? (due.days < 0 ? `${FLEET_DATE_LABELS[due.kind]} geçti` : due.days === 0 ? `${FLEET_DATE_LABELS[due.kind]} bugün` : `${FLEET_DATE_LABELS[due.kind]} ${due.days} gün`) : null;
  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} testID={`fleet-vehicle-${vehicle.id}`}>
        <View style={styles.plate}>
          <Text variant="smallSemibold" style={styles.plateText} numberOfLines={1}>
            {vehicle.plate}
          </Text>
        </View>
        <View style={styles.text}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Araç'}
          </Text>
          <Text variant="small">{[vehicle.year ? String(vehicle.year) : null, vehicle.km !== null ? `${formatInteger(vehicle.km)} km` : null].filter(Boolean).join(' · ') || '—'}</Text>
          <View style={styles.badges}>
            {dueText ? <Badge label={dueText} tone={dueTone} /> : null}
            {renewal ? <Badge label="Yenileme zamanı" tone="info" /> : null}
          </View>
        </View>
        <Icon name="chevron-right" size={22} color="textTertiary" />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
  plate: { borderWidth: 2, borderColor: Colors.heading, borderRadius: Radius.sm, paddingHorizontal: Spacing.two, paddingVertical: 4, maxWidth: 110 },
  plateText: { color: Colors.heading, letterSpacing: 0.5 },
  text: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
