import type { Href } from 'expo-router';

/**
 * Sohbet rotası (014): `/conversations/<conversationId>` — liste satırı `Conversation.id` ile açar.
 */
export const conversationHref = (conversationId: string): Href => ({ pathname: '/conversations/[conversationId]', params: { conversationId } });
