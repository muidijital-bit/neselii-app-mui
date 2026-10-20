import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  appError,
  asAnnouncementId,
  asConversationId,
  asListingId,
  asNotificationId,
  formatMoney,
  type AppNotification,
  type NotificationId,
  type NotificationKind,
  type NotificationPreferences,
  type NotificationTarget,
  type PageInput,
} from '@/domain';

import type { NotificationsService } from '../contracts';
import type { Supabase } from './client';
import type { Json, Tables } from './database.types';
import { call, offsetOf, pageRange, requireUserId, tlToKurus, toIso, toPage, unwrap , ensure , unwrapMaybe } from './shared';

type Row = Pick<
  Tables<'notifications'>,
  'id' | 'type' | 'title' | 'body' | 'data' | 'created_at' | 'read_at' | 'listing_id' | 'conversation_id' | 'announcement_id'
>;
type AnnouncementRow = Pick<Tables<'announcements'>, 'id' | 'title' | 'body'>;

const COLUMNS = 'id, type, title, body, data, created_at, read_at, listing_id, conversation_id, announcement_id';

/** Sunucu türleri (tetikleyiciler `snake_case` yazar) → domain türü. */
const KIND: Record<string, NotificationKind> = {
  new_listing: 'new-listing',
  saved_search_match: 'saved-search-match',
  price_change: 'price-change',
  status_change: 'status-change',
  message_reply: 'message-reply',
  new_message: 'new-message',
  announcement: 'announcement',
};

const STATUS_LABEL: Record<string, string> = {
  published: 'Yayında',
  reserved: 'Rezerve',
  sold: 'Satıldı',
  unpublished: 'Yayından kalktı',
  draft: 'Taslak',
};

const field = (data: Json, key: string): Json | undefined =>
  data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, Json | undefined>)[key] : undefined;

const money = (value: Json | undefined) => formatMoney({ amountKurus: tlToKurus(typeof value === 'number' || typeof value === 'string' ? value : 0), currency: 'TRY' });

/** Gövde boşsa tetikleyicinin `data` alanından üretilir: fiyat `1.050.000 TL → 985.000 TL`, durum `Yayında → Satıldı` (tasarım 15). */
function bodyOf(row: Row, kind: NotificationKind): string {
  if (row.body?.trim()) return row.body.trim();
  if (kind === 'price-change' && field(row.data, 'old_price') !== undefined) return `${money(field(row.data, 'old_price'))} → ${money(field(row.data, 'new_price'))}`;
  if (kind === 'status-change') {
    const from = String(field(row.data, 'old_status') ?? '');
    const to = String(field(row.data, 'new_status') ?? '');
    if (from && to) return `${STATUS_LABEL[from] ?? from} → ${STATUS_LABEL[to] ?? to}`;
  }
  if (kind === 'announcement') return 'Genel duyuru';
  return '';
}

function targetOf(row: Row, kind: NotificationKind, announcements: Map<string, AnnouncementRow>): NotificationTarget | null {
  if (row.announcement_id) {
    const announcement = announcements.get(row.announcement_id);
    return { type: 'announcement', announcementId: asAnnouncementId(row.announcement_id), title: announcement?.title ?? row.title, body: announcement?.body ?? row.body ?? '' };
  }
  if ((kind === 'message-reply' || kind === 'new-message') && row.conversation_id) return { type: 'conversation', conversationId: asConversationId(row.conversation_id) };
  if (row.listing_id) return { type: 'listing', listingId: asListingId(row.listing_id) };
  if (row.conversation_id) return { type: 'conversation', conversationId: asConversationId(row.conversation_id) };
  return null;
}

type PreferenceRow = Pick<
  Tables<'profiles'>,
  'notify_new_listings' | 'notify_price_changes' | 'notify_status_changes' | 'notify_message_replies' | 'notify_announcements' | 'prefer_nearby'
>;
const PREFERENCE_COLUMNS = 'notify_new_listings, notify_price_changes, notify_status_changes, notify_message_replies, notify_announcements, prefer_nearby';

const toPreferences = (row: PreferenceRow): NotificationPreferences => ({
  newListings: row.notify_new_listings,
  priceChanges: row.notify_price_changes,
  statusChanges: row.notify_status_changes,
  messageReplies: row.notify_message_replies,
  announcements: row.notify_announcements,
  nearbyFirst: row.prefer_nearby,
});

const PREFERENCE_COLUMN: Record<keyof NotificationPreferences, keyof PreferenceRow> = {
  newListings: 'notify_new_listings',
  priceChanges: 'notify_price_changes',
  statusChanges: 'notify_status_changes',
  messageReplies: 'notify_message_replies',
  announcements: 'notify_announcements',
  nearbyFirst: 'prefer_nearby',
};

/** Uygulama içi bildirimler: sunucu tetikleyicileri (`private.notify_*`) üretir, kullanıcı tercihleri `profiles` üzerindedir. */
export function createSupabaseNotifications(sb: Supabase): NotificationsService {
  return {
    list: (input?: PageInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const offset = offsetOf(input?.cursor);
        const [from, to] = pageRange(offset);
        const rows = unwrap(
          await sb.from('notifications').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(from, to),
        ) as Row[];
        const announcementIds = Array.from(new Set(rows.flatMap((row) => (row.announcement_id ? [row.announcement_id] : []))));
        const announcements = new Map<string, AnnouncementRow>();
        if (announcementIds.length > 0) {
          for (const row of unwrap(await sb.from('announcements').select('id, title, body').in('id', announcementIds))) announcements.set(row.id, row);
        }
        const page = toPage(rows, offset, (row): AppNotification | null => {
          const kind = KIND[row.type];
          if (!kind) return null;
          const target = targetOf(row, kind, announcements);
          if (!target) return null;
          return { id: asNotificationId(row.id), kind, title: row.title, body: bodyOf(row, kind), createdAt: toIso(row.created_at), read: row.read_at !== null, target };
        });
        // Tanınmayan tür / hedefsiz kayıt listede gösterilmez (çökmez); sayfalama imleci sunucu satırlarına göre kalır.
        return { items: page.items.filter((item): item is AppNotification => item !== null), nextCursor: page.nextCursor };
      }),

    markRead: (ids: readonly NotificationId[]) =>
      call(async () => {
        if (ids.length === 0) return;
        const userId = await requireUserId(sb);
        ensure(await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).in('id', [...ids]).is('read_at', null));
      }),

    countUnread: () =>
      call(async () => {
        const userId = await requireUserId(sb);
        const { count, error } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
        if (error) throw error;
        return count ?? 0;
      }),

    getPreferences: () =>
      call(async () => {
        const userId = await requireUserId(sb);
        const row = unwrapMaybe(await sb.from('profiles').select(PREFERENCE_COLUMNS).eq('id', userId).maybeSingle());
        return row ? toPreferences(row) : DEFAULT_NOTIFICATION_PREFERENCES;
      }),

    updatePreferences: (patch: Partial<NotificationPreferences>) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const update: Partial<Record<keyof PreferenceRow, boolean>> = {};
        for (const [key, value] of Object.entries(patch) as [keyof NotificationPreferences, boolean | undefined][]) {
          if (typeof value === 'boolean') update[PREFERENCE_COLUMN[key]] = value;
        }
        if (Object.keys(update).length === 0) {
          const row = unwrap(await sb.from('profiles').select(PREFERENCE_COLUMNS).eq('id', userId).single());
          return toPreferences(row);
        }
        const row = unwrapMaybe(await sb.from('profiles').update(update).eq('id', userId).select(PREFERENCE_COLUMNS).maybeSingle());
        if (!row) throw appError.notFound('profile');
        return toPreferences(row);
      }),
  };
}
