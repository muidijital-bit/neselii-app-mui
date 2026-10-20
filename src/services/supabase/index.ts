import type { Services } from '../contracts';
import { createSupabaseAuth } from './auth';
import { getSupabase } from './client';
import { createSupabaseFavorites } from './favorites';
import { createSupabaseListings } from './listings';
import { createSupabaseMessaging } from './messaging';
import { createSupabaseNotifications } from './notifications';
import { createSupabaseProfile } from './profile';
import { createSupabaseSavedSearches } from './savedSearches';

export { isAuthLink } from './authLinks';

/** Tüm servisleri tek Supabase istemcisi üzerinde kurar. */
export function createSupabaseServices(): Services {
  const sb = getSupabase();
  return {
    auth: createSupabaseAuth(sb),
    profile: createSupabaseProfile(sb),
    listings: createSupabaseListings(sb),
    favorites: createSupabaseFavorites(sb),
    savedSearches: createSupabaseSavedSearches(sb),
    messaging: createSupabaseMessaging(sb),
    notifications: createSupabaseNotifications(sb),
  };
}

/** Açık realtime kanallarını kapatır (sağlayıcı kapanırken). */
export function disposeSupabase(): void {
  void getSupabase().removeAllChannels();
}
