import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { useTabBarClearance } from '@/components/TabBar';
import { Icon } from '@/components/icons/Icon';
import { toAppError, userMessage } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { toNotificationRow, type NotificationRowModel } from './presentation';
import { useMarkAllNotificationsRead, useMarkNotificationsRead, useNotificationUnreadCountQuery, useNotificationsQuery } from './useNotificationsQueries';
import { useOpenNotificationTarget } from './useOpenNotificationTarget';

const ICON_BOX = 40;

/**
 * Bildirimler (11): en yeni önce; okunmamış satırlar vurgulu ve yeşil noktalıdır. Satıra dokunmak bildirimi okundu işaretler ve hedefine
 * (ilan → detay, mesaj → sohbet, duyuru → duyuru ekranı) götürür; geçersiz hedef çökmez, güvenli "ulaşılamıyor" ekranı açılır.
 * "Tümünü oku" hesaba ait TÜM okunmamışları işaretler (yalnız yüklü sayfaları değil; bütün sayfalar `list` ile toplanır, `markRead` ile işaretlenir);
 * işlem sürerken devre dışıdır, hata görünür ve "Tekrar dene" ile yeniden denenir. Sekmeye her dönüşte liste ve rozet yenilenir. Gerçek push yoktur.
 */
export function NotificationsScreen() {
  const tabBarClearance = useTabBarClearance();
  const notifications = useNotificationsQuery();
  const unread = useNotificationUnreadCountQuery();
  const markRead = useMarkNotificationsRead();
  const markAll = useMarkAllNotificationsRead();
  const open = useOpenNotificationTarget();
  const refetchNotifications = notifications.refetch;
  const refetchUnread = unread.refetch;
  const mark = markRead.mutate;
  const markAllUnread = markAll.mutate;

  // İlk odakta sorgu zaten yükleniyor; sonraki odaklarda (hedeften dönüş, sekme değişimi) güncel durum için yenile.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) {
        void refetchNotifications();
        void refetchUnread();
      }
      focused.current = true;
    }, [refetchNotifications, refetchUnread]),
  );

  const nowMs = Date.now();
  const rows = useMemo(() => (notifications.data?.pages.flatMap((page) => page.items) ?? []).map((notification) => toNotificationRow(notification, nowMs)), [notifications.data, nowMs]);

  // Servis sayacı yüklenmemiş sayfalardaki okunmamışları da kapsar; sayaç yoksa (yükleniyor/hata) yüklü satırlara bakılır.
  const hasUnread = (unread.data ?? 0) > 0 || rows.some((row) => row.unread);
  const markingAll = markAll.isPending;
  // Oturum işlem sırasında bittiyse/değiştiyse (`unauthenticated`) eski hesabın hatası yeni oturumun ekranında gösterilmez.
  const markAllFailed = markAll.isError && toAppError(markAll.error).kind !== 'unauthenticated';

  const loadMore = useCallback(() => {
    if (notifications.hasNextPage && !notifications.isFetchingNextPage && !notifications.isFetchNextPageError) void notifications.fetchNextPage();
  }, [notifications]);

  const openRow = useCallback(
    (row: NotificationRowModel) => {
      if (row.unread) mark([row.id]);
      open(row.target);
    },
    [mark, open],
  );

  let empty = null;
  if (notifications.isPending) {
    empty = <NotificationSkeletons testID="notifications-loading" />;
  } else if (notifications.isError) {
    empty = (
      <StateMessage icon="info" title="Bildirimler yüklenemedi" message={userMessage(notifications.error)} actionLabel="Tekrar dene" onAction={() => void notifications.refetch()} testID="notifications-error" />
    );
  } else {
    empty = (
      <StateMessage
        icon="bell"
        title="Bildiriminiz yok"
        message="Favori ilanlarınızda fiyat veya durum değiştiğinde, mesajınıza cevap geldiğinde burada görürsünüz."
        testID="notifications-empty"
      />
    );
  }

  const footer = (
    <View style={styles.footer}>
      {notifications.isFetchingNextPage ? <ActivityIndicator color={colors.blue} testID="notifications-next-loading" accessibilityLabel="Daha fazla bildirim yükleniyor" /> : null}
      {notifications.isFetchNextPageError ? (
        <View style={styles.nextError} testID="notifications-next-error">
          <Text style={[textStyles.bodySmall, styles.nextErrorText]}>{userMessage(notifications.error)}</Text>
          <Btn label="Tekrar dene" variant="secondary" onPress={() => void notifications.fetchNextPage()} style={styles.nextRetry} testID="notifications-next-retry" />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen background={colors.white} edges={['top', 'left', 'right']} testID="tab-screen-notifications">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Bildirimler
        </Text>
        {rows.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tümünü okundu işaretle"
          accessibilityState={{ disabled: !hasUnread || markingAll, busy: markingAll }}
          disabled={!hasUnread || markingAll}
          onPress={() => markAllUnread()}
          style={styles.readAll}
          testID="notifications-read-all">
          {markingAll ? <ActivityIndicator color={colors.blue} size="small" testID="notifications-read-all-busy" /> : null}
          <Text style={[styles.readAllText, (!hasUnread || markingAll) && styles.readAllDisabled]}>{markingAll ? 'İşaretleniyor…' : 'Tümünü oku'}</Text>
        </Pressable>
        ) : null}
      </View>
      {markAllFailed ? (
        <View style={styles.markAllError} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="notifications-read-all-error">
          <Text style={[textStyles.caption, styles.markAllErrorText]}>{`Bildirimler okundu işaretlenemedi. ${userMessage(markAll.error)}`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tümünü okundu işaretlemeyi tekrar dene" onPress={() => markAllUnread()} style={styles.markAllRetry} testID="notifications-read-all-retry">
            <Text style={styles.readAllText}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarClearance }]}
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <NotificationRow row={item} onPress={() => openRow(item)} />}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        testID="notifications-list"
      />
    </Screen>
  );
}

function NotificationRow({ row, onPress }: { row: NotificationRowModel; onPress: () => void }) {
  const label = [row.unread ? 'Okunmamış' : null, row.title, row.subtitle].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, row.unread && styles.rowUnread, pressed && styles.rowPressed]}
      testID={`notification-row-${row.id}`}>
      <View style={[styles.iconBox, { backgroundColor: row.iconBackground }]}>
        <Icon name={row.icon} size={20} color={row.iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, row.unread && styles.rowTitleUnread]} testID={`notification-title-${row.id}`}>
          {row.title}
        </Text>
        <Text style={styles.rowSubtitle} testID={`notification-subtitle-${row.id}`}>
          {row.subtitle}
        </Text>
      </View>
      {row.unread ? <View style={styles.dot} testID={`notification-unread-${row.id}`} /> : null}
    </Pressable>
  );
}

/** Yükleniyor: satırla aynı ölçüde iskelet (içerik gelince yerleşim kaymaz). */
function NotificationSkeletons({ testID, count = 5 }: { testID: string; count?: number }) {
  return (
    <View accessible accessibilityLabel="Bildirimler yükleniyor" accessibilityState={{ busy: true }} testID={testID}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.iconBox, styles.skeleton]} />
          <View style={styles.rowBody}>
            <View style={[styles.bar, { width: '85%', height: 14 }]} />
            <View style={[styles.bar, { width: '55%', height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.white,
  },
  title: { ...textStyles.titlePage, color: colors.navy },
  readAll: { height: 44, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  readAllText: { fontFamily: fontFamily.inter600, fontSize: 14, lineHeight: 16.8, color: colors.blue },
  readAllDisabled: { color: colors.slatePale },
  markAllError: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.xl, paddingRight: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.warningTint },
  markAllErrorText: { flex: 1, color: colors.ink },
  markAllRetry: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center' },
  list: { flex: 1, backgroundColor: colors.white },
  listContent: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.white,
  },
  rowUnread: { backgroundColor: colors.blueTint },
  rowPressed: { opacity: 0.85 },
  iconBox: { width: ICON_BOX, height: ICON_BOX, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  skeleton: { backgroundColor: colors.lineSoft },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs, paddingTop: 2 },
  rowTitle: { fontFamily: fontFamily.inter500, fontSize: 14, lineHeight: 18.9, color: colors.ink },
  rowTitleUnread: { fontFamily: fontFamily.inter600 },
  rowSubtitle: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 15.6, color: colors.slateLight },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.green, marginTop: 8 },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
  footer: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
  nextError: { alignSelf: 'stretch', paddingHorizontal: spacing.xl, gap: spacing.md },
  nextErrorText: { color: colors.slate, textAlign: 'center' },
  nextRetry: { maxWidth: 240, alignSelf: 'center' },
});
