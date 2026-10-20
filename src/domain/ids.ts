/**
 * Alan kimlikleri sabit string'lerdir. Marka (brand) yalnızca derleme zamanında vardır: bir `ListingId` yanlışlıkla
 * `ConversationId` yerine geçirilemez (bildirim hedefleri ve sohbet-ilan bağları için önemli). Çalışma zamanında düz string.
 */
type Brand<Name extends string> = string & { readonly __id: Name };

export type UserId = Brand<'User'>;
export type ListingId = Brand<'Listing'>;
export type MediaId = Brand<'Media'>;
export type ConversationId = Brand<'Conversation'>;
export type MessageId = Brand<'Message'>;
/** İstemcinin ürettiği, yeniden denemelerde aynı kalan gönderim kimliği (mükerrer mesajı önler). */
export type ClientMessageId = Brand<'ClientMessage'>;
export type NotificationId = Brand<'Notification'>;
export type AnnouncementId = Brand<'Announcement'>;
export type SavedSearchId = Brand<'SavedSearch'>;

export const asUserId = (value: string) => value as UserId;
export const asListingId = (value: string) => value as ListingId;
export const asMediaId = (value: string) => value as MediaId;
export const asConversationId = (value: string) => value as ConversationId;
export const asMessageId = (value: string) => value as MessageId;
export const asClientMessageId = (value: string) => value as ClientMessageId;
export const asNotificationId = (value: string) => value as NotificationId;
export const asAnnouncementId = (value: string) => value as AnnouncementId;
export const asSavedSearchId = (value: string) => value as SavedSearchId;
