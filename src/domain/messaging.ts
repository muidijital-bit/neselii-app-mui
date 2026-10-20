import type { IsoDateTime, Money } from './common';
import type { ClientMessageId, ConversationId, ListingId, MessageId } from './ids';
import type { ListingStatus } from './listing';

/**
 * Sohbet yalnızca kullanıcı ile Neşeli Otomotiv arasındadır ve bir ilana bağlıdır; kullanıcılar arası yol yoktur.
 * Kullanıcı + ilan başına tek sohbet vardır.
 */
export type MessageSender = 'user' | 'company';

/** Servisin bildirdiği iletim durumu (tasarımdaki tek/çift/mavi tik). `sending`/`failed` istemci tarafı durumlarıdır. */
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';

export type Message = {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  /** Kullanıcı mesajlarında istemcinin kimliği; yeniden gönderim aynı kimlikle yapılır. Firma mesajlarında yok. */
  readonly clientMessageId?: ClientMessageId;
  readonly sender: MessageSender;
  readonly text: string;
  readonly sentAt: IsoDateTime;
  readonly status: MessageDeliveryStatus;
};

/** Sohbet listesinde ilanın özeti; ilan sonradan değişse de başlık/fiyat gösterilebilsin diye kopyalanır. */
export type ConversationListing = {
  readonly id: ListingId;
  readonly title: string;
  readonly price: Money;
  readonly status: ListingStatus;
  readonly coverImageUri: string | null;
};

/** Sohbeti başlatan müşteri (yönetici gelen kutusunda gösterilir). */
export type ConversationCustomer = {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string | null;
};

export type Conversation = {
  readonly id: ConversationId;
  readonly listing: ConversationListing;
  /** Müşteri bilgisi; müşteri kendi sohbetlerinde de alır, yönetici tüm müşterilerinkini görür. */
  readonly customer: ConversationCustomer | null;
  readonly lastMessage: Message | null;
  readonly unreadCount: number;
  readonly updatedAt: IsoDateTime;
};

/** `subscribe` olayları. Abone, ekran kapanınca dönen `Unsubscribe` ile ayrılmalıdır. */
export type MessagingEvent =
  | { readonly type: 'message'; readonly message: Message }
  | { readonly type: 'status'; readonly messageId: MessageId; readonly status: MessageDeliveryStatus };
