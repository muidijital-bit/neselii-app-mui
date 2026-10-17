import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
  /** Şifre sıfırlama bağlantısıyla gelindi; yeni şifre ekranı gösterilmeli */
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Oturum açıldıysa true; e-posta doğrulaması bekleniyorsa false döner */
  signUp: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** E-postadaki bağlantıların açacağı adres (Supabase > Auth > URL Configuration'a eklenmeli) */
const authRedirectUrl = () => Linking.createURL('/');

/** Doğrulama / sıfırlama bağlantısındaki token'larla oturum açar. */
async function handleAuthUrl(url: string) {
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams(`${query}&${fragment}`);

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return params.get('type');
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  return params.get('type');
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const url = Linking.useLinkingURL();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!url) return;
    handleAuthUrl(url)
      .then((type) => {
        if (type === 'recovery') setIsPasswordRecovery(true);
      })
      .catch(() => {
        // Süresi dolmuş ya da kullanılmış bağlantı: kullanıcı giriş ekranında kalır
      });
  }, [url]);

  const value: AuthContextValue = {
    session,
    userId: session?.user.id ?? null,
    isLoading,
    isPasswordRecovery,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp({ email, password, fullName, phone }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone: phone || undefined },
          emailRedirectTo: authRedirectUrl(),
        },
      });
      if (error) throw error;
      return !!data.session;
    },
    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsPasswordRecovery(false);
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}

/** Supabase hata mesajlarını Türkçeleştirir. */
export function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return 'E-posta veya şifre hatalı.';
  if (/email not confirmed/i.test(message)) return 'E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.';
  if (/already registered|already exists/i.test(message)) return 'Bu e-posta adresiyle zaten bir hesap var.';
  if (/rate limit|too many/i.test(message)) return 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
  if (/password should be at least/i.test(message)) return 'Şifre en az 8 karakter olmalı.';
  if (/same.*password|different from the old/i.test(message)) return 'Yeni şifre eskisinden farklı olmalı.';
  if (/network|fetch/i.test(message)) return 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.';
  return message;
}
