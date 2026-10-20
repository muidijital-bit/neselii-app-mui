import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

type Pausable = {
  pause: () => void;
  addListener?: (event: 'playingChange', listener: (payload: { isPlaying: boolean }) => void) => { remove: () => void };
};

function pauseQuietly(player: Pausable) {
  try {
    player.pause();
  } catch {
    // Oynatıcı zaten serbest bırakılmış olabilir (unmount sırası); durdurulacak bir şey kalmadı.
  }
}

// `unknown`/`extension` gibi belirsiz değerler etkin sayılır; yalnızca açıkça arka planda/etkin değilken susturulur.
const appInactive = () => AppState.currentState === 'background' || AppState.currentState === 'inactive';

/**
 * Oynatıcıyı ekran odağını kaybedince, uygulama arka plana geçince ve unmount'ta durdurur (ses arka planda sürmez).
 * Yalnızca olaya değil DURUMA da bakar: odaksız/arka planda mount olan, oynatıcısı değişen ya da kaynağı geç yüklenip kendiliğinden
 * oynamaya başlayan oynatıcı da hemen durdurulur.
 */
export function usePauseWhenInactive(player: Pausable) {
  const playerRef = useRef(player);
  playerRef.current = player;
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  const safePause = () => pauseQuietly(playerRef.current);

  // Odak kaybı; odaksız mount; oynatıcı değişimi (yeni oynatıcı aktif olmayan bir ekranda oynamasın).
  useEffect(() => {
    if (!focused || appInactive()) safePause();
  }, [focused, player]);

  // Etkin olmayken oynatma başlarsa (geç yüklenen kaynak, otomatik oynatma) geri durdur.
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = player.addListener?.('playingChange', ({ isPlaying }) => {
        if (isPlaying && (!focusedRef.current || appInactive())) pauseQuietly(playerRef.current);
      });
    } catch {
      sub = undefined;
    }
    return () => {
      try {
        sub?.remove();
      } catch {
        // Oynatıcı serbest bırakılmış.
      }
    };
  }, [player]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') safePause();
    });
    return () => {
      sub.remove();
      safePause();
    };
  }, []);
}
