import type { IsoDateTime } from './common';
import type { UserId } from './ids';

export type UserRole = 'user' | 'admin';

export type UserProfile = {
  readonly id: UserId;
  /** Giriş e-postasıdır; profilde salt okunur (016). Telefon girişi/SMS yoktur. */
  readonly email: string;
  readonly fullName: string;
  /** İsteğe bağlı iletişim alanı; giriş yöntemi değildir. */
  readonly phone: string | null;
  /** Kayıt sonrası e-posta doğrulaması. */
  readonly emailVerified: boolean;
  /** `admin`: firma yöneticisi — tüm müşteri sohbetlerini görür ve cevaplar. Yalnızca veritabanından verilir. */
  readonly role: UserRole;
  /** `Üyelik: Mart 2026` gösterimi için. */
  readonly memberSince: IsoDateTime;
};

export type Session = { readonly user: UserProfile };
