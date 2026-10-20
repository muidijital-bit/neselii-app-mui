import type { User } from '@supabase/supabase-js';

import {
  AppError,
  appError,
  asUserId,
  isValidEmail,
  isValidName,
  isValidOptionalPhone,
  isValidPassword,
  normalizeEmail,
  type Session,
  type UserProfile,
} from '@/domain';

import type { AuthService, SignInInput, SignUpInput } from '../contracts';
import { authRedirectUrl, establishSessionFromLink } from './authLinks';
import type { Supabase } from './client';
import { call, toIso, toSupabaseError } from './shared';

const PASSWORD_RULE = 'Şifre en az 8 karakter olmalı.';

/** Supabase kullanıcısı + `profiles` satırı → domain profili. Profil okunamazsa (ör. çevrimdışı) oturumdaki bilgiyle kurulur. */
export async function profileFor(sb: Supabase, user: User): Promise<UserProfile> {
  const metadata = (user.user_metadata ?? {}) as { full_name?: unknown; phone?: unknown };
  const fallback: UserProfile = {
    id: asUserId(user.id),
    email: user.email ?? '',
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : '',
    phone: typeof metadata.phone === 'string' && metadata.phone.trim() !== '' ? metadata.phone : null,
    emailVerified: Boolean(user.email_confirmed_at),
    memberSince: toIso(user.created_at),
    role: 'user',
  };
  const { data, error } = await sb.from('profiles').select('full_name, phone, created_at, role').eq('id', user.id).maybeSingle();
  if (error) {
    const mapped = toSupabaseError(error);
    if (mapped.kind === 'offline') return fallback;
    throw mapped;
  }
  if (!data) return fallback;
  return {
    ...fallback,
    fullName: data.full_name ?? fallback.fullName,
    phone: data.phone ?? fallback.phone,
    memberSince: toIso(data.created_at),
    role: data.role === 'admin' ? 'admin' : 'user',
  };
}

type PendingAccount = { readonly email: string; readonly password: string; readonly fullName: string; readonly phone: string | null };

/** E-postası henüz doğrulanmamış hesap için yerel oturum (Supabase oturum açmaz; kullanıcı doğrulama ekranında bekler). */
const pendingSession = ({ email, fullName, phone }: PendingAccount): Session => ({
  user: {
    id: asUserId(`pending:${email}`),
    email,
    fullName,
    phone,
    emailVerified: false,
    memberSince: new Date().toISOString(),
    role: 'user',
  },
});

const emailNotVerified = () => new AppError({ kind: 'validation', code: 'email_not_verified' });
const errorCode = (error: unknown) => (error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : '');

/**
 * Supabase Auth adapter'ı. Parola yalnızca çağrı argümanıdır; doğrulama bekleyen hesap için "Doğruladım" denemesi yapılabilsin diye
 * YALNIZCA BELLEKTE (`pending`) tutulur, kalıcı depoya yazılmaz ve çıkışta/başarılı doğrulamada silinir.
 */
export function createSupabaseAuth(sb: Supabase): AuthService {
  let pending: PendingAccount | null = null;

  const signInPending = async (account: PendingAccount): Promise<Session> => {
    const { data, error } = await sb.auth.signInWithPassword({ email: account.email, password: account.password });
    if (error) {
      if (errorCode(error) === 'email_not_confirmed') throw emailNotVerified();
      throw toSupabaseError(error);
    }
    pending = null;
    return { user: await profileFor(sb, data.user) };
  };

  return {
    getSession: () =>
      call(async () => {
        const { data } = await sb.auth.getSession();
        if (!data.session) return null;
        // Sunucuda hesap silinmiş/oturum iptal edilmişse yerel oturum temizlenir; çevrimdışıysa yerel oturumla devam edilir.
        const { data: fresh, error } = await sb.auth.getUser();
        if (error) {
          const mapped = toSupabaseError(error);
          if (mapped.kind === 'offline') return { user: await profileFor(sb, data.session.user) };
          await sb.auth.signOut({ scope: 'local' });
          return null;
        }
        return { user: await profileFor(sb, fresh.user) };
      }),

    signIn: ({ email, password }: SignInInput) =>
      call(async () => {
        const fieldErrors: Record<string, string> = {};
        if (!isValidEmail(email)) fieldErrors.email = 'Geçerli bir e-posta girin.';
        if (password === '') fieldErrors.password = 'Şifrenizi girin.';
        if (Object.keys(fieldErrors).length > 0) throw appError.validation(fieldErrors);

        const normalized = normalizeEmail(email);
        const { data, error } = await sb.auth.signInWithPassword({ email: normalized, password });
        if (error) {
          const code = errorCode(error);
          if (code === 'email_not_confirmed') {
            pending = { email: normalized, password, fullName: '', phone: null };
            return pendingSession(pending);
          }
          if (code === 'invalid_credentials' || (error as { status?: number }).status === 400) throw appError.validation({}, 'invalid_credentials');
          throw toSupabaseError(error);
        }
        pending = null;
        return { user: await profileFor(sb, data.user) };
      }),

    signUp: ({ fullName, email, phone, password }: SignUpInput) =>
      call(async () => {
        const fieldErrors: Record<string, string> = {};
        if (!isValidName(fullName)) fieldErrors.fullName = 'Ad soyadınızı girin.';
        if (!isValidEmail(email)) fieldErrors.email = 'Geçerli bir e-posta girin.';
        if (phone !== undefined && !isValidOptionalPhone(phone)) fieldErrors.phone = 'Geçerli bir telefon numarası girin.';
        if (!isValidPassword(password)) fieldErrors.password = PASSWORD_RULE;
        if (Object.keys(fieldErrors).length > 0) throw appError.validation(fieldErrors);

        const account: PendingAccount = {
          email: normalizeEmail(email),
          password,
          fullName: fullName.trim(),
          phone: phone?.trim() ? phone.trim() : null,
        };
        const { data, error } = await sb.auth.signUp({
          email: account.email,
          password,
          options: {
            data: { full_name: account.fullName, ...(account.phone ? { phone: account.phone } : {}) },
            emailRedirectTo: authRedirectUrl('/verify-email'),
          },
        });
        if (error) {
          const code = errorCode(error);
          if (code === 'user_already_exists' || code === 'email_exists') throw appError.validation({ email: 'Bu e-posta ile zaten bir hesap var.' }, 'email_taken');
          if (code === 'weak_password') throw appError.validation({ password: PASSWORD_RULE });
          throw toSupabaseError(error);
        }
        // E-posta doğrulaması açıkken var olan e-posta hata vermez; kimliksiz kullanıcı döner (hesap varlığı bu yolla anlaşılır).
        if (data.user && data.user.identities?.length === 0) throw appError.validation({ email: 'Bu e-posta ile zaten bir hesap var.' }, 'email_taken');
        if (data.session) {
          pending = null;
          return { user: await profileFor(sb, data.session.user) };
        }
        pending = account;
        return pendingSession(account);
      }),

    completeEmailVerification: (linkUrl?: string) =>
      call(async () => {
        if (linkUrl) {
          const user = await establishSessionFromLink(sb, linkUrl);
          pending = null;
          return { user: await profileFor(sb, user) };
        }
        if (pending) return signInPending(pending);
        const { data } = await sb.auth.getSession();
        if (!data.session) throw appError.unauthenticated();
        const { data: refreshed, error } = await sb.auth.refreshSession();
        if (error || !refreshed.user) throw toSupabaseError(error ?? appError.unauthenticated());
        if (!refreshed.user.email_confirmed_at) throw emailNotVerified();
        return { user: await profileFor(sb, refreshed.user) };
      }),

    resendVerificationEmail: () =>
      call(async () => {
        const email = pending?.email ?? (await sb.auth.getSession()).data.session?.user.email;
        if (!email) throw appError.unauthenticated();
        const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl('/verify-email') } });
        if (error) throw toSupabaseError(error);
      }),

    requestPasswordReset: (email: string) =>
      call(async () => {
        if (!isValidEmail(email)) throw appError.validation({ email: 'Geçerli bir e-posta girin.' });
        const { error } = await sb.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: authRedirectUrl('/reset-password') });
        // Hesap yoksa Supabase zaten hata vermez; yalnızca ağ/oran sınırı gibi gerçek hatalar yüzeye çıkar.
        if (error) throw toSupabaseError(error);
      }),

    beginPasswordRecovery: (linkUrl: string) =>
      call(async () => {
        const user = await establishSessionFromLink(sb, linkUrl);
        return { email: user.email ?? '' };
      }),

    completePasswordReset: ({ email, newPassword }) =>
      call(async () => {
        if (!isValidPassword(newPassword)) throw appError.validation({ newPassword: PASSWORD_RULE });
        const { data } = await sb.auth.getSession();
        const sessionEmail = data.session?.user.email;
        if (!sessionEmail || normalizeEmail(sessionEmail) !== normalizeEmail(email)) {
          throw new AppError({ kind: 'validation', code: 'link_invalid' });
        }
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) {
          const code = errorCode(error);
          if (code === 'same_password') throw appError.validation({ newPassword: 'Yeni şifre eski şifrenizle aynı olamaz.' });
          if (code === 'weak_password') throw appError.validation({ newPassword: PASSWORD_RULE });
          throw toSupabaseError(error);
        }
        // Kurtarma oturumu kapatılır: kullanıcı yeni şifresiyle giriş yapar (tasarım 25 → "Girişe dön").
        await sb.auth.signOut({ scope: 'local' });
      }),

    signOut: () =>
      call(async () => {
        pending = null;
        const { error } = await sb.auth.signOut({ scope: 'local' });
        if (error) throw toSupabaseError(error);
      }),
  };
}
