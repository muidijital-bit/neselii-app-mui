import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppError,
  EMPTY_FILTERS,
  MAX_PACKAGE_LISTINGS,
  SECTORS,
  formatMoney,
  userMessage,
  type ListingSummary,
  type SectorId,
  type VehiclePackage,
} from '@/domain';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip, ToggleRow } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { NEW_PACKAGE, PACKAGES_HREF } from './routes';
import { usePackageMutations, usePackageQuery } from './usePackages';

/** Madde 45 (yönetici): paket oluştur / düzenle / sil. İlanlar arama ile (başlık, marka, ilan no) eklenir; en çok 10 ilan. */
export function PackageEditScreen() {
  const { packageId } = useLocalSearchParams<{ packageId?: string | string[] }>();
  const id = typeof packageId === 'string' ? packageId : '';
  const isNew = id === NEW_PACKAGE;
  const query = usePackageQuery(isNew ? '' : id);
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="package-edit-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={isNew ? 'Yeni Paket' : 'Paketi Düzenle'} testID="package-edit-back" right={<AdminBadge />} />
      {isNew ? <PackageForm initial={null} /> : query.isPending ? <StateView loading /> : query.data ? <PackageForm initial={query.data} /> : <StateView title="Paket bulunamadı" message={userMessage(query.error)} />}
    </KeyboardAvoidingView>
  );
}

function PackageForm({ initial }: { initial: VehiclePackage | null }) {
  const router = useRouter();
  const { listings: listingsService } = useServices();
  const { save, remove } = usePackageMutations();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sector, setSector] = useState<SectorId | null>(initial?.sector ?? null);
  const [published, setPublished] = useState(initial?.published ?? false);
  const [selected, setSelected] = useState<readonly ListingSummary[]>(initial?.listings ?? []);
  const [search, setSearch] = useState('');
  const errors = save.error instanceof AppError ? save.error.fieldErrors : undefined;

  const results = useQuery({
    queryKey: ['packages', 'listing-search', search.trim()],
    queryFn: () => listingsService.searchListings({ search: { query: search.trim(), filters: EMPTY_FILTERS, sort: 'newest' } }),
    enabled: search.trim().length >= 2,
  });
  const candidates = (results.data?.items ?? []).filter((l) => !selected.some((s) => s.id === l.id)).slice(0, 8);
  const full = selected.length >= MAX_PACKAGE_LISTINGS;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Paket adı" value={title} onChangeText={setTitle} maxLength={100} placeholder="Ör. Şantiye paketi" error={errors?.title} testID="package-title" />
      <TextField label="Açıklama (isteğe bağlı)" value={description} onChangeText={setDescription} multiline maxLength={1000} style={styles.multiline} testID="package-description" />
      <View style={styles.wrap}>
        <Chip label="Genel" selected={sector === null} onPress={() => setSector(null)} />
        {SECTORS.map((s) => (
          <Chip key={s.id} label={s.label} selected={sector === s.id} onPress={() => setSector(s.id)} />
        ))}
      </View>

      <Text variant="subheading">
        Araçlar ({selected.length}/{MAX_PACKAGE_LISTINGS})
      </Text>
      {selected.map((listing) => (
        <ListingRow key={listing.id} listing={listing} icon="x" iconColor="danger" onPress={() => setSelected((cur) => cur.filter((l) => l.id !== listing.id))} />
      ))}
      {errors?.listings ? (
        <Text variant="caption" color="danger">
          {errors.listings}
        </Text>
      ) : null}
      {!full ? (
        <>
          <TextField label="İlan ekle" value={search} onChangeText={setSearch} placeholder="Başlık, marka ya da ilan no" autoCapitalize="none" testID="package-search" />
          {candidates.map((listing) => (
            <ListingRow key={listing.id} listing={listing} icon="plus" iconColor="success" onPress={() => setSelected((cur) => [...cur, listing])} />
          ))}
        </>
      ) : null}

      <Card>
        <ToggleRow title="Yayında" subtitle="Kapalıyken taslaktır; müşteriler görmez." value={published} onChange={setPublished} />
      </Card>
      {save.isError && !errors ? (
        <Text variant="small" color="danger">
          {userMessage(save.error)}
        </Text>
      ) : null}
      <Button
        title="Kaydet"
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            { id: initial?.id ?? null, input: { title, description: description || null, sector, published, listingIds: selected.map((l) => l.id) } },
            { onSuccess: () => (router.canGoBack() ? router.back() : router.replace(PACKAGES_HREF)) },
          )
        }
        testID="package-save"
      />
      {initial ? (
        <Button
          title="Paketi Sil"
          icon="trash-2"
          variant="outline"
          loading={remove.isPending}
          onPress={() =>
            Alert.alert('Paket silinsin mi?', initial.title, [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(initial.id, { onSuccess: () => router.replace(PACKAGES_HREF) }) },
            ])
          }
        />
      ) : null}
    </ScrollView>
  );
}

function ListingRow({ listing, icon, iconColor, onPress }: { listing: ListingSummary; icon: 'x' | 'plus'; iconColor: 'danger' | 'success'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ListingImage uri={listing.coverImageUri} style={styles.thumb} iconSize={18} />
      <View style={styles.flex}>
        <Text variant="smallSemibold" numberOfLines={2}>
          {listing.title}
        </Text>
        <Text variant="caption">
          {formatMoney(listing.price)} · İlan no: {listing.listingNumber}
        </Text>
      </View>
      <Icon name={icon} size={20} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  multiline: { minHeight: 80, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pressed: { backgroundColor: Colors.background },
  thumb: { width: 64, height: 48, borderRadius: Radius.sm },
});
