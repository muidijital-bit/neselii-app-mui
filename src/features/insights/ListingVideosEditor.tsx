import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { VIDEO_SECTIONS, asListingId, userMessage, type ListingDetail, type VideoSection } from '@/domain';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card, Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül yalnız video seçilirken yüklenir
const imagePicker = () => require('expo-image-picker') as typeof import('expo-image-picker');

/**
 * Madde 7 (yönetici): ilana bölüm etiketli video ekleme / silme. Bölüm seçilir (soğuk çalıştırma, kabin, motor, alt takım, kasa), galeriden video
 * seçilir (en fazla 3 dk, 50 MB) ve hemen yüklenir. İlan detayında "Video İnceleme" bölümünde ve galeride bölüm adıyla görünür.
 */
export function ListingVideosEditor({ listing }: { listing: ListingDetail }) {
  const { listings } = useServices();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<VideoSection>('cold_start');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const videos = listing.media.filter((m) => m.kind === 'video');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['listings'], predicate: (q) => q.queryKey[2] === 'detail' && q.queryKey[3] === listing.id });

  const add = async () => {
    setFailure(null);
    const ImagePicker = imagePicker();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      setFailure('Video seçmek için galeri izni gerekir.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 180, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 50 * 1024 * 1024) {
      setFailure('Video en fazla 50 MB olabilir. Daha kısa bir video seçin.');
      return;
    }
    setBusy(true);
    try {
      await listings.addListingVideo(asListingId(listing.id), { uri: asset.uri, name: asset.fileName ?? 'video.mp4', mimeType: asset.mimeType ?? 'video/mp4' }, section);
      await refresh();
    } catch (error) {
      setFailure(userMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = (mediaId: string, label: string) =>
    Alert.alert('Video silinsin mi?', label, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          void listings
            .removeListingMedia(mediaId)
            .then(refresh)
            .catch((error) => setFailure(userMessage(error))),
      },
    ]);

  return (
    <View style={styles.group}>
      <Text variant="subheading">Videolar</Text>
      {videos.map((video, i) => {
        const label = VIDEO_SECTIONS.find((s) => s.id === video.section)?.label ?? `Video ${i + 1} (bölümsüz)`;
        return (
          <Card key={video.id} style={styles.row}>
            <View style={styles.icon}>
              <Icon name="play" size={18} color="white" />
            </View>
            <Text variant="body" style={styles.flex}>
              {label}
            </Text>
            <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={`${label} videosunu sil`} onPress={() => remove(video.id, label)}>
              <Icon name="trash-2" size={18} color="danger" />
            </Pressable>
          </Card>
        );
      })}
      <Text variant="smallMedium" color="textSecondary">
        Yeni videonun bölümü
      </Text>
      <View style={styles.wrap}>
        {VIDEO_SECTIONS.map((s) => (
          <Chip key={s.id} label={s.label} selected={section === s.id} onPress={() => setSection(s.id)} />
        ))}
      </View>
      <Button title="Video Ekle" icon="video" variant="outline" loading={busy} onPress={() => void add()} testID="listing-video-add" />
      {failure ? (
        <Text variant="small" color="danger">
          {failure}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  icon: { width: 32, height: 32, borderRadius: Radius.pill, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
