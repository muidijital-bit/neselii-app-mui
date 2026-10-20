import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

export type Supabase = SupabaseClient<Database>;

let client: Supabase | null = null;
let appStateBound = false;

/**
 * Uygulamanın TEK Supabase istemcisi (neseli-app-mui). İlk kullanımda üretilir; oturum expo-sqlite tabanlı `localStorage`'da
 * kalıcıdır. URL ve publishable key `.env.local` içindeki `EXPO_PUBLIC_*` değişkenlerinden paketleme sırasında gelir.
 */
export function getSupabase(): Supabase {
  if (client) return client;

  // Expo `EXPO_PUBLIC_*` değişkenlerini yalnızca STATİK `process.env.ADI` ifadesinde satıriçi yapar.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY .env.local içinde tanımlanmalı.');
  }

  client = createClient<Database>(url, key, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // E-posta doğrulama / şifre sıfırlama bağlantıları uygulama içinde `handleAuthRedirect` ile işlenir.
      detectSessionInUrl: false,
    },
  });

  // Uygulama ön plandayken token yenilemeyi sürdür, arka planda durdur.
  if (Platform.OS !== 'web' && !appStateBound) {
    appStateBound = true;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }

  return client;
}
