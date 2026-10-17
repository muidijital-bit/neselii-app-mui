import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { OptionSheet } from '@/components/option-sheet';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Card, Chip } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  useDeleteListing,
  useDeleteMedia,
  useSaveListing,
  useSwapMedia,
  useUploadMedia,
  type ListingInput,
} from '@/features/admin/api';
import { useCategories, useListing, type ListingDetail } from '@/features/listings/api';
import { formatNumber, statusLabels } from '@/lib/format';
import type { ListingStatus } from '@/types/database';

const STATUSES: ListingStatus[] = ['draft', 'published', 'reserved', 'sold', 'unpublished'];
const MAX_PHOTOS = 30;

const toText = (n: number | null | undefined) => (n == null ? '' : String(n));
const toNumber = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

export default function ListingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listing = useListing(id);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title={id ? 'İlanı Düzenle' : 'Yeni İlan'} subtitle={listing.data ? `İlan no: ${listing.data.listing_no}` : undefined} />
      {id && listing.isLoading ? (
        <StateView loading />
      ) : id && !listing.data ? (
        <StateView icon="alert-circle" title="İlan bulunamadı" />
      ) : (
        // id değişince (ilk kayıttan sonra) form yeniden kurulur
        <ListingForm key={id ?? 'new'} id={id} initial={listing.data} />
      )}
    </KeyboardAvoidingView>
  );
}

function ListingForm({ id, initial }: { id?: string; initial?: ListingDetail }) {
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const save = useSaveListing();
  const remove = useDeleteListing();

  const [category, setCategory] = useState(initial?.category_slug ?? '');
  const [subtype, setSubtype] = useState(initial?.subtype ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(toText(initial?.price));
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [year, setYear] = useState(toText(initial?.year));
  const [km, setKm] = useState(toText(initial?.km));
  const [attributes, setAttributes] = useState<Record<string, string | number>>(initial?.attributes ?? {});
  const [city, setCity] = useState(initial?.city ?? 'Ankara');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [status, setStatus] = useState<ListingStatus>(initial?.status ?? 'draft');
  const [sheet, setSheet] = useState<'category' | 'subtype' | null>(null);

  const categoryRow = categories.data?.find((c) => c.slug === category);
  const fields = categoryRow?.filter_fields ?? [];
  const hasKm = fields.some((f) => f.key === 'km');
  const priceValue = toNumber(price);
  const yearValue = toNumber(year);
  const yearInvalid = yearValue != null && (yearValue < 1950 || yearValue > new Date().getFullYear() + 1);
  const valid = !!category && title.trim().length > 2 && priceValue != null && city.trim().length > 0 && !yearInvalid;

  const onSave = () => {
    const input: ListingInput = {
      category_slug: category,
      subtype: subtype || null,
      title: title.trim(),
      description: description.trim() || null,
      price: priceValue ?? 0,
      brand: brand.trim() || null,
      model: model.trim() || null,
      year: yearValue,
      km: hasKm ? toNumber(km) : null,
      // Kategori değiştiyse eski kategorinin alanları atılır
      attributes: Object.fromEntries(
        Object.entries(attributes).filter(([key]) => fields.some((f) => f.key === key && f.key !== 'km')),
      ),
      city: city.trim(),
      district: district.trim() || null,
      status,
    };
    save.mutate(
      { id, input },
      {
        onSuccess: (savedId) => {
          if (!id) {
            // Yeni ilan: fotoğraf eklenebilmesi için aynı ekranda düzenleme moduna geç
            router.setParams({ id: savedId });
            Alert.alert('İlan kaydedildi', 'Şimdi fotoğraf ve video ekleyebilirsiniz.');
          } else {
            router.back();
          }
        },
        onError: (e) => Alert.alert('İlan kaydedilemedi', e.message),
      },
    );
  };

  const onDelete = () =>
    initial &&
    Alert.alert('İlanı sil', 'İlan, fotoğrafları ve ilana bağlı görüşmeler kalıcı olarak silinecek. Bunun yerine "Yayından kalktı" durumunu da kullanabilirsiniz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          remove.mutate(initial, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('İlan silinemedi', e.message),
          }),
      },
    ]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {id && initial ? <MediaManager listingId={id} media={initial.media} /> : null}

        <Card style={styles.card}>
          <Text variant="subheading">Durum</Text>
          <View style={styles.wrap}>
            {STATUSES.map((s) => (
              <Chip key={s} label={statusLabels[s]} selected={status === s} onPress={() => setStatus(s)} />
            ))}
          </View>
          {status === 'draft' ? (
            <Text variant="small">Taslak ilanları yalnızca firma hesapları görür.</Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text variant="subheading">Temel bilgiler</Text>
          <SelectRow label="Kategori" value={categoryRow?.name} placeholder="Kategori seçin" onPress={() => setSheet('category')} />
          {categoryRow?.subtypes.length ? (
            <SelectRow label="Tip" value={subtype || undefined} placeholder="Tip seçin" onPress={() => setSheet('subtype')} />
          ) : null}
          <TextField label="İlan başlığı" value={title} onChangeText={setTitle} placeholder="Ör. Mercedes-Benz Actros 1845 LS Çekici" />
          <TextField
            label="Fiyat (TL)"
            value={priceValue != null ? formatNumber(priceValue) : ''}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />
          <TextField
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.multiline}
            textAlignVertical="top"
          />
        </Card>

        <Card style={styles.card}>
          <Text variant="subheading">Özellikler</Text>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label="Marka" value={brand} onChangeText={setBrand} />
            </View>
            <View style={styles.flex}>
              <TextField label="Model" value={model} onChangeText={setModel} />
            </View>
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField
                label="Model yılı"
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
                error={yearInvalid ? 'Geçersiz yıl' : undefined}
              />
            </View>
            {hasKm ? (
              <View style={styles.flex}>
                <TextField
                  label="Kilometre"
                  value={toNumber(km) != null ? formatNumber(toNumber(km)!) : ''}
                  onChangeText={setKm}
                  keyboardType="number-pad"
                />
              </View>
            ) : null}
          </View>
          {fields
            .filter((f) => f.key !== 'km')
            .map((field) =>
              field.type === 'select' ? (
                <View key={field.key} style={styles.fieldBlock}>
                  <Text variant="smallMedium" color="textSecondary">
                    {field.label}
                  </Text>
                  <View style={styles.wrap}>
                    {field.options?.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        selected={attributes[field.key] === option}
                        onPress={() =>
                          setAttributes((a) => {
                            const next = { ...a };
                            if (next[field.key] === option) delete next[field.key];
                            else next[field.key] = option;
                            return next;
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <TextField
                  key={field.key}
                  label={`${field.label}${field.unit ? ` (${field.unit})` : ''}`}
                  value={attributes[field.key] != null ? formatNumber(Number(attributes[field.key])) : ''}
                  onChangeText={(text) =>
                    setAttributes((a) => {
                      const next = { ...a };
                      const value = toNumber(text);
                      if (value == null) delete next[field.key];
                      else next[field.key] = value;
                      return next;
                    })
                  }
                  keyboardType="number-pad"
                />
              ),
            )}
        </Card>

        <Card style={styles.card}>
          <Text variant="subheading">Konum</Text>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label="İl" value={city} onChangeText={setCity} />
            </View>
            <View style={styles.flex}>
              <TextField label="İlçe" value={district} onChangeText={setDistrict} />
            </View>
          </View>
        </Card>

        {initial ? (
          <Button title="İlanı Sil" variant="outline" icon="trash-2" loading={remove.isPending} onPress={onDelete} />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button
          title={id ? 'Değişiklikleri Kaydet' : 'İlanı Kaydet'}
          disabled={!valid}
          loading={save.isPending}
          onPress={onSave}
        />
      </View>

      <OptionSheet
        visible={sheet === 'category'}
        title="Kategori"
        options={(categories.data ?? []).map((c) => ({ value: c.slug, label: c.name }))}
        selected={category}
        onSelect={(value) => {
          if (value && value !== category) {
            setCategory(value);
            setSubtype('');
          }
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'subtype'}
        title="Tip"
        options={(categoryRow?.subtypes ?? []).map((s) => ({ value: s, label: s }))}
        selected={subtype}
        clearLabel="Belirtilmemiş"
        onSelect={(value) => setSubtype(value ?? '')}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

function SelectRow({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text variant="smallMedium" color="textSecondary">
        {label}
      </Text>
      <Pressable style={styles.select} onPress={onPress} accessibilityRole="button">
        <Text variant="body" color={value ? 'text' : 'textTertiary'} style={styles.flex}>
          {value ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={22} color="textSecondary" />
      </Pressable>
    </View>
  );
}

function MediaManager({ listingId, media }: { listingId: string; media: ListingDetail['media'] }) {
  const upload = useUploadMedia(listingId);
  const remove = useDeleteMedia(listingId);
  const swap = useSwapMedia(listingId);
  const photos = media.filter((m) => m.type === 'image');
  const video = media.find((m) => m.type === 'video');
  const nextOrder = media.reduce((max, m) => Math.max(max, m.sort_order + 1), 0);
  const busy = upload.isPending || remove.isPending || swap.isPending;

  const pick = async (type: 'image' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ['images'] : ['videos'],
      allowsMultipleSelection: type === 'image',
      selectionLimit: type === 'image' ? MAX_PHOTOS - photos.length : 1,
      quality: 1,
      orderedSelection: true,
    });
    if (result.canceled || !result.assets.length) return;
    const tooBig = result.assets.find((a) => type === 'video' && (a.fileSize ?? 0) > 50 * 1024 * 1024);
    if (tooBig) {
      Alert.alert('Video çok büyük', 'Video en fazla 50 MB olabilir. Daha kısa bir video seçin.');
      return;
    }
    upload.mutate(
      { assets: result.assets, type, startOrder: nextOrder },
      { onError: (e) => Alert.alert('Yükleme başarısız', e.message) },
    );
  };

  const confirmRemove = (item: (typeof media)[number]) =>
    Alert.alert(item.type === 'video' ? 'Videoyu sil' : 'Fotoğrafı sil', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(item) },
    ]);

  return (
    <Card style={styles.card}>
      <View style={styles.mediaHeader}>
        <Text variant="subheading" style={styles.flex}>
          Fotoğraflar ({photos.length}/{MAX_PHOTOS})
        </Text>
        {busy ? <ActivityIndicator color={Colors.navy} /> : null}
      </View>
      {upload.isPending ? <Text variant="small">Yükleniyor… Ekrandan ayrılmayın.</Text> : null}
      <View style={styles.grid}>
        {photos.map((photo, i) => (
          <View key={photo.id} style={styles.tile}>
            <ListingImage uri={photo.url} style={styles.tileImage} />
            {i === 0 ? (
              <View style={styles.coverTag}>
                <Text variant="caption" style={styles.white}>
                  Kapak
                </Text>
              </View>
            ) : null}
            <View style={styles.tileActions}>
              {i > 0 ? (
                <Pressable
                  hitSlop={6}
                  accessibilityLabel="Öne al"
                  disabled={busy}
                  style={styles.tileButton}
                  onPress={() => swap.mutate([photo, photos[i - 1]])}>
                  <Icon name="arrow-left" size={16} color="white" />
                </Pressable>
              ) : null}
              <Pressable
                hitSlop={6}
                accessibilityLabel="Sil"
                disabled={busy}
                style={styles.tileButton}
                onPress={() => confirmRemove(photo)}>
                <Icon name="x" size={16} color="white" />
              </Pressable>
            </View>
          </View>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable style={[styles.tile, styles.addTile]} disabled={busy} onPress={() => pick('image')}>
            <Icon name="camera" size={26} />
            <Text variant="caption" color="heading">
              Fotoğraf ekle
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text variant="small">İlk fotoğraf kapak olarak kullanılır. Sırayı ← ile değiştirebilirsiniz.</Text>

      <View style={styles.videoRow}>
        <Icon name="video" size={22} />
        <Text variant="bodyMedium" style={styles.flex}>
          {video ? 'Video eklendi' : 'Video (isteğe bağlı, en fazla 50 MB)'}
        </Text>
        {video ? (
          <Pressable hitSlop={8} disabled={busy} onPress={() => confirmRemove(video)}>
            <Text variant="bodySemibold" color="danger">
              Sil
            </Text>
          </Pressable>
        ) : (
          <Pressable hitSlop={8} disabled={busy} onPress={() => pick('video')}>
            <Text variant="bodySemibold" color="green">
              Ekle
            </Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const TILE = 100;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  white: { color: Colors.white },
  card: { padding: Spacing.three, gap: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.three },
  fieldBlock: { gap: Spacing.two },
  multiline: { minHeight: 120, paddingTop: Spacing.three },
  select: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  mediaHeader: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: TILE, height: TILE, borderRadius: Radius.md, overflow: 'hidden' },
  tileImage: { width: '100%', height: '100%' },
  coverTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: Colors.green,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileActions: { position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 4 },
  tileButton: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(10,33,63,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.navyBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
