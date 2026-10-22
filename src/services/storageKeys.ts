/**
 * Cihazdaki kalıcı anahtarlar. Oturum Supabase istemcisinin kendi deposundadır; burada yalnızca cihaz/uygulama tercihleri durur.
 * Hiçbir kod toplu silme çağırmaz; her anahtar adıyla ele alınır. Çıkış ve hesap silme bu anahtarlara dokunmaz.
 */
export const STORAGE_KEYS = {
  /** İlk açılış onboarding'i tamamlandı mı (005). */
  onboarding: 'neseli.device.onboarding',
  /** Cihaz tercihleri (izin istendi bilgisi vb., 005/018). */
  devicePreferences: 'neseli.device.preferences',
  /** Yönetici Mesajlar tanıtımı görüldü mü; sonuna kullanıcı kimliği eklenir (aynı cihazdaki her yönetici bir kez görür). */
  adminInboxIntroPrefix: 'neseli.device.admin-inbox-intro.',
} as const;
