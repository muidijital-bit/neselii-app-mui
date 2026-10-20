import type { NotificationPreferences } from '@/domain';
import type { PermissionState } from '@/permissions';

/** Bildirim türü satırları (tasarım 12b `PREFS`): anahtar, başlık, alt metin. Sıra tasarımdaki gibidir. */
export const TYPE_ROWS = [
  { key: 'newListings', label: 'Yeni ilanlar', sub: 'Kayıtlı aramalarınızla eşleşen ilanlar' },
  { key: 'priceChanges', label: 'Fiyat değişiklikleri', sub: 'Favori ilanlarınızdaki fiyat güncellemeleri' },
  { key: 'statusChanges', label: 'Durum değişiklikleri', sub: 'Rezerve ve satıldı bilgisi' },
  { key: 'messageReplies', label: 'Mesaj cevapları', sub: 'Neşeli Otomotiv mesajınıza cevap verdiğinde' },
  { key: 'announcements', label: 'Duyurular', sub: 'Firmadan genel duyurular' },
] as const satisfies readonly { key: keyof NotificationPreferences; label: string; sub: string }[];

export type RowView = {
  /** Anahtarın görünen durumu: yalnızca sistem izni GERÇEKTEN verilmişse açık olabilir. */
  readonly on: boolean;
  readonly sub: string;
  /** İzin reddedilmiş: ayarlar bağlantısı gösterilir. */
  readonly denied: boolean;
};

/**
 * "Anlık bildirimler" satırı (SİSTEM): görünüm yalnızca cihazdan okunan bildirim iznine bağlıdır. Verilmişse açık; sorulmamış, reddedilmiş ya da
 * okunamamışsa KAPALI (uygulama anahtarı izin verilmiş gibi göstermez). Tasarım metinleri: "Açık · cihaz ayarlarından yönetilir" / "Kapalı · açmak için dokunun".
 */
export function systemRowView(permission: PermissionState | null): RowView {
  if (permission?.status === 'granted') return { on: true, sub: 'Açık · cihaz ayarlarından yönetilir', denied: false };
  if (permission === null) return { on: false, sub: 'Kapalı · izin durumu okunamadı', denied: false };
  if (permission.status === 'denied') return { on: false, sub: permission.canAskAgain ? 'Kapalı · açmak için dokunun' : 'Kapalı · cihaz ayarlarından açın', denied: true };
  return { on: false, sub: 'Kapalı · açmak için dokunun', denied: false };
}

/**
 * "Yakındaki ilanları önce göster" satırı (KONUM): açık görünmesi için kullanıcı tercihi AÇIK ve konum izni VERİLMİŞ olmalıdır. İzin reddedilmişse
 * (tercih daha önce açık kalmış olsa bile) kapalı görünür. Tasarım alt metni: "Konum izni · isteğe bağlı".
 */
export function locationRowView(preferred: boolean, permission: PermissionState | null): RowView {
  const granted = permission?.status === 'granted';
  if (granted) return { on: preferred, sub: preferred ? 'Açık · konumunuz yalnızca bu cihazda kullanılır' : 'Konum izni · isteğe bağlı', denied: false };
  if (permission?.status === 'denied') return { on: false, sub: preferred ? 'Kapalı · konum izni verilmedi' : 'Konum izni · isteğe bağlı', denied: true };
  return { on: false, sub: 'Konum izni · isteğe bağlı', denied: false };
}
