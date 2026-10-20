import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// `unknown`/`extension` gibi belirsiz değerler etkin sayılır; yalnızca açıkça arka planda/etkin değilken görünmez sayılır.
const appInactive = () => AppState.currentState === 'background' || AppState.currentState === 'inactive';

/**
 * Ekran kullanıcıya gerçekten görünüyor mu? Router odağı (başka ekran üstüne itilmemiş) VE uygulama ön planda. Sohbet ekranı ilan
 * kartıyla başka ekran açınca ya da uygulama arka plana geçince mount kalır; bu durumda gelen yanıt görülmemiştir (okundu sayılmaz).
 */
export function useScreenVisible(): boolean {
  const focused = useIsFocused();
  const [active, setActive] = useState(() => !appInactive());
  useEffect(() => {
    setActive(!appInactive()); // mount ile efekt arasında değişmiş olabilir
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return focused && active;
}
