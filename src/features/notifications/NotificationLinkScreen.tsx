import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useOnboarding } from '@/features/onboarding';
import { useSession } from '@/features/session/SessionProvider';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Colors } from '@/ui/theme';

import { NOTIFICATION_UNAVAILABLE_HREF } from './routes';
import { resolveNotificationTarget, targetFromLinkParams } from './targets';

/**
 * Bildirim dokunuşunun dış girişi (`neseli://notification-target?type=…&id=…`; ileride gerçek push dokunuşu da buraya düşer). Oturum
 * durumuna göre:
 *  - doğrulanmış oturum: hedef çözülür ve bu ekranın YERİNE açılır (geri, ana sayfaya düşer); geçersiz hedef güvenli "ulaşılamıyor" ekranıdır.
 *  - oturum yok / doğrulanmamış: geçerli hedef bellekte saklanır (`pendingTarget`) ve kullanıcı ulaşabileceği ilk akış ekranına (onboarding / giriş /
 *    doğrulama) yönlenir; hedef giriş ve doğrulama sonrası `PendingTargetConsumer` ile açılır. Geçersiz hedef saklanmaz.
 * Gerçek push yoktur; bu giriş yalnızca bağlantı şemasıyla çalışır.
 */
export function NotificationLinkScreen() {
  const params = useLocalSearchParams<{ type?: string | string[]; id?: string | string[] }>();
  const router = useRouter();
  const { session, pendingTarget } = useSession();
  const { completed } = useOnboarding();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return; // StrictMode çift çalıştırmasında bir kez
    handled.current = true;
    const target = targetFromLinkParams(params);
    const verified = session?.user.emailVerified === true;

    if (verified) {
      const resolution = resolveNotificationTarget(target);
      router.replace(resolution.status === 'ok' ? resolution.href : NOTIFICATION_UNAVAILABLE_HREF);
      return;
    }
    if (target) pendingTarget.hold(target);
    // Korumalı ana sayfaya değil, kullanıcının gerçekten ulaşabileceği ilk ekrana (RootNavigator ile aynı sıra) yönlendir.
    router.replace(!completed ? '/onboarding' : !session ? '/login' : '/verify-email');
  }, [completed, params, pendingTarget, router, session]);

  return (
    <View style={styles.center} testID="notification-link-screen">
      <FocusStatusBar style="dark" />
      <ActivityIndicator color={Colors.navy} accessibilityLabel="Bildirim açılıyor" />
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface } });
