import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { PendingTargetConsumer } from '@/features/notifications';
import { useOnboarding } from '@/features/onboarding';
import { Colors } from '@/ui/theme';

import { useSession } from '../session/SessionProvider';

type ScreenOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Lacivert akış (tanıtım, giriş, e-posta doğrulama) ve sekmeler arası korumalı yönlendirme geçişleri. Koruması tutmayan ekran bir kare
 * kendi `contentStyle` zemininde `<Redirect>` çizer, hedef `replace` ile hedef ekranın animasyonuyla gelir. Gri zemin + varsayılan kayma
 * açılışta (lacivert açılış görseli → gri → sağdan kayan tanıtım) ve tanıtım → giriş geçişinde gri flaş bırakıyordu. Bu ekranlar lacivert
 * zeminli ve solarak gelir.
 */
const NAVY_FLOW: ScreenOptions = { animation: 'fade', contentStyle: { backgroundColor: Colors.navy } };

/**
 * Yönlendirme tek yerde, hazır durumdan türer (hydrate + getSession + onboarding okuması bitmiştir):
 *  - onboarding tamamlanmadı → `onboarding`
 *  - tamamlandı, oturum yok   → `(auth)` (giriş / kayıt)
 *  - oturum var, e-posta doğrulanmamış → `verify-email` (e-postadaki bağlantı; sekmelere geçiş ATLANAMAZ)
 *  - oturum var, e-posta doğrulanmış   → `(tabs)`
 * SDK 57: koruması tutmayan rotalar yığından çıkar, yönlendirme yığındaki İLK açık rotaya gider. Bu yüzden sıra önemlidir: her durumda
 * ilk açık rota o durumun giriş ekranıdır (onboarding → (auth) → verify-email → (tabs)).
 * Profildeki "Tanıtımı yeniden göster (test)" (`useOnboarding().reset`) oturumu KAPATMADAN `completed`'ı false yapar: yalnız onboarding
 * koruması açık kalır → `/onboarding`. Tanıtım bitince (`complete`) oturum doğrulanmış olduğundan yalnız sekmeler açıktır → `/` (ana sayfa).
 * Bildirim dış girişi (`notification-target`) korumasızdır: oturum yoksa hedef bekletilir, giriş + doğrulama sonrası `PendingTargetConsumer` açar (015).
 */
export function RootNavigator() {
  const { completed } = useOnboarding();
  const { session } = useSession();
  const verified = session?.user.emailVerified === true;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Protected guard={!completed}>
          <Stack.Screen name="onboarding" options={NAVY_FLOW} />
        </Stack.Protected>
        <Stack.Protected guard={completed && !session}>
          <Stack.Screen name="(auth)" options={NAVY_FLOW} />
        </Stack.Protected>
        <Stack.Protected guard={completed && !!session && !verified}>
          <Stack.Screen name="verify-email" options={NAVY_FLOW} />
        </Stack.Protected>
        <Stack.Protected guard={completed && verified}>
          {/* Sekmeler de solarak gelir; koruması tutmadığında (çıkış, ilk açılış `/`) yönlendirme karesi lacivert kalır, açıkken gri. */}
          <Stack.Screen
            name="(tabs)"
            options={{ animation: 'fade', contentStyle: { backgroundColor: completed && verified ? Colors.background : Colors.navy } }}
          />
          <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
          <Stack.Screen name="results" />
          <Stack.Screen name="listings/[listingId]" />
          <Stack.Screen name="listings/[listingId]/media" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="listings/[listingId]/contact" />
          <Stack.Screen name="conversations/[conversationId]" />
          <Stack.Screen name="announcements/[announcementId]" />
          <Stack.Screen name="notification-unavailable" />
          <Stack.Screen name="edit-profile" />
          {/* Profil menüsü hedefleri: favoriler/aramalar (017), tercihler (018), gizlilik + hesap silme (019) gerçek ekranlardır. */}
          <Stack.Screen name="favorites" />
          <Stack.Screen name="saved-searches" />
          <Stack.Screen name="notification-preferences" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="delete-account" />
        </Stack.Protected>
        <Stack.Screen name="notification-target" />
      </Stack>
      <PendingTargetConsumer />
    </>
  );
}
