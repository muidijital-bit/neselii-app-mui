import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { userMessage } from '@/domain';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { SwipeToDelete } from '@/features/shell/SwipeToDelete';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTabBarSpace } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { CountBadge, Divider } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { AdminInboxIntro } from './AdminInboxIntro';
import { MessagingState } from './MessagingState';
import { toConversationRow, type ConversationRowModel } from './presentation';
import { conversationHref } from './routes';
import { useAdminInboxIntro } from './useAdminInboxIntro';
import { useConversationsQuery, useHideConversation, useUnreadCountQuery } from './useMessagingQueries';

const ROW_ENTERING = FadeIn.duration(220);
const ROW_EXITING = FadeOut.duration(180);
const ROW_LAYOUT = LinearTransition.duration(220);

/**
 * Mesajlar (09): kullanıcının Neşeli Otomotiv ile ilan başına tek sohbetleri, en son güncellenen üstte. Okunmamış satırlar
 * vurgulu ve sayaçlıdır; sayaçlar servisten gelir (satır toplamı = sekme rozeti). Sekmeye her dönüşte liste ve rozet yenilenir.
 * Yöneticide liste tüm müşteri görüşmeleridir: satır ilan fotoğrafı + müşteri adıyla, altında ilan başlığıyla görünür.
 * Silme: satırı sola kaydırınca "Sil", uzun basma ya da erişilebilirlik "Sil" eylemi → onay penceresi. Müşteride görüşme yalnız kendi listesinden,
 * yöneticide firma gelen kutusundan kaldırılır (kayıt silinmez; yeni mesajla yeniden görünür). Satır iyimser kaybolur; hata olursa geri gelir ve uyarı çıkar.
 */
export function MessagesScreen() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const intro = useAdminInboxIntro();
  const conversations = useConversationsQuery();
  const unread = useUnreadCountQuery();
  const refetchConversations = conversations.refetch;
  const refetchUnread = unread.refetch;
  const { hide } = useHideConversation({ onError: (error) => Alert.alert('Görüşme silinemedi', userMessage(error)) });

  // Onaydan sonra satır iyimser kalkar. `close`: kaydırılmış satırı vazgeçince kapatır (uzun basmada/erişilebilirlik eyleminde yok).
  const confirmDelete = useCallback(
    (id: string, close?: () => void) => {
      Alert.alert(
        'Görüşmeyi sil',
        isAdmin
          ? 'Görüşme firma gelen kutusundan kaldırılır. Müşteri yeni mesaj gönderirse tekrar görünür.'
          : 'Görüşme yalnızca sizin listenizden kaldırılır. Firma yeni mesaj gönderirse tekrar görünür.',
        [
          { text: 'Vazgeç', style: 'cancel', onPress: close },
          { text: 'Sil', style: 'destructive', onPress: () => hide(id) },
        ],
        { cancelable: true, onDismiss: close },
      );
    },
    [hide, isAdmin],
  );

  // İlk odakta sorgu zaten yükleniyor; sonraki odaklarda (sohbetten dönüş, sekme değişimi) güncel sayaçlar için yenile.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) {
        void refetchConversations();
        void refetchUnread();
      }
      focused.current = true;
    }, [refetchConversations, refetchUnread]),
  );

  // Aşağı çekip yenileme: göstergeyi yalnız kullanıcının çekmesi açar (odak yenilemesinde gösterge çıkmaz).
  const [pulling, setPulling] = useState(false);
  const onRefresh = useCallback(() => {
    setPulling(true);
    void Promise.allSettled([refetchConversations(), refetchUnread()]).finally(() => setPulling(false));
  }, [refetchConversations, refetchUnread]);

  const nowMs = Date.now();
  const rows = useMemo(() => (conversations.data?.pages.flatMap((page) => page.items) ?? []).map((conversation) => toConversationRow(conversation, nowMs, isAdmin ? 'admin' : 'user')), [conversations.data, nowMs, isAdmin]);

  const loadMore = useCallback(() => {
    if (conversations.hasNextPage && !conversations.isFetchingNextPage && !conversations.isFetchNextPageError) void conversations.fetchNextPage();
  }, [conversations]);

  let empty = null;
  if (conversations.isPending) {
    empty = <MessagingState loading loadingLabel="Mesajlar yükleniyor" testID="messages-loading" />;
  } else if (conversations.isError) {
    empty = <MessagingState icon="info" title="Mesajlar yüklenemedi" message={userMessage(conversations.error)} actionLabel="Tekrar dene" actionIcon="refresh-cw" onAction={() => void conversations.refetch()} testID="messages-error" />;
  } else {
    empty = (
      <MessagingState
        top
        icon="message-circle"
        title={isAdmin ? 'Henüz müşteri mesajı yok' : 'Henüz mesajınız yok'}
        message={isAdmin ? 'Müşteriler ilanlardan mesaj gönderdiğinde görüşmeler burada listelenir.' : 'İlan sayfasındaki Mesaj Gönder butonuyla firmaya ilan hakkında soru sorabilirsiniz.'}
        testID="messages-empty"
      />
    );
  }

  const footer = !conversations.isFetchingNextPage && !conversations.isFetchNextPageError ? undefined : (
    <View style={styles.footer}>
      {conversations.isFetchingNextPage ? <ActivityIndicator color={Colors.navy} testID="messages-next-loading" accessibilityLabel="Daha fazla görüşme yükleniyor" /> : null}
      {conversations.isFetchNextPageError ? (
        <View style={styles.nextError} testID="messages-next-error">
          <Text variant="small" align="center">
            {userMessage(conversations.error)}
          </Text>
          <Button title="Tekrar dene" variant="outline" onPress={() => void conversations.fetchNextPage()} style={styles.nextRetry} testID="messages-next-retry" />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container} testID="tab-screen-messages">
      <FocusStatusBar style="dark" />
      <ScreenHeader title="Mesajlar" back={false} right={<AdminBadge testID="messages-admin-badge" />} />
      {/* Yöneticiye ilk girişte bir kez: bu sekmede müşteri mesajlarını görüp yanıtlayabileceğini anlatır. */}
      <AdminInboxIntro visible={intro.visible} onDismiss={intro.dismiss} />
      <Animated.FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
        onRefresh={onRefresh}
        refreshing={pulling}
        ListHeaderComponent={
          <View style={styles.info}>
            <Icon name="info" size={18} />
            <Text variant="small" color="heading" style={styles.flex}>
              {isAdmin ? 'Müşteri görüşmeleri. Cevaplarınız Neşeli Otomotiv adına gönderilir.' : 'Tüm görüşmeleriniz Neşeli Otomotiv ile ve bir ilana bağlıdır.'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={Divider}
        // Silmede kalan satırlar yumuşakça kayar; satırlar ilk gelişte hafifçe belirir.
        itemLayoutAnimation={ROW_LAYOUT}
        renderItem={({ item }) => (
          <Animated.View entering={ROW_ENTERING} exiting={ROW_EXITING}>
            <SwipeToDelete onDelete={(close) => confirmDelete(item.id, close)} deleteTestID={`conversation-delete-${item.id}`} deleteLabel="Görüşmeyi sil">
              <ConversationRow row={item} onPress={() => router.push(conversationHref(item.id))} onDelete={() => confirmDelete(item.id)} />
            </SwipeToDelete>
          </Animated.View>
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        testID="messages-list"
      />
    </View>
  );
}

function ConversationRow({ row, onPress, onDelete }: { row: ConversationRowModel; onPress: () => void; onDelete: () => void }) {
  const unread = row.unreadCount > 0;
  const label = [row.title, row.subtitle, row.preview, row.timeLabel, unread ? `${row.unreadCount} okunmamış mesaj` : null].filter(Boolean).join(', ');
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
      onLongPress={onDelete}
      style={({ pressed }) => [styles.row, unread && styles.unread, pressed && styles.pressed]}
      testID={`conversation-row-${row.id}`}>
      {/* Main'deki gibi her iki tarafta da ilan fotoğrafı (yöneticide başlık müşteri adı, altında ilan). */}
      <ListingImage uri={row.imageUri} style={styles.thumb} iconSize={20} />
      <View style={styles.flex}>
        <View style={styles.line}>
          <Text variant={unread ? 'subheading' : 'bodyMedium'} numberOfLines={1} style={styles.flex} testID={`conversation-title-${row.id}`}>
            {row.title}
          </Text>
          <Text variant={unread ? 'smallSemibold' : 'small'} color={unread ? 'green' : 'textSecondary'} testID={`conversation-time-${row.id}`}>
            {row.timeLabel}
          </Text>
        </View>
        {row.subtitle ? (
          <Text variant="smallMedium" color="heading" numberOfLines={1} testID={`conversation-listing-${row.id}`}>
            {row.subtitle}
          </Text>
        ) : null}
        <View style={styles.line}>
          <Text variant="small" numberOfLines={1} style={styles.flex} testID={`conversation-preview-${row.id}`}>
            {row.preview}
          </Text>
          {unread ? (
            <View testID={`conversation-unread-${row.id}`}>
              <CountBadge count={row.unreadCount} tone="green" />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  list: { flexGrow: 1 },
  flex: { flex: 1 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  unread: { backgroundColor: Colors.surfaceHighlight },
  pressed: { opacity: 0.8 },
  thumb: { width: 64, height: 64, borderRadius: Radius.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 26 },
  footer: { alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.two },
  nextError: { alignSelf: 'stretch', paddingHorizontal: Spacing.three, gap: Spacing.two },
  nextRetry: { alignSelf: 'center', minWidth: 200 },
});
