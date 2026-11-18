import type { Services } from '../contracts';
import { createSupabaseAdvisors } from './advisors';
import { createSupabaseAuth } from './auth';
import { createSupabaseCallLogs } from './callLogs';
import { createSupabaseCompanies } from './companies';
import { getSupabase } from './client';
import { createSupabaseDocuments } from './documents';
import { createSupabaseFavorites } from './favorites';
import { createSupabaseFinance } from './finance';
import { createSupabaseFleet } from './fleet';
import { createSupabaseGuides } from './guides';
import { createSupabaseLeads } from './leads';
import { createSupabaseListings } from './listings';
import { createSupabaseMessaging } from './messaging';
import { createSupabaseNotifications } from './notifications';
import { createSupabasePackages } from './packages';
import { createSupabaseProfile } from './profile';
import { createSupabaseSavedSearches } from './savedSearches';
import { createSupabaseTradeIns } from './tradeIns';

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
    leads: createSupabaseLeads(sb),
    advisors: createSupabaseAdvisors(sb),
    finance: createSupabaseFinance(sb),
    callLogs: createSupabaseCallLogs(sb),
    tradeIns: createSupabaseTradeIns(sb),
    documents: createSupabaseDocuments(sb),
    companies: createSupabaseCompanies(sb),
    guides: createSupabaseGuides(sb),
    fleet: createSupabaseFleet(sb),
    packages: createSupabasePackages(sb),
  };
}

/** Açık realtime kanallarını kapatır (sağlayıcı kapanırken). */
export function disposeSupabase(): void {
  void getSupabase().removeAllChannels();
}
