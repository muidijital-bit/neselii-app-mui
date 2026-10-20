/**
 * Her async servis operasyonu yalnızca `AppError` üretir. UI `kind`'a göre karar verir; kullanıcıya her zaman
 * `userMessage(error)` gösterilir, ham `Error.message` / `cause` asla basılmaz (günlüğe/telemetriye gidebilir).
 *
 * Mimari dört tür belirler (validation/notFound/offline/unknown). `unauthenticated` eklendi: oturumsuz çağrının
 * giriş ekranına yönlendirilmesi (bekleyen bildirim hedefi, 007/015) `unknown`'dan ayırt edilebilmeli.
 */
export type AppErrorKind = 'validation' | 'notFound' | 'offline' | 'unauthenticated' | 'unknown';

/** Alan adı → kullanıcıya gösterilecek kısa mesaj (ör. `{ email: 'Geçerli bir e-posta girin' }`). */
export type FieldErrors = Readonly<Record<string, string>>;

/** Makine tarafından okunan alt neden; UI dallanması gerekmedikçe `kind` yeterlidir. */
export type AppErrorCode =
  | 'invalid_input'
  | 'invalid_credentials'
  | 'email_taken'
  | 'email_not_verified'
  /** E-posta doğrulama / şifre sıfırlama bağlantısı geçersiz ya da süresi dolmuş. */
  | 'link_invalid'
  | 'not_found'
  | 'unavailable'
  | 'offline'
  | 'unauthenticated'
  | 'scenario_error'
  | 'not_implemented'
  | 'disposed'
  | 'timeout'
  | 'unexpected';

const USER_MESSAGES: Record<AppErrorKind, string> = {
  validation: 'Girdiğiniz bilgileri kontrol edin.',
  notFound: 'İstediğiniz içerik bulunamadı.',
  offline: 'İnternet bağlantınızı kontrol edip tekrar deneyin.',
  unauthenticated: 'Devam etmek için giriş yapın.',
  unknown: 'Bir sorun oluştu. Lütfen tekrar deneyin.',
};

type AppErrorInit = {
  kind: AppErrorKind;
  code: AppErrorCode;
  fieldErrors?: FieldErrors;
  /** Özgün hata (günlük/hata ayıklama için). Kullanıcıya gösterilmez. */
  cause?: unknown;
};

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly code: AppErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor({ kind, code, fieldErrors, cause }: AppErrorInit) {
    // `message` sabit ve kullanıcıya güvenlidir; özgün metin yalnızca `cause`'ta durur.
    super(USER_MESSAGES[kind], cause === undefined ? undefined : { cause });
    this.name = 'AppError';
    this.kind = kind;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** Yalnızca ağ/çevrimdışı hataları kendiliğinden yeniden denemeye uygundur. */
  get retryable() {
    return this.kind === 'offline' || this.kind === 'unknown';
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export const appError = {
  validation: (fieldErrors: FieldErrors, code: AppErrorCode = 'invalid_input') => new AppError({ kind: 'validation', code, fieldErrors }),
  notFound: (what?: string) => new AppError({ kind: 'notFound', code: 'not_found', cause: what }),
  offline: (cause?: unknown) => new AppError({ kind: 'offline', code: 'offline', cause }),
  unauthenticated: () => new AppError({ kind: 'unauthenticated', code: 'unauthenticated' }),
  unknown: (cause?: unknown, code: AppErrorCode = 'unexpected') => new AppError({ kind: 'unknown', code, cause }),
};

const NETWORK_FAILURE = /network ?(request failed|error)|failed to fetch|socket hang up|econn(reset|refused)|enotfound|timed? ?out|offline/i;

/**
 * Adapter hata eşlemesi: bir adapter'ın fırlattığı her şey `AppError`'a çevrilir.
 * `AppError` aynen geçer; ağ hataları `offline`; geri kalanı `unknown` (özgün hata `cause`'ta).
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error && NETWORK_FAILURE.test(`${error.name} ${error.message}`)) return appError.offline(error);
  return appError.unknown(error);
}

/** UI'nın göstereceği metin. Ham hata metnini asla döndürmez. */
export function userMessage(error: unknown): string {
  return USER_MESSAGES[toAppError(error).kind];
}
