/**
 * Servis sözleşmeleri. UI yalnızca bunlara bağımlıdır; hangi adapter'ın (Supabase) arkada olduğunu bilmez.
 * Her operasyon başarıyla çözülür veya `AppError` ile reddedilir (bkz. `@/domain/errors`); başka hata türü sızmaz.
 * Sayfalama: 20 kayıt (`PAGE_SIZE`); `Page` döndüren her listeleme isteğe bağlı `PageInput` (`cursor`) alır, `nextCursor` opaktır; aynı filtre/sıra eşitliklerinde ID tie-breaker ile sonuç deterministiktir.
 * Hiçbir sözleşme bir veritabanı şeması veya sağlayıcı taahhüdü değildir.
 */
import type {
  Advisor,
  AdvisorId,
  AppNotification,
  CallLog,
  CallStats,
  CallSummary,
  Category,
  CommercialSpecs,
  CategoryId,
  ClientMessageId,
  Conversation,
  ConversationId,
  FavoriteEntry,
  FinancePlan,
  FinanceSettings,
  Lead,
  LeadId,
  LeadStatus,
  LeadTimeSlot,
  LeadTopic,
  ListingDetail,
  ListingId,
  ListingInsights,
  ListingInsightsInput,
  ListingSearch,
  ListingSummary,
  Message,
  MessagingEvent,
  NotificationId,
  NotificationPreferences,
  Page,
  PageInput,
  SavedSearch,
  SavedSearchId,
  Session,
  Unsubscribe,
  UserProfile,
} from '@/domain';

// --- Auth ----------------------------------------------------------------------------------------------------------

export type SignInInput = { readonly email: string; readonly password: string };

export type SignUpInput = {
  readonly fullName: string;
  readonly email: string;
  /** İsteğe bağlı iletişim alanı; giriş yöntemi değildir. */
  readonly phone?: string;
  readonly password: string;
};

/**
 * E-posta + şifre; telefon/SMS girişi yoktur. Parola yalnızca bu çağrıların argümanıdır: kalıcı depoya, günlüğe,
 * `AppError.cause`'a yazılmaz. Hatalar: yanlış bilgi → `validation`/`invalid_credentials`; e-posta kullanımda →
 * `validation`/`email_taken` (+ `fieldErrors`); doğrulanmamış e-posta → `validation`/`email_not_verified`; çevrimdışı → `offline`.
 */
export interface AuthService {
  /** Kurtarılan oturum; yoksa `null` (hata değil). */
  getSession(): Promise<Session | null>;
  /** Doğrulanmamış e-postayla girişte `emailVerified=false` oturum döner (doğrulama ekranına yönlendirilir). */
  signIn(input: SignInInput): Promise<Session>;
  /** Kayıt; e-posta doğrulaması gerekiyorsa `user.emailVerified=false` döner ve doğrulama e-postası gönderilir. */
  signUp(input: SignUpInput): Promise<Session>;
  /**
   * Doğrulamayı tamamlar. `linkUrl` verilirse e-postadaki bağlantıdan (uygulamaya dönen URL) oturum kurulur; verilmezse kullanıcının
   * bağlantıya başka cihazda/tarayıcıda dokunduğu varsayılır ve hesap yeniden denetlenir. Hâlâ doğrulanmamışsa `email_not_verified`.
   */
  completeEmailVerification(linkUrl?: string): Promise<Session>;
  /** Doğrulama e-postasını yeniden gönderir (kayıt/giriş sonrası bekleyen hesap için). */
  resendVerificationEmail(): Promise<void>;
  /** Her e-posta için başarılı döner (hesap varlığı sızdırılmaz); kayıtlı hesaba sıfırlama bağlantısı gönderilir. */
  requestPasswordReset(email: string): Promise<void>;
  /** E-postadaki sıfırlama bağlantısını (uygulamaya dönen URL) doğrular; geçerliyse hesabın e-postasını döner. */
  beginPasswordRecovery(linkUrl: string): Promise<{ readonly email: string }>;
  /** `beginPasswordRecovery` sonrası yeni şifreyi kaydeder ve kurtarma oturumunu kapatır (kullanıcı yeniden giriş yapar). */
  completePasswordReset(input: { readonly email: string; readonly newPassword: string }): Promise<void>;
  signOut(): Promise<void>;
}

// --- Profile -------------------------------------------------------------------------------------------------------

export type UpdateProfileInput = {
  readonly fullName?: string;
  /** `null` telefonu kaldırır; `undefined` dokunmaz. */
  readonly phone?: string | null;
};

/** Oturum gerekir; yoksa `unauthenticated`. E-posta düzenlenemez. */
export interface ProfileService {
  getProfile(): Promise<UserProfile>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  /** Hesabı ve hesaba bağlı tüm kayıtları (favori, kayıtlı arama, sohbet, bildirim, tercih) sunucudan siler ve oturumu kapatır. */
  deleteAccount(): Promise<void>;
}

// --- Listings ------------------------------------------------------------------------------------------------------

export type SearchListingsInput = PageInput & { readonly search: ListingSearch };

export interface ListingsService {
  /** Sunucudaki kategoriler, kendi sırasında, yayındaki ilan sayısıyla. */
  listCategories(): Promise<readonly Category[]>;
  /** Aramada görünen ilanlardaki markalar (alfabetik, tekil); kategori verilirse yalnızca o kategorilerdekiler. Filtre önerisidir. */
  listBrands(categories?: readonly CategoryId[]): Promise<readonly string[]>;
  /** Metin + filtre + sıra + sayfalama. Yayından kalkmış ilanlar sonuçta yoktur. Eşleşme yoksa boş sayfa (hata değil). */
  searchListings(input: SearchListingsInput): Promise<Page<ListingSummary>>;
  /** Aramayla eşleşen ilan sayısı (filtre ekranındaki "N ilanı göster"). */
  countListings(search: ListingSearch): Promise<number>;
  /** Firmanın öne çıkardığı yayındaki ilanlar (ana sayfa karuseli), en yeni önce. */
  listFeatured(): Promise<readonly ListingSummary[]>;
  /** Satılmış/rezerve/yayından kalkmış ilan döner (durum alanıyla); hiç var olmayan ilan için `notFound`. */
  getListing(id: ListingId): Promise<ListingDetail>;
  /** Yalnız yönetici: ilanın geçmiş / güven / uzman bilgilerini kaydeder (yoksa oluşturur). Var olmayan ilan → `notFound`. */
  saveInsights(id: ListingId, input: ListingInsightsInput): Promise<ListingInsights>;
  /** Yalnız yönetici: ticari araç teknik bilgileri (madde 3: tonaj, motor gücü, kabin, şasi, üstyapı). Boş alan kaldırılır. */
  saveSpecs(id: ListingId, specs: CommercialSpecs): Promise<void>;
}

// --- Favorites & saved searches ------------------------------------------------------------------------------------

export interface FavoritesService {
  /** En son eklenen önce. Kalkmış/silinmiş ilan `listing: null` ile listelenir. */
  list(input?: PageInput): Promise<Page<FavoriteEntry>>;
  /** İdempotent: zaten favoriyse aynı kaydı döner (mükerrer oluşmaz). Var olmayan ilan → `notFound`. */
  add(listingId: ListingId): Promise<FavoriteEntry>;
  /** İdempotent: favoride olmayanı kaldırmak hata değildir. */
  remove(listingId: ListingId): Promise<void>;
}

export type CreateSavedSearchInput = { readonly title: string; readonly search: ListingSearch };

export interface SavedSearchesService {
  /** En son kaydedilen önce. */
  list(input?: PageInput): Promise<Page<SavedSearch>>;
  create(input: CreateSavedSearchInput): Promise<SavedSearch>;
  remove(id: SavedSearchId): Promise<void>;
}

// --- Messaging -----------------------------------------------------------------------------------------------------

export type SendMessageInput = {
  readonly conversationId: ConversationId;
  /** Yeniden denemede aynı kalır: aynı kimlikle gelen ikinci gönderim yeni mesaj üretmez, ilkini döner. */
  readonly clientMessageId: ClientMessageId;
  readonly text: string;
};

/** `cursor`: önceki (daha eski) sayfayı almak için önceki yanıtın `nextCursor` değeri. */
export type ListMessagesInput = PageInput & { readonly conversationId: ConversationId };

/**
 * Yalnızca kullanıcı ↔ Neşeli Otomotiv; kullanıcı + ilan başına tek sohbet. Oturum gerekir (`unauthenticated`).
 * `sendMessage`: kırpılmış metin boşsa `validation`. `subscribe` dönen `Unsubscribe` çağrılana ya da servis kapanana
 * kadar olay alır; aboneler ve zamanlayıcılar ekran kapanışında temizlenmelidir.
 */
export interface MessagingService {
  /** `updatedAt` azalan. */
  listConversations(input?: PageInput): Promise<Page<Conversation>>;
  /** İlan için mevcut sohbeti döner, yoksa oluşturur. Var olmayan ilan → `notFound`. */
  getOrCreateConversation(listingId: ListingId): Promise<Conversation>;
  /** Sayfa içi sıra eskiden yeniye; `nextCursor` daha eski sayfayı gösterir. En yeni sayfa ilk istenir. */
  listMessages(input: ListMessagesInput): Promise<Page<Message>>;
  sendMessage(input: SendMessageInput): Promise<Message>;
  /** Sohbetin okunmamış sayısını sıfırlar ve güncel sohbeti döner. */
  markConversationRead(conversationId: ConversationId): Promise<Conversation>;
  /** Tüm sohbetlerdeki toplam okunmamış (sekme rozeti). */
  countUnread(): Promise<number>;
  /**
   * Sohbeti çağıranın listesinden kaldırır (kayıt ve mesajlar silinmez): müşteride yalnız kendi listesinden, yöneticide firma gelen
   * kutusundan (tüm yöneticiler için). Bu taraftaki okunmamışlar ve sohbetin mesaj bildirimleri okundu sayılır. Sohbete yeni mesaj gelince
   * iki tarafta da yeniden listelenir. Gizli sohbet kimlikle açılabilir kalır. Erişilemeyen/olmayan sohbet → `notFound`.
   */
  hideConversation(conversationId: ConversationId): Promise<void>;
  subscribe(conversationId: ConversationId, listener: (event: MessagingEvent) => void): Unsubscribe;
}

// --- Notifications -------------------------------------------------------------------------------------------------

/** Uygulama içi bildirimler (sunucu tetikleyicileri üretir; sistem push henüz yok). Oturum gerekir. */
export interface NotificationsService {
  /** En yeni önce. */
  list(input?: PageInput): Promise<Page<AppNotification>>;
  /** İdempotent. Bilinmeyen kimlik → `notFound`. */
  markRead(ids: readonly NotificationId[]): Promise<void>;
  countUnread(): Promise<number>;
  /** Kullanıcının kendi bildirimlerini kalıcı olarak siler. İdempotent: zaten silinmiş/bilinmeyen kimlik hata değildir. */
  remove(ids: readonly NotificationId[]): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
  /** Verilen alanları günceller ve tam tercihleri döner. */
  updatePreferences(patch: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  /** Madde 6: bu cihazın Expo push belirtecini oturumdaki hesaba bağlar (başka hesaptan kaldırılır). */
  registerPushToken(token: string): Promise<void>;
  /** Çıkışta: hesabın push belirtecini kaldırır (cihaz artık bu hesabın bildirimini almaz). */
  unregisterPushToken(): Promise<void>;
}

// --- Leads (talepler) ---------------------------------------------------------------------------------------------

export type CreateLeadInput = {
  /** Talebin bırakıldığı ilan; genel talepte `null`. */
  readonly listingId: ListingId | null;
  readonly topic: LeadTopic;
  /** `YYYY-MM-DD`; seçilmediyse `null`. */
  readonly preferredDate: string | null;
  readonly preferredSlot: LeadTimeSlot;
  readonly contactPhone: string;
  readonly note?: string;
  /** Hesaplayıcıdan gelen ödeme planı (finansman talebi). */
  readonly plan?: FinancePlan;
};

/** `mine`: oturumdaki kullanıcının talepleri. `all`: firma gelen kutusu (yalnız yönetici; müşteride RLS yine kendi taleplerini döner). */
export type ListLeadsInput = PageInput & { readonly scope: 'mine' | 'all'; readonly status?: LeadStatus };

/** `appointmentAt`: ISO zaman; `null` randevuyu kaldırır (madde 31). */
export type UpdateLeadInput = { readonly status?: LeadStatus; readonly advisorId?: AdvisorId | null; readonly appointmentAt?: string | null };

/**
 * Talepler: müşteri bırakır, sunucu durumu "Yeni" yapar ve rastgele aktif danışman atar; yöneticilere bildirim gider. Yönetici durum ve danışmanı
 * değiştirir; müşteriye "Talebiniz güncellendi" bildirimi gider. Oturum gerekir (`unauthenticated`). Erişilemeyen talep → `notFound`.
 */
export interface LeadsService {
  /** Telefon geçersizse `validation` (`contactPhone`). Atanan danışmanla birlikte kaydı döner. */
  create(input: CreateLeadInput): Promise<Lead>;
  /** En yeni önce. */
  list(input: ListLeadsInput): Promise<Page<Lead>>;
  get(id: LeadId): Promise<Lead>;
  /** Yalnız yönetici; müşteride `unknown`/`unavailable` (RLS). */
  update(id: LeadId, patch: UpdateLeadInput): Promise<Lead>;
  /** "Yeni" durumundaki talep sayısı (yönetici menü sayacı). */
  countNew(): Promise<number>;
  /** Yönetici: `from` zamanından sonraki randevulu talepler, yakından uzağa (en çok 200). */
  listAppointments(from: string): Promise<readonly Lead[]>;
}

// --- Advisors (danışmanlar) ---------------------------------------------------------------------------------------

export type SaveAdvisorInput = { readonly fullName: string; readonly phone: string | null; readonly active: boolean };

/**
 * Danışmanlar. Okuma tüm oturumlu kullanıcılara açıktır (talepte ad gösterilir); yazma yalnız yöneticidedir. Silinen danışmanın açık talepleri
 * sunucuda başka bir aktif danışmana aktarılır. Ad boşsa `validation` (`fullName`).
 */
export interface AdvisorsService {
  /** Ada göre; `includeInactive` verilmezse yalnız aktifler. */
  list(input?: { readonly includeInactive?: boolean }): Promise<readonly Advisor[]>;
  get(id: AdvisorId): Promise<Advisor>;
  create(input: SaveAdvisorInput): Promise<Advisor>;
  update(id: AdvisorId, input: SaveAdvisorInput): Promise<Advisor>;
  remove(id: AdvisorId): Promise<void>;
}

// --- Finance ------------------------------------------------------------------------------------------------------

/** Finansman ayarları: herkes okur (hesaplayıcı), yalnız yönetici günceller. Geçersiz değer → `validation`. */
export interface FinanceService {
  getSettings(): Promise<FinanceSettings>;
  updateSettings(settings: FinanceSettings): Promise<FinanceSettings>;
}

// --- Call logs (madde 27) -----------------------------------------------------------------------------------------

/** "Hemen Ara" kayıtları. Kayıt oturumlu kullanıcı adına yazılır (oturum yoksa sessizce atlanır); okuma yalnız yöneticidedir. */
export interface CallLogsService {
  /** Arama dokunuşunu kaydeder. Hata yutulmaz ama çağıran aramayı engellememelidir. */
  log(listingId: ListingId | null): Promise<void>;
  /** En yeni önce. */
  list(input?: PageInput): Promise<Page<CallLog>>;
  /** İlanın toplam ve son 30 gündeki arama sayısı. */
  statsForListing(listingId: ListingId): Promise<CallStats>;
  /** Bugün / son 7 gün / toplam. */
  summary(): Promise<CallSummary>;
}

// --- Birleşik kap --------------------------------------------------------------------------------------------------

export interface Services {
  readonly auth: AuthService;
  readonly profile: ProfileService;
  readonly listings: ListingsService;
  readonly favorites: FavoritesService;
  readonly savedSearches: SavedSearchesService;
  readonly messaging: MessagingService;
  readonly notifications: NotificationsService;
  readonly leads: LeadsService;
  readonly advisors: AdvisorsService;
  readonly finance: FinanceService;
  readonly callLogs: CallLogsService;
}

export type ServiceName = keyof Services;
