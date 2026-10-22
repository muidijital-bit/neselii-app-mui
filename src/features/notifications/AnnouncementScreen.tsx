import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { toAppError, userMessage, type AppNotification } from '@/domain';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { PageHeader } from './PageHeader';
import { notificationTime } from './presentation';
import { useMarkNotificationsRead, useNotificationsQuery } from './useNotificationsQueries';

type Announcement = { readonly notification: AppNotification; readonly title: string; readonly text: string };

/**
 * Duyuru (uygulama içi açıklama): bildirimin hedefindeki `announcementId` ile hesaba süzülmüş bildirim listesinden bulunur; başlık ve metin
 * HER ZAMAN servisten gelir (bağlantı parametresiyle metin taşınmaz). Bulunamayan/başkasının kimliği "Duyuru bulunamadı" durumudur.
 * Duyuru açılınca (ör. giriş sonrası bekleyen hedef) okunmamışsa okundu işaretlenir. Bulunana kadar sonraki sayfalar yüklenir.
 */
export function AnnouncementScreen() {
  const { announcementId } = useLocalSearchParams<{ announcementId?: string | string[] }>();
  const id = typeof announcementId === 'string' ? announcementId : '';
  const router = useRouter();
  const query = useNotificationsQuery();
  const markRead = useMarkNotificationsRead();
  const mark = markRead.mutate;
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  const found = useMemo((): Announcement | null => {
    if (id === '') return null;
    for (const page of query.data?.pages ?? []) {
      for (const notification of page.items) {
        const { target } = notification;
        if (target.type === 'announcement' && target.announcementId === id) return { notification, title: target.title, text: target.body };
      }
    }
    return null;
  }, [id, query.data]);

  // Henüz bulunamadıysa ve sonraki sayfa varsa yükle (sayfalı listede duyuru ilk sayfada olmayabilir).
  useEffect(() => {
    if (id !== '' && !found && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [id, found, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const unreadNotificationId = found && !found.notification.read ? found.notification.id : null;
  useEffect(() => {
    if (unreadNotificationId !== null) mark([unreadNotificationId]);
  }, [unreadNotificationId, mark]);

  // Sıra önemli: hata, "yükleniyor"dan ÖNCE değerlendirilir. Sonraki sayfa isteği başarısız olduğunda `hasNextPage` true kalır ama otomatik yükleme
  // durur (`isFetchNextPageError`); bu durumda sonsuz yükleniyor değil, hata ve doğru yeniden deneme (sonraki sayfa) görünür.
  let body: ReactNode;
  if (id === '') {
    body = <Missing />;
  } else if (found) {
    body = <AnnouncementContent announcement={found} />;
  } else if (query.isError && !isFetchingNextPage && !query.isFetching) {
    const unauthenticated = toAppError(query.error).kind === 'unauthenticated';
    body = (
      <View style={styles.state} testID="announcement-error">
        <StateView
          icon="alert-circle"
          title={unauthenticated ? 'Oturum gerekli' : 'Duyuru yüklenemedi'}
          message={userMessage(query.error)}
          actions={[
            {
              title: unauthenticated ? 'Geri dön' : 'Tekrar dene',
              icon: unauthenticated ? 'arrow-left' : 'refresh-cw',
              onPress: () => {
                if (unauthenticated) {
                  if (router.canGoBack()) router.back();
                  else router.replace('/');
                } else if (isFetchNextPageError) void fetchNextPage();
                else void query.refetch();
              },
            },
          ]}
        />
      </View>
    );
  } else if (query.isPending || isFetchingNextPage || query.isFetching || hasNextPage) {
    body = (
      <View style={styles.state} accessible accessibilityLabel="Duyuru yükleniyor" accessibilityState={{ busy: true }} testID="announcement-loading">
        <StateView loading />
      </View>
    );
  } else {
    body = <Missing />;
  }

  return (
    <View style={styles.container} testID="announcement-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Duyuru" testID="announcement-back" />
      {body}
    </View>
  );
}

function AnnouncementContent({ announcement }: { announcement: Announcement }) {
  const { notification, title, text } = announcement;
  const time = notificationTime(notification.createdAt, Date.now());
  return (
    <ScrollView contentContainerStyle={styles.content} testID="announcement-content">
      <IconTile icon="mci:bullhorn-outline" size={72} />
      <Text variant="title" accessibilityRole="header" testID="announcement-title">
        {title}
      </Text>
      <Text variant="small" testID="announcement-meta">
        {time === '' ? 'Genel duyuru' : `Genel duyuru · ${time}`}
      </Text>
      <Text variant="body" style={styles.body} testID="announcement-text">
        {text}
      </Text>
    </ScrollView>
  );
}

function Missing() {
  return (
    <View style={styles.state} testID="announcement-missing">
      <StateView icon="alert-circle" title="Duyuru bulunamadı" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  state: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  body: { fontSize: 17, lineHeight: 27 },
});
