import type { Href } from 'expo-router';

import { parseNotificationTarget, type NotificationTarget } from '@/domain';
import { listingHref } from '@/features/listings/routes';
import { conversationHref } from '@/features/messaging/routes';

import { announcementHref } from './routes';

export type TargetResolution = { readonly status: 'ok'; readonly href: Href } | { readonly status: 'invalid' };

const INVALID: TargetResolution = { status: 'invalid' };

function assertNever(value: never): never {
  throw new Error(`Çözümlenmeyen bildirim hedefi: ${JSON.stringify(value)}`);
}

/** Tipli hedefi rotaya çevirir. Derleyici yeni bir hedef türünün buraya eklenmesini zorunlu kılar (`never` denetimi). */
function hrefFor(target: NotificationTarget): Href {
  switch (target.type) {
    case 'listing':
      return listingHref(target.listingId);
    case 'conversation':
      return conversationHref(target.conversationId);
    case 'announcement':
      return announcementHref(target.announcementId);
    default:
      return assertNever(target);
  }
}

/**
 * Tip güvenli hedef çözümleyici. Girdi güvenilmeyen olabilir (derin bağlantı, ileride push yükü, bozuk fixture): bilinmeyen tür,
 * eksik/boş/yol karakteri taşıyan kimlik ve yanlış tipler `invalid` verir — hiçbir koşulda istisna fırlatmaz. Kimliğin gerçekten
 * var olup olmadığı burada denetlenmez; hedef ekranlar (ilan/sohbet/duyuru) "bulunamadı" durumunu kendileri gösterir ve sahiplik
 * süzmesi servis katmanındadır (başkasının sohbeti yalnızca "bulunamadı" olarak görünür).
 */
export function resolveNotificationTarget(input: unknown): TargetResolution {
  const target = parseNotificationTarget(input);
  return target === null ? INVALID : { status: 'ok', href: hrefFor(target) };
}

type LinkParams = Readonly<Record<string, string | readonly string[] | undefined>>;

const LINK_ID_KEYS = { listing: 'listingId', conversation: 'conversationId', announcement: 'announcementId' } as const;

/**
 * Dış bağlantı parametrelerini (`type`, `id`) tipli hedefe çevirir; eksik/dizi/bilinmeyen tür/güvenli olmayan kimlik → `null`.
 * Duyuru metni bağlantıyla TAŞINMAZ (sahte içerik gösterimini önlemek için): ekran metni servisten okur.
 */
export function targetFromLinkParams(params: LinkParams): NotificationTarget | null {
  const { type, id } = params;
  if (typeof type !== 'string' || typeof id !== 'string' || !Object.hasOwn(LINK_ID_KEYS, type)) return null;
  return parseNotificationTarget({ type, [LINK_ID_KEYS[type as keyof typeof LINK_ID_KEYS]]: id });
}
