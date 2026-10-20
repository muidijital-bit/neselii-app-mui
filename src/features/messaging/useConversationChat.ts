import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { asClientMessageId, asConversationId, toAppError, type AppError, type ClientMessageId, type Message, type MessageDeliveryStatus, type Page } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

import { messagingKeys, useMessagesQuery } from './useMessagingQueries';

/** Henüz sunucu mesajına dönüşmemiş giden mesaj: `sending` bekler, `failed` kullanıcıdan "Tekrar dene" bekler. */
export type PendingMessage = {
  readonly clientMessageId: ClientMessageId;
  readonly text: string;
  readonly state: 'sending' | 'failed';
  readonly error: AppError | null;
};

type MessagesData = InfiniteData<Page<Message>, string | undefined>;

/** Önbelleğe mesaj ekler (kimliğe göre tekrar yok). Önbellek yoksa oluşturmaz: yüklenmemiş sohbete kısmi veri yazılmaz. */
export function appendMessage(data: MessagesData | undefined, message: Message): MessagesData | undefined {
  if (!data || data.pages.length === 0) return data;
  if (data.pages.some((page) => page.items.some((item) => item.id === message.id))) return data;
  const [newest, ...older] = data.pages;
  return { ...data, pages: [{ ...newest, items: [...newest.items, message] }, ...older] };
}

export function applyStatus(data: MessagesData | undefined, messageId: string, status: MessageDeliveryStatus): MessagesData | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => (item.id === messageId ? { ...item, status } : item)) })) };
}

let sequence = 0;
/** Cihaz içinde benzersiz istemci kimliği; yeniden gönderimde AYNI değer kullanılır. */
const newClientMessageId = () => asClientMessageId(`cm_${Date.now().toString(36)}_${(sequence++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`);

/**
 * Sohbet ekranının mantığı: mesaj sayfaları (TanStack), gönderim (iyimser "gönderiliyor" → sunucu mesajı / "gönderilemedi" + aynı
 * `clientMessageId` ile yeniden deneme) ve canlı abonelik (firma yanıtı, iletildi/okundu).
 *
 * Oturum koruması: her gönderim/olay, başladığı kullanıcıya bağlıdır. Ekran kapanınca (`unmount`), kullanıcı çıkış yapınca ya da
 * başka kullanıcı girince gecikmiş yanıtlar ne yerel duruma ne sorgu önbelleğine yazılır; abonelik efekt temizliğinde bırakılır.
 */
export function useConversationChat(conversationId: string, visible: boolean) {
  const { messaging } = useServices();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const messagesQuery = useMessagesQuery(conversationId);
  const [pending, setPending] = useState<readonly PendingMessage[]>([]);

  // Gecikmiş sonuçlar bu "yaşam belirteci"ne bakar: ekran bu kullanıcı + sohbet için hâlâ canlı mı?
  const liveRef = useRef({ userId, conversationId, mounted: true });
  liveRef.current = { userId, conversationId, mounted: liveRef.current.mounted };
  useEffect(() => {
    liveRef.current.mounted = true;
    return () => {
      liveRef.current.mounted = false;
    };
  }, []);

  const loaded = messagesQuery.isSuccess;

  // Canlı abonelik: yalnızca sohbet yüklendikten (erişim doğrulandıktan) VE ekran görünürken (odakta + ön planda). Abone varken servis
  // gelen yanıtı "görüldü" sayar; odaksız/arka plandaki mount sohbet bu yüzden abone OLMAZ ve yanıt okunmamış kalır. Ekran/kullanıcı/
  // sohbet/görünürlük değişince bırakılır.
  useEffect(() => {
    if (!loaded || !visible || userId === null) return undefined;
    const messagesKey = messagingKeys.messages(userId, conversationId);
    let off: (() => void) | undefined;
    try {
      off = messaging.subscribe(asConversationId(conversationId), (event) => {
        if (liveRef.current.userId !== userId) return;
        if (event.type === 'message') {
          queryClient.setQueryData<MessagesData>(messagesKey, (data) => appendMessage(data, event.message));
          void queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) });
          void queryClient.invalidateQueries({ queryKey: messagingKeys.unread(userId) });
        } else {
          queryClient.setQueryData<MessagesData>(messagesKey, (data) => applyStatus(data, event.messageId, event.status));
        }
      });
    } catch {
      off = undefined; // abonelik kurulamadıysa sohbet yine de okunur/yazılır; canlı olay gelmez
    }
    return () => off?.();
  }, [loaded, visible, userId, conversationId, messaging, queryClient]);

  // Görünmezken (abone yokken) gelen yanıtlar olay olarak ulaşmaz: ekran yeniden görünür olunca mesajlar sunucudan yenilenir.
  const { refetch } = messagesQuery;
  const wasHidden = useRef(false);
  useEffect(() => {
    if (!visible) {
      wasHidden.current = true;
      return;
    }
    if (!loaded || !wasHidden.current) return;
    wasHidden.current = false;
    void refetch();
  }, [visible, loaded, refetch]);

  const attempt = useCallback(
    (item: Pick<PendingMessage, 'clientMessageId' | 'text'>) => {
      const startedFor = { userId, conversationId };
      const alive = () => liveRef.current.mounted && liveRef.current.userId === startedFor.userId && liveRef.current.conversationId === startedFor.conversationId;
      messaging
        .sendMessage({ conversationId: asConversationId(conversationId), clientMessageId: item.clientMessageId, text: item.text })
        .then((message) => {
          if (!alive()) return;
          queryClient.setQueryData<MessagesData>(messagingKeys.messages(startedFor.userId, conversationId), (data) => appendMessage(data, message));
          setPending((list) => list.filter((entry) => entry.clientMessageId !== item.clientMessageId));
          void queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(startedFor.userId) });
        })
        .catch((error: unknown) => {
          if (!alive()) return;
          setPending((list) => list.map((entry) => (entry.clientMessageId === item.clientMessageId ? { ...entry, state: 'failed', error: toAppError(error) } : entry)));
        });
    },
    [messaging, queryClient, userId, conversationId],
  );

  /** Boş/yalnız boşluk metni yok sayar ve `false` döner (çağıran alanı temizlemez). */
  const send = useCallback(
    (rawText: string): boolean => {
      const text = rawText.trim();
      if (text === '' || userId === null) return false;
      const item: PendingMessage = { clientMessageId: newClientMessageId(), text, state: 'sending', error: null };
      setPending((list) => [...list, item]);
      attempt(item);
      return true;
    },
    [attempt, userId],
  );

  /** Başarısız mesajı AYNI `clientMessageId` ile yeniden gönderir: sunucu ilk denemeyi almışsa mükerrer oluşmaz. */
  const retry = useCallback(
    (clientMessageId: ClientMessageId) => {
      const item = pending.find((entry) => entry.clientMessageId === clientMessageId);
      if (!item || item.state !== 'failed') return;
      setPending((list) => list.map((entry) => (entry.clientMessageId === clientMessageId ? { ...entry, state: 'sending', error: null } : entry)));
      attempt(item);
    },
    [attempt, pending],
  );

  const messages = (messagesQuery.data ? [...messagesQuery.data.pages].reverse() : []).flatMap((page) => page.items);
  return { query: messagesQuery, messages, pending, send, retry };
}
