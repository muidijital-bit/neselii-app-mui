import { useIsFocused } from 'expo-router';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';

type Props = {
  /** `dark` = koyu yazı (beyaz/açık zemin), `light` = açık yazı (lacivert/koyu zemin). */
  style: Extract<StatusBarStyle, 'dark' | 'light'>;
};

/**
 * Yalnız odaktaki ekranın durum çubuğu stilini uygular. `expo-status-bar` bağlı tüm örnekleri bir yığında tutar ve son bağlanan/
 * güncellenen kazanır; sekmeler ve alttaki yığın ekranları bağlı kaldığından (ör. ana sayfanın açık stili) başka ekrana geçince
 * stil baskın kalıp beyaz zeminde beyaz yazı bırakıyordu. Odak dışındaki ekran hiçbir şey çizmez; odak gelince yeniden bağlanıp
 * yığının üstüne çıkar. Navigasyon kabı dışında (bootstrap/açılış) doğrudan `StatusBar` kullanılır.
 */
export function FocusStatusBar({ style }: Props) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} /> : null;
}
