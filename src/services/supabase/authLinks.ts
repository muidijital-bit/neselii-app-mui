import * as Linking from 'expo-linking';

import { AppError } from '@/domain';

import type { Supabase } from './client';

/** E-postadaki bağlantıların uygulamaya döneceği adresler (app.json `scheme`). Supabase Auth → URL Configuration'da izinli olmalı. */
export const authRedirectUrl = (path: '/verify-email' | '/reset-password') => Linking.createURL(path);

export type AuthLinkParams = {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly code?: string;
  readonly type?: string;
  readonly error?: string;
};

/** Hem `#access_token=…` (implicit) hem `?code=…` (PKCE) biçimini ve `#error=…` dönüşünü okur. */
export function parseAuthLink(url: string): AuthLinkParams {
  const params = new URLSearchParams();
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const end = hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : undefined;
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((value, key) => params.set(key, value));
  }
  if (hashIndex !== -1) new URLSearchParams(url.slice(hashIndex + 1)).forEach((value, key) => params.set(key, value));
  return {
    accessToken: params.get('access_token') ?? undefined,
    refreshToken: params.get('refresh_token') ?? undefined,
    code: params.get('code') ?? undefined,
    type: params.get('type') ?? undefined,
    error: params.get('error_code') ?? params.get('error') ?? undefined,
  };
}

/** URL bir kimlik doğrulama dönüşü mü (belirteç, kod ya da hata taşıyor mu)? */
export function isAuthLink(url: string | null | undefined): url is string {
  if (!url) return false;
  const params = parseAuthLink(url);
  return Boolean(params.accessToken || params.code || params.error);
}

const linkInvalid = (cause?: unknown) => new AppError({ kind: 'validation', code: 'link_invalid', cause });

/** Bağlantıdaki belirteçlerle Supabase oturumu kurar ve kullanıcıyı döner. Süresi dolmuş/geçersiz bağlantı → `link_invalid`. */
export async function establishSessionFromLink(sb: Supabase, url: string) {
  const params = parseAuthLink(url);
  if (params.error) throw linkInvalid(params.error);
  if (params.accessToken && params.refreshToken) {
    const { data, error } = await sb.auth.setSession({ access_token: params.accessToken, refresh_token: params.refreshToken });
    if (error || !data.user) throw linkInvalid(error);
    return data.user;
  }
  if (params.code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(params.code);
    if (error || !data.user) throw linkInvalid(error);
    return data.user;
  }
  throw linkInvalid();
}
