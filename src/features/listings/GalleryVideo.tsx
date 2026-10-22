import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { usePauseWhenInactive } from '@/media/usePauseWhenInactive';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

type Props = {
  /** İlan videosunun adresi; `null` ise oynatıcı kaynak almaz ve yer tutucu gösterilir. */
  uri: string | null;
  /** Galeride görünen sayfa bu video mu? Değilse oynatma durdurulur (main: sayfa değişince `player.pause()`). */
  active: boolean;
  onRetry: () => void;
  testID: string;
};

/**
 * Galeri video sayfası (main tasarımı: yerel oynatıcı denetimleri, `contain`, genişlik × 0,78). Otomatik oynatma yoktur; ekran odağını
 * kaybedince, uygulama arka plana geçince ve sayfa değişince `usePauseWhenInactive` / `active` ile durur. Ebeveyn `key` ile yeniden dener.
 */
export function GalleryVideo({ uri, active, onRetry, testID }: Props) {
  const { width } = useWindowDimensions();
  const size = { width, height: width * 0.78 };
  const player = useVideoPlayer(uri ? { uri } : null, (p) => {
    p.loop = false;
  });
  usePauseWhenInactive(player);
  // Oynatıcının yerel durumu (yükleme / hata / hazır) olaydan izlenir.
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (active) return;
    try {
      player.pause();
    } catch {
      // Oynatıcı serbest bırakılmış; durdurulacak bir şey yok.
    }
  }, [active, player]);

  if (!uri || status === 'error') {
    return (
      <View style={[styles.fallback, size]} testID={uri ? `${testID}-error` : testID}>
        <Icon name="video-off" size={48} color={Colors.navyBorder} />
        <Text variant="body" style={styles.muted}>
          {uri ? 'Video yüklenemedi.' : 'Bu video henüz hazır değil.'}
        </Text>
        {uri ? <Button title="Tekrar dene" icon="refresh-cw" variant="outlineDark" onPress={onRetry} testID={`${testID}-retry`} /> : null}
      </View>
    );
  }

  return <VideoView player={player} style={size} nativeControls contentFit="contain" allowsPictureInPicture={false} testID={testID} />;
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  muted: { color: '#9AA4B2' },
});
