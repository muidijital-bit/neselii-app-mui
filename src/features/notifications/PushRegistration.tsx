import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useSession } from '@/features/session/SessionProvider';
import { usePermissions } from '@/permissions';
import { useServices } from '@/services';

import { useOpenNotificationTarget } from './useOpenNotificationTarget';

// Native modül ilk gerçek kullanımda yüklenir (izin adaptörüyle aynı desen).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- bilinçli tembel yükleme
const notifications = () => require('expo-notifications') as typeof import('expo-notifications');

let handlerInstalled = false;

/** Uygulama açıkken gelen push da banner olarak gösterilir. */
function installForegroundHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  notifications().setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? Constants.easConfig?.projectId ?? undefined;

/** Push yükündeki hedef (`data.target`): uygulama içi bildirim hedefiyle aynı biçim; doğrulamayı `useOpenNotificationTarget` yapar. */
const targetOf = (data: unknown): unknown => (data && typeof data === 'object' ? (data as Record<string, unknown>).target : undefined);

/**
 * Madde 6: telefona bildirim. Oturum açık ve doğrulanmış, sistem bildirim izni VERİLMİŞSE cihazın Expo push belirteci alınır ve hesaba bağlanır
 * (izin burada İSTENMEZ; tanıtım ve tercihler ekranı ister). Uygulama öne geldiğinde yeniden denetlenir (izin sonradan verilmiş olabilir).
 * Push'a dokununca ilgili ekran (ilan, sohbet, talep, duyuru) açılır; uygulama açıkken gelen push bildirim listesini ve sayacı yeniler.
 * Expo Go (Android) gibi push desteklemeyen ortamlarda sessizce hiçbir şey yapmaz. Hiçbir şey çizmez; `RootNavigator` içinde bir kez bağlanır.
 */
export function PushRegistration() {
  const { session } = useSession();
  const permissions = usePermissions();
  const { notifications: service } = useServices();
  const queryClient = useQueryClient();
  const open = useOpenNotificationTarget();
  const registered = useRef<{ userId: string; token: string } | null>(null);
  const handled = useRef(new Set<string>());
  const userId = session?.user.emailVerified ? session.user.id : null;

  // Belirteç kaydı
  useEffect(() => {
    if (!userId) {
      registered.current = null;
      return;
    }
    let cancelled = false;
    const register = async () => {
      try {
        if ((await permissions.getNotificationState()).status !== 'granted') return;
        const Notifications = notifications();
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', { name: 'Genel', importance: Notifications.AndroidImportance.DEFAULT });
        }
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
        if (cancelled || (registered.current?.userId === userId && registered.current.token === token)) return;
        await service.registerPushToken(token);
        if (!cancelled) registered.current = { userId, token };
      } catch {
        // Push desteklenmiyor (Expo Go Android, simülatör) ya da ağ hatası: uygulama içi bildirimler çalışmaya devam eder.
      }
    };
    void register();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void register();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, permissions, service]);

  // Dokunma ve ön planda gelen push
  useEffect(() => {
    if (!userId) return;
    let Notifications: ReturnType<typeof notifications>;
    try {
      Notifications = notifications();
      installForegroundHandler();
    } catch {
      return;
    }
    const openResponse = (response: import('expo-notifications').NotificationResponse) => {
      const { identifier, content } = response.notification.request;
      if (handled.current.has(identifier)) return;
      handled.current.add(identifier);
      const target = targetOf(content.data);
      if (target) open(target);
    };
    const responses = Notifications.addNotificationResponseReceivedListener(openResponse);
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      void queryClient.invalidateQueries({ queryKey: ['leads', userId] });
    });
    // Uygulama kapalıyken push'a dokunularak açıldıysa
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) openResponse(response);
      })
      .catch(() => undefined);
    return () => {
      responses.remove();
      received.remove();
    };
  }, [userId, open, queryClient]);

  return null;
}
