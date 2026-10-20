import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { toAppError, userMessage, type AppNotification } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { colors, radii, spacing, textStyles } from '@/theme';

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
  let body;
  if (id === '') {
    body = <Missing />;
  } else if (found) {
    body = <AnnouncementContent announcement={found} />;
  } else if (query.isError && !isFetchingNextPage && !query.isFetching) {
    const unauthenticated = toAppError(query.error).kind === 'unauthenticated';
    body = (
      <StateMessage
        icon="info"
        title={unauthenticated ? 'Oturum gerekli' : 'Duyuru yüklenemedi'}
        message={userMessage(query.error)}
        actionLabel={unauthenticated ? 'Geri dön' : 'Tekrar dene'}
        actionIcon={unauthenticated ? 'arrow-left' : 'refresh-cw'}
        onAction={() => {
          if (unauthenticated) {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          } else if (isFetchNextPageError) void fetchNextPage();
          else void query.refetch();
        }}
        testID="announcement-error"
      />
    );
  } else if (query.isPending || isFetchingNextPage || query.isFetching || hasNextPage) {
    body = <Loading />;
  } else {
    body = <Missing />;
  }

  return (
    <Screen background={colors.white} edges={['top', 'left', 'right', 'bottom']} testID="announcement-screen">
      <PageHeader title="Duyuru" testID="announcement-back" />
      <ScrollView contentContainerStyle={styles.body}>{body}</ScrollView>
    </Screen>
  );
}

function AnnouncementContent({ announcement }: { announcement: Announcement }) {
  const { notification, title, text } = announcement;
  const time = notificationTime(notification.createdAt, Date.now());
  return (
    <View style={styles.content} testID="announcement-content">
      <View style={styles.iconBox}>
        <Icon name="megaphone" size={26} color={colors.blueText} />
      </View>
      <Text style={styles.title} accessibilityRole="header" testID="announcement-title">
        {title}
      </Text>
      <Text style={styles.meta} testID="announcement-meta">
        {time === '' ? notification.body : `${notification.body} · ${time}`}
      </Text>
      <Text style={styles.text} testID="announcement-text">
        {text}
      </Text>
    </View>
  );
}

function Loading() {
  return (
    <View accessible accessibilityLabel="Duyuru yükleniyor" accessibilityState={{ busy: true }} style={styles.content} testID="announcement-loading">
      <View style={[styles.iconBox, styles.skeleton]} />
      <View style={[styles.bar, { width: '70%', height: 22 }]} />
      <View style={[styles.bar, { width: '40%', height: 12 }]} />
      <View style={[styles.bar, { width: '95%', height: 14 }]} />
      <View style={[styles.bar, { width: '90%', height: 14 }]} />
    </View>
  );
}

function Missing() {
  const router = useRouter();
  return (
    <StateMessage
      icon="search-x"
      title="Duyuru bulunamadı"
      message="Bu duyuru kaldırılmış olabilir ya da bağlantı hatalı. Bildirimlerinize dönebilirsiniz."
      actionLabel="Bildirimlere dön"
      actionIcon="arrow-left"
      onAction={() => router.navigate('/notifications')}
      testID="announcement-missing"
    />
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, padding: spacing.xl },
  content: { gap: spacing.lg },
  iconBox: { width: 56, height: 56, borderRadius: radii.card, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  title: { ...textStyles.titleLarge, color: colors.navy },
  meta: { ...textStyles.caption, color: colors.slateLight },
  text: { ...textStyles.bodyRelaxed, color: colors.ink },
  skeleton: { backgroundColor: colors.lineSoft },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
});
