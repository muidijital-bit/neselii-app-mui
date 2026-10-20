import type { IsoDateTime } from './common';
import type { UserId } from './ids';

export type UserProfile = {
  readonly id: UserId;
  /** Giriş e-postasıdır; profilde salt okunur (016). Telefon girişi/SMS yoktur. */
  readonly email: string;
  readonly fullName: string;
  /** İsteğe bağlı iletişim alanı; giriş yöntemi değildir. */
  readonly phone: string | null;
  /** Kayıt sonrası e-posta doğrulaması (demo tamamlama 006). */
  readonly emailVerified: boolean;
  /** `Üyelik: Mart 2026` gösterimi için. */
  readonly memberSince: IsoDateTime;
};

export type Session = { readonly user: UserProfile };
