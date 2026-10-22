import {
  appError,
  asConversationId,
  asListingId,
  asMessageId,
  type ClientMessageId,
  type Conversation,
  type ConversationId,
  type ListingId,
  type Message,
  type MessagingEvent,
  type PageInput,
  type Unsubscribe,
} from '@/domain';

import type { ListMessagesInput, MessagingService, SendMessageInput } from '../contracts';
import type { Supabase } from './client';
import type { Tables } from './database.types';
import { toListingStatus } from './mappers';
import { call, offsetOf, pageRange, requireUserId, tlToKurus, toIso, toPage, unwrap , unwrapMaybe } from './shared';

type MessageRow = Pick<Tables<'messages'>, 'id' | 'conversation_id' | 'body' | 'is_staff' | 'read_at' | 'created_at'>;
type ConversationRow = Pick<Tables<'conversations'>, 'id' | 'listing_id' | 'last_message' | 'last_message_at' | 'last_message_is_staff'> & {
  listing: Pick<Tables<'listings'>, 'id' | 'title' | 'price' | 'status' | 'cover_url'> | null;
  customer: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'phone'> | null;
};

const MESSAGE_COLUMNS = 'id, conversation_id, body, is_staff, read_at, created_at';
const CONVERSATION_COLUMNS =
  'id, listing_id, last_message, last_message_at, last_message_is_staff, listing:listings(id, title, price, status, cover_url), customer:profiles!conversations_user_id_fkey(id, full_name, phone)';

/**
 * Sohbet yalnızca kullanıcı ↔ Neşeli Otomotiv (firma mesajı `is_staff`, sunucu tetikleyicisi atar); kullanıcı + ilan başına tek sohbet.
 * İletim durumu: kullanıcı mesajı firma tarafından okununca `read`, aksi halde `delivered` (sunucuya ulaştı).
 * `clientMessageId` sunucuda saklanmaz; aynı kimlikle yeniden gönderim bu süreç boyunca ilk sonucu döndürür (mükerrer mesaj yok).
 */
export function createSupabaseMessaging(sb: Supabase): MessagingService {
  const sentByClientId = new Map<ClientMessageId, Promise<Message>>();
  const clientIdByMessageId = new Map<string, ClientMessageId>();

  const toMessage = (row: MessageRow): Message => {
    const clientMessageId = clientIdByMessageId.get(row.id);
    return {
      id: asMessageId(row.id),
      conversationId: asConversationId(row.conversation_id),
      ...(clientMessageId ? { clientMessageId } : {}),
      sender: row.is_staff ? 'company' : 'user',
      text: row.body,
      sentAt: toIso(row.created_at),
      // Karşı taraf okuyunca `read`: müşteri mesajını yönetici, yönetici mesajını müşteri okur (`mark_conversation_read`).
      status: row.read_at ? 'read' : 'delivered',
    };
  };

  const toConversation = (row: ConversationRow, unread: number): Conversation => ({
    id: asConversationId(row.id),
    listing: row.listing
      ? {
          id: asListingId(row.listing.id),
          title: row.listing.title,
          price: { amountKurus: tlToKurus(row.listing.price), currency: 'TRY' },
          status: toListingStatus(row.listing.status),
          coverImageUri: row.listing.cover_url,
        }
      : // İlan yayından kalktıysa RLS ilanı gizler; sohbet yine listelenir.
        { id: asListingId(row.listing_id), title: 'Yayından kalkmış ilan', price: { amountKurus: 0, currency: 'TRY' }, status: 'withdrawn', coverImageUri: null },
    customer: row.customer ? { id: row.customer.id, fullName: row.customer.full_name?.trim() || 'Müşteri', phone: row.customer.phone } : null,
    lastMessage: row.last_message
      ? {
          id: asMessageId(`last-${row.id}`),
          conversationId: asConversationId(row.id),
          sender: row.last_message_is_staff ? 'company' : 'user',
          text: row.last_message,
          sentAt: toIso(row.last_message_at),
          status: 'delivered',
        }
      : null,
    unreadCount: unread,
    updatedAt: toIso(row.last_message_at),
  });

  /** Okunmamış sayıları (firma mesajları) sohbet kimliğine göre. Görünüm `security_invoker`: yalnızca kullanıcının sohbetleri. */
  const unreadFor = async (ids: readonly string[]): Promise<Map<string, number>> => {
    if (ids.length === 0) return new Map();
    const rows = unwrap(await sb.from('conversation_unread').select('conversation_id, unread_count').in('conversation_id', [...ids]));
    return new Map(rows.flatMap((row) => (row.conversation_id ? [[row.conversation_id, row.unread_count ?? 0] as const] : [])));
  };

  const fetchConversation = async (id: string): Promise<Conversation> => {
    // Kullanıcı filtresi yok: RLS müşteriye yalnız kendi sohbetlerini, yöneticiye hepsini gösterir.
    const row = unwrapMaybe(await sb.from('conversations').select(CONVERSATION_COLUMNS).eq('id', id).maybeSingle()) as unknown as ConversationRow | null;
    if (!row) throw appError.notFound(`conversation ${id}`);
    const unread = await unreadFor([row.id]);
    return toConversation(row, unread.get(row.id) ?? 0);
  };

  /** Oturumdaki kullanıcı yönetici mi (gizleme sütunu buna göre seçilir: yönetici `staff_hidden_at`, müşteri `user_hidden_at`). */
  const isAdmin = async (userId: string): Promise<boolean> => {
    const row = unwrapMaybe(await sb.from('profiles').select('role').eq('id', userId).maybeSingle());
    return row?.role === 'admin';
  };

  const markRead = async (conversationId: string) => {
    const { error } = await sb.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    if (error) throw error;
  };

  return {
    listConversations: (input?: PageInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const offset = offsetOf(input?.cursor);
        const [from, to] = pageRange(offset);
        // Bu tarafın gizlediği sohbetler listede yok (yalnız listeden; `fetchConversation` gizliyi de açar). Yeni mesaj gizlemeyi sunucuda kaldırır.
        const hiddenColumn = (await isAdmin(userId)) ? 'staff_hidden_at' : 'user_hidden_at';
        const rows = unwrap(
          // Kullanıcı filtresi yok: RLS müşteriye yalnız kendi sohbetlerini, yöneticiye tüm müşterilerinkini verir.
          await sb
            .from('conversations')
            .select(CONVERSATION_COLUMNS)
            .is(hiddenColumn, null)
            .order('last_message_at', { ascending: false })
            .order('id')
            .range(from, to),
        ) as unknown as ConversationRow[];
        const unread = await unreadFor(rows.map((row) => row.id));
        return toPage(rows, offset, (row) => toConversation(row, unread.get(row.id) ?? 0));
      }),

    getOrCreateConversation: (listingId: ListingId) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const existing = unwrapMaybe(await sb.from('conversations').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle());
        if (existing) return fetchConversation(existing.id);
        const listing = unwrapMaybe(await sb.from('listings').select('id').eq('id', listingId).maybeSingle());
        if (!listing) throw appError.notFound(`listing ${listingId}`);
        // Sohbetlerde UPDATE politikası yok: upsert yerine insert. Eşzamanlı ikinci istek benzersizlik ihlali (23505) alır ve mevcut kaydı okur.
        const inserted = await sb.from('conversations').insert({ listing_id: listingId, user_id: userId }).select('id').single();
        if (inserted.error && inserted.error.code === '23505') {
          const raced = unwrap(await sb.from('conversations').select('id').eq('listing_id', listingId).eq('user_id', userId).single());
          return fetchConversation(raced.id);
        }
        return fetchConversation(unwrap(inserted).id);
      }),

    listMessages: ({ conversationId, cursor }: ListMessagesInput) =>
      call(async () => {
        await requireUserId(sb);
        const offset = offsetOf(cursor);
        const [from, to] = pageRange(offset);
        const rows = unwrap(
          await sb
            .from('messages')
            .select(MESSAGE_COLUMNS)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to),
        );
        // Sorgu yeniden eskiye; sayfa içi sıra eskiden yeniye çevrilir. Erişim yoksa RLS boş döner → sohbet bulunamadı.
        if (offset === 0 && rows.length === 0) {
          const visible = unwrapMaybe(await sb.from('conversations').select('id').eq('id', conversationId).maybeSingle());
          if (!visible) throw appError.notFound(`conversation ${conversationId}`);
        }
        const page = toPage(rows, offset, toMessage);
        return { items: [...page.items].reverse(), nextCursor: page.nextCursor };
      }),

    sendMessage: ({ conversationId, clientMessageId, text }: SendMessageInput) => {
      const body = text.trim();
      if (body === '') return Promise.reject(appError.validation({ text: 'Mesaj boş olamaz.' }));
      const previous = sentByClientId.get(clientMessageId);
      if (previous) return previous;
      const attempt = call(async () => {
        const userId = await requireUserId(sb);
        const row = unwrap(await sb.from('messages').insert({ conversation_id: conversationId, sender_id: userId, body }).select(MESSAGE_COLUMNS).single());
        clientIdByMessageId.set(row.id, clientMessageId);
        return toMessage(row);
      });
      sentByClientId.set(clientMessageId, attempt);
      // Başarısız deneme önbellekte kalmaz: aynı kimlikle "Tekrar dene" yeni bir gönderim yapar.
      attempt.catch(() => sentByClientId.delete(clientMessageId));
      return attempt;
    },

    markConversationRead: (conversationId: ConversationId) =>
      call(async () => {
        await requireUserId(sb);
        await markRead(conversationId);
        return fetchConversation(conversationId);
      }),

    countUnread: () =>
      call(async () => {
        await requireUserId(sb);
        const rows = unwrap(await sb.from('conversation_unread').select('unread_count'));
        return rows.reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
      }),

    hideConversation: (conversationId: ConversationId) =>
      call(async () => {
        await requireUserId(sb);
        // Sunucu çağıranın rolüne göre ilgili gizleme sütununu yazar, bu taraftaki okunmamışları ve mesaj bildirimlerini okundu yapar.
        // Okunmamış görünümü (`conversation_unread`) yalnız bu tarafın okunmamışlarını saydığından sekme rozeti de düşer.
        const { error } = await sb.rpc('hide_conversation', { p_conversation_id: conversationId });
        if (error?.code === 'P0002') throw appError.notFound(`conversation ${conversationId}`);
        if (error) throw error;
      }),

    subscribe: (conversationId: ConversationId, listener: (event: MessagingEvent) => void): Unsubscribe => {
      const channel = sb
        .channel(`messages:${conversationId}:${Date.now().toString(36)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          const row = payload.new as MessageRow;
          listener({ type: 'message', message: toMessage(row) });
          // Abone (ekran görünür) varken gelen firma yanıtı "görüldü" sayılır.
          if (row.is_staff) void markRead(conversationId).catch(() => undefined);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          const row = payload.new as MessageRow;
          if (!row.is_staff && row.read_at) listener({ type: 'status', messageId: asMessageId(row.id), status: 'read' });
        })
        .subscribe();
      return () => {
        void sb.removeChannel(channel);
      };
    },
  };
}
