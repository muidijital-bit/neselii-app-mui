import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { toAppError, userMessage } from '@/domain';
import { SwipeToDelete } from '@/features/shell/SwipeToDelete';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { StateView } from '@/ui/StateView';
import { useTabBarSpace } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Divider, IconTile } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { PageHeader } from './PageHeader';
import { toNotificationRow, type NotificationRowModel } from './presentation';
import { useMarkAllNotificationsRead, useMarkNotificationsRead, useNotificationUnreadCountQuery, useNotificationsQuery, useRemoveNotifications } from './useNotificationsQueries';
import { useOpenNotificationTarget } from './useOpenNotificationTarget';

const ROW_ENTERING = FadeIn.duration(220);
const ROW_EXITING = FadeOut.duration(180);
const ROW_LAYOUT = LinearTransition.duration(220);

/**
 * Bildirimler (main tasarımı): en yeni önce; okunmamış satırlar vurgulu ve yeşil noktalıdır. Satıra dokunmak bildirimi okundu işaretler ve hedefine
 * (ilan → detay, mesaj → sohbet, duyuru → duyuru ekranı) götürür; geçersiz hedef çökmez, güvenli "ulaşılamıyor" ekranı açılır.
 * "Tümünü oku" hesaba ait TÜM okunmamışları işaretler (yalnız yüklü sayfaları değil; bütün sayfalar `list` ile toplanır, `markRead` ile işaretlenir);
 * işlem sürerken devre dışıdır, hata görünür ve "Tekrar dene" ile yeniden denenir. Sekmeye her dönüşte liste ve rozet yenilenir. Gerçek push yoktur.
 * Silme: satırı sola kaydırıp "Sil" (onaysız, anında) ya da uzun basıp "Sil"; erişilebilirlik "Sil" eylemi de vardır. Satır iyimser olarak küçük bir
 * çıkış animasyonuyla kaybolur, kalanlar yumuşakça kayar; hata olursa satır geri gelir ve uyarı çıkar.
 */
export function NotificationsScreen() {
  const tabBarSpace = useTabBarSpace();
  const notifications = useNotificationsQuery();
  const unread = useNotificationUnreadCountQuery();
  const markRead = useMarkNotificationsRead();
  const markAll = useMarkAllNotificationsRead();
  const open = useOpenNotificationTarget();
  const refetchNotifications = notifications.refetch;
  const refetchUnread = unread.refetch;
  const mark = markRead.mutate;
  const markAllUnread = markAll.mutate;
  const { remove } = useRemoveNotifications({ onError: (error) => Alert.alert('Bildirim silinemedi', userMessage(error)) });
  const removeOne = useCallback((id: string) => remove([id]), [remove]);
  // Uzun basma: tek seçenekli menü (yanlışlıkla silmeyi önler); kaydırma eylemi ve erişilebilirlik eylemi doğrudan siler.
  const askRemove = useCallback(
    (row: NotificationRowModel) =>
      Alert.alert(row.title, undefined, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => removeOne(row.id) },
      ]),
    [removeOne],
  );
  // Aşağı çekerek yenileme göstergesi yalnızca kullanıcının başlattığı yenilemede döner (odak yenilemesinde değil).
  const [pulling, setPulling] = useState(false);

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

  const refresh = useCallback(() => {
    setPulling(true);
    void Promise.all([refetchNotifications(), refetchUnread()]).finally(() => setPulling(false));
  }, [refetchNotifications, refetchUnread]);

  const openRow = useCallback(
    (row: NotificationRowModel) => {
      if (row.unread) mark([row.id]);
      open(row.target);
    },
    [mark, open],
  );

  let empty = null;
  if (notifications.isPending) {
    empty = (
      <View style={styles.state} accessible accessibilityLabel="Bildirimler yükleniyor" accessibilityState={{ busy: true }} testID="notifications-loading">
        <StateView loading />
      </View>
    );
  } else if (notifications.isError) {
    empty = (
      <View style={styles.state} testID="notifications-error">
        <StateView
          icon="alert-circle"
          title="Bildirimler yüklenemedi"
          message={userMessage(notifications.error)}
          actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void notifications.refetch() }]}
        />
      </View>
    );
  } else {
    empty = (
      <View style={styles.state} testID="notifications-empty">
        <StateView
          top
          icon="bell"
          title="Bildiriminiz yok"
          message="Favori ilanlarınızda fiyat veya durum değiştiğinde, mesajınıza cevap geldiğinde burada görürsünüz."
        />
      </View>
    );
  }

  const footer =
    notifications.isFetchingNextPage || notifications.isFetchNextPageError ? (
      <View style={styles.footer}>
        {notifications.isFetchingNextPage ? <ActivityIndicator color={Colors.navy} testID="notifications-next-loading" accessibilityLabel="Daha fazla bildirim yükleniyor" /> : null}
        {notifications.isFetchNextPageError ? (
          <View style={styles.nextError} testID="notifications-next-error">
            <Text variant="small" align="center">
              {userMessage(notifications.error)}
            </Text>
            <Button title="Tekrar dene" variant="outline" onPress={() => void notifications.fetchNextPage()} testID="notifications-next-retry" />
          </View>
        ) : null}
      </View>
    ) : undefined;

  return (
    <View style={styles.container} testID="tab-screen-notifications">
      <FocusStatusBar style="dark" />
      <PageHeader
        title="Bildirimler"
        back={false}
        right={
          hasUnread || markingAll ? (
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Tümünü okundu işaretle"
              accessibilityState={{ disabled: markingAll, busy: markingAll }}
              disabled={markingAll}
              onPress={() => markAllUnread()}
              testID="notifications-read-all">
              {markingAll ? (
                <ActivityIndicator color={Colors.navy} size="small" testID="notifications-read-all-busy" />
              ) : (
                <Text variant="bodySemibold" color="heading">
                  Tümünü oku
                </Text>
              )}
            </Pressable>
          ) : null
        }
      />
      {markAllFailed ? (
        <View style={styles.markAllError} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="notifications-read-all-error">
          <Text variant="small" color="text" style={styles.flex}>{`Bildirimler okundu işaretlenemedi. ${userMessage(markAll.error)}`}</Text>
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Tümünü okundu işaretlemeyi tekrar dene" onPress={() => markAllUnread()} testID="notifications-read-all-retry">
            <Text variant="bodySemibold" color="heading">
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      ) : null}
      <Animated.FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
        onRefresh={refresh}
        refreshing={pulling}
        ItemSeparatorComponent={Separator}
        // Silmede kalan satırlar yumuşakça kayar; satırlar ilk gelişte hafifçe belirir.
        itemLayoutAnimation={ROW_LAYOUT}
        renderItem={({ item }) => (
          <Animated.View entering={ROW_ENTERING} exiting={ROW_EXITING}>
            <SwipeToDelete onDelete={() => removeOne(item.id)} deleteTestID={`notification-delete-${item.id}`} deleteLabel="Bildirimi sil">
              <NotificationRow row={item} onPress={() => openRow(item)} onLongPress={() => askRemove(item)} onDelete={() => removeOne(item.id)} />
            </SwipeToDelete>
          </Animated.View>
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        testID="notifications-list"
      />
    </View>
  );
}

const Separator = () => <Divider />;

type RowProps = { row: NotificationRowModel; onPress: () => void; onLongPress: () => void; onDelete: () => void };

function NotificationRow({ row, onPress, onLongPress, onDelete }: RowProps) {
  const label = [row.unread ? 'Okunmamış' : null, row.title, row.subtitle].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Silmek için sola kaydırın ya da uzun basın"
      accessibilityActions={[{ name: 'delete', label: 'Sil' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete') onDelete();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, row.unread && styles.unread, pressed && styles.pressed]}
      testID={`notification-row-${row.id}`}>
      {row.imageUri ? (
        // İlana bağlı bildirim: ilan fotoğrafı (mesajlar listesindeki gibi), tür simgesi köşede küçük rozet.
        <View>
          <ListingImage uri={row.imageUri} style={styles.thumb} iconSize={20} />
          <View style={[styles.kindBadge, { backgroundColor: row.iconBackground, borderColor: row.unread ? Colors.surfaceHighlight : Colors.surface }]}>
            <Icon name={row.icon} size={13} color={row.iconColor} />
          </View>
        </View>
      ) : (
        <IconTile icon={row.icon} bg={row.iconBackground} color={row.iconColor} />
      )}
      <View style={styles.rowBody}>
        <Text variant="bodyMedium" testID={`notification-title-${row.id}`}>
          {row.title}
        </Text>
        <Text variant="small" testID={`notification-subtitle-${row.id}`}>
          {row.subtitle}
        </Text>
      </View>
      {row.unread ? <View style={styles.dot} testID={`notification-unread-${row.id}`} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  list: { flexGrow: 1 },
  flex: { flex: 1 },
  state: { flex: 1 },
  rowBody: { flex: 1, gap: 2 },
  thumb: { width: 52, height: 52, borderRadius: Radius.md },
  kindBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  unread: { backgroundColor: Colors.surfaceHighlight },
  pressed: { opacity: 0.8 },
  dot: { width: 10, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.green, marginTop: 8 },
  markAllError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    backgroundColor: Colors.warningSoft,
  },
  footer: { alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.two },
  nextError: { alignSelf: 'stretch', paddingHorizontal: Spacing.three, gap: Spacing.two },
});
