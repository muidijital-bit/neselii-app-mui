import { Stack, type Href } from 'expo-router';

import { PendingTargetConsumer } from '@/features/notifications';
import { useOnboarding } from '@/features/onboarding';

import { useSession } from '../session/SessionProvider';

/**
 * Yönlendirme tek yerde, hazır durumdan türer (hydrate + getSession + onboarding okuması bitmiştir):
 *  - onboarding tamamlanmadı → `onboarding`
 *  - tamamlandı, oturum yok   → `(auth)` (giriş / kayıt)
 *  - oturum var, e-posta doğrulanmamış → `verify-email` (e-postadaki bağlantı; sekmelere geçiş ATLANAMAZ)
 *  - oturum var, e-posta doğrulanmış   → `(tabs)`
 * SDK 58: korumalı rotalar kayıtlı kalır, koruması tutmayan rota `redirectTo`'ya yönlenir. Hedef her durumda o durumun giriş ekranıdır
 * (`home`); verilmezse kökte anchor olmadığından `/` kendine yönlenip "Unmatched Route" olur.
 * Bildirim dış girişi (`notification-target`) korumasızdır: oturum yoksa hedef bekletilir, giriş + doğrulama sonrası `PendingTargetConsumer` açar (015).
 */
export function RootNavigator() {
  const { completed } = useOnboarding();
  const { session } = useSession();
  const verified = session?.user.emailVerified === true;
  const home: Href = !completed ? '/onboarding' : !session ? '/login' : !verified ? '/verify-email' : '/';

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!completed} redirectTo={home}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={completed && !session} redirectTo={home}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={completed && !!session && !verified} redirectTo={home}>
          <Stack.Screen name="verify-email" />
        </Stack.Protected>
        <Stack.Protected guard={completed && verified} redirectTo={home}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="filters" />
          <Stack.Screen name="results" />
          <Stack.Screen name="listings/[listingId]" />
          <Stack.Screen name="listings/[listingId]/media" />
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
