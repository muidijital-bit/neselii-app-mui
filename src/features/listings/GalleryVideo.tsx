import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Icon } from '@/components/icons/Icon';
import { usePauseWhenInactive } from '@/media/usePauseWhenInactive';
import { colors, fontFamily } from '@/theme';

type PlayerState = { status: VideoPlayer['status']; playing: boolean; ended: boolean };

function readState(player: VideoPlayer): PlayerState {
  try {
    return { status: player.status, playing: player.playing, ended: false };
  } catch {
    return { status: 'idle', playing: false, ended: false };
  }
}

/** Oynatıcının yerel durumunu (yükleme / hata / oynuyor / bitti) olaylardan izler. */
function usePlayerState(player: VideoPlayer): PlayerState {
  const [state, setState] = useState(() => readState(player));
  useEffect(() => {
    setState(readState(player));
    const subs = [
      player.addListener('statusChange', ({ status }) => setState((s) => ({ ...s, status }))),
      player.addListener('playingChange', ({ isPlaying }) => setState((s) => ({ ...s, playing: isPlaying, ended: isPlaying ? false : s.ended }))),
      // Döngüdeki oynatıcı (demo) her turda `playToEnd` yayabilir; oynamaya devam ettiği için "bitti" sayılmaz.
      player.addListener('playToEnd', () => {
        if (player.loop) return;
        setState((s) => ({ ...s, playing: false, ended: true }));
      }),
    ];
    return () => {
      for (const sub of subs) {
        try {
          sub.remove();
        } catch {
          // Oynatıcı serbest bırakılmış olabilir.
        }
      }
    };
  }, [player]);
  return state;
}

type Props = {
  /** İlan videosunun adresi; `null` ise oynatıcı kaynak almaz ve oynat düğmesi hata durumuna düşmeden yer tutucu gösterir. */
  uri: string | null;
  onRetry: () => void;
  onBack: () => void;
  stage: React.ReactNode;
  testID: string;
};

/**
 * Galeri video sahnesi. Ebeveyn `key` ile bu bileşeni medya/yeniden-deneme başına yeniden oluşturur; böylece seçim değişince ya da ekran
 * kapanınca oynatıcı kaldırılır ve `usePauseWhenInactive` durdurur. Otomatik oynatma yoktur: yalnızca kullanıcı dokununca başlar.
 */
export function GalleryVideo({ uri, onRetry, onBack, stage, testID }: Props) {
  const player = useVideoPlayer(uri ? { uri } : null, (p) => {
    // İlan videosu bitince durur ve "Yeniden oynat" gösterir.
    p.loop = false;
  });
  usePauseWhenInactive(player);
  const { status, playing, ended } = usePlayerState(player);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  const toggle = () => {
    try {
      if (playing) {
        player.pause();
        return;
      }
      if (!startedRef.current) {
        startedRef.current = true;
        setStarted(true);
      }
      if (ended) player.replay();
      else player.play();
    } catch {
      // Oynatıcı serbest bırakılmış; hata durumu olaydan gelir.
    }
  };

  if (status === 'error') {
    return (
      <View style={styles.fill} testID={`${testID}-error`}>
        {stage}
        <View style={styles.errorBox}>
          <Icon name="info" size={26} color={colors.white} />
          <Text style={styles.errorTitle} accessibilityRole="header">
            Video yüklenemedi
          </Text>
          <Text style={styles.errorText}>Video açılamadı. Tekrar deneyebilir ya da ilana dönebilirsiniz.</Text>
          <View style={styles.errorActions}>
            <Btn label="Tekrar dene" icon="refresh-cw" onPress={onRetry} testID={`${testID}-retry`} />
            <Btn label="Geri dön" variant="onDark" icon="arrow-left" onPress={onBack} testID={`${testID}-back`} />
          </View>
        </View>
      </View>
    );
  }

  const loading = started && status === 'loading';
  return (
    <View style={styles.fill} testID={testID}>
      {started ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} />
      ) : (
        stage
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Duraklat' : ended ? 'Yeniden oynat' : 'Oynat'}
        onPress={toggle}
        style={styles.touch}
        testID={`${testID}-toggle`}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.white} testID={`${testID}-loading`} />
        ) : playing ? null : (
          <View style={styles.playCircle}>
            <Icon name="play" size={28} color={colors.white} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: colors.ink },
  touch: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  errorBox: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: 'rgba(17,22,31,0.86)' },
  errorTitle: { fontFamily: fontFamily.montserrat700, fontSize: 16, lineHeight: 20, color: colors.white },
  errorText: { fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 18, color: colors.slateFaint, textAlign: 'center' },
  errorActions: { alignSelf: 'stretch', gap: 8, marginTop: 6 },
});
