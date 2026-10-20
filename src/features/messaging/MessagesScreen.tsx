import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { useTabBarClearance } from '@/components/TabBar';
import { Image } from 'expo-image';

import { Icon } from '@/components/icons/Icon';
import { userMessage } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { useIsAdmin } from '@/features/session/useIsAdmin';

import { toConversationRow, type ConversationRowModel } from './presentation';
import { conversationHref } from './routes';
import { useConversationsQuery, useUnreadCountQuery } from './useMessagingQueries';

const THUMB = 52;

/**
 * Mesajlar (09): kullanıcının Neşeli Otomotiv ile ilan başına tek sohbetleri, en son güncellenen üstte. Okunmamış satırlar
 * vurgulu ve sayaçlıdır; sayaçlar servisten gelir (satır toplamı = sekme rozeti). Sekmeye her dönüşte liste ve rozet yenilenir.
 */
export function MessagesScreen() {
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const conversations = useConversationsQuery();
  const unread = useUnreadCountQuery();
  const refetchConversations = conversations.refetch;
  const refetchUnread = unread.refetch;

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

  const nowMs = Date.now();
  const rows = useMemo(() => (conversations.data?.pages.flatMap((page) => page.items) ?? []).map((conversation) => toConversationRow(conversation, nowMs, isAdmin ? 'admin' : 'user')), [conversations.data, nowMs, isAdmin]);

  const loadMore = useCallback(() => {
    if (conversations.hasNextPage && !conversations.isFetchingNextPage && !conversations.isFetchNextPageError) void conversations.fetchNextPage();
  }, [conversations]);

  let empty = null;
  if (conversations.isPending) {
    empty = <ConversationSkeletons testID="messages-loading" />;
  } else if (conversations.isError) {
    empty = (
      <StateMessage icon="info" title="Mesajlar yüklenemedi" message={userMessage(conversations.error)} actionLabel="Tekrar dene" onAction={() => void conversations.refetch()} testID="messages-error" />
    );
  } else {
    empty = (
      <StateMessage
        icon="message-circle"
        title={isAdmin ? 'Henüz müşteri mesajı yok' : 'Henüz mesajınız yok'}
        message={isAdmin ? 'Müşteriler ilanlardan mesaj gönderdiğinde konuşmalar burada listelenir.' : "Bir ilanın detayından Neşeli Otomotiv'e mesaj gönderdiğinizde görüşmeleriniz burada listelenir."}
        testID="messages-empty"
      />
    );
  }

  const footer = (
    <View style={styles.footer}>
      {conversations.isFetchingNextPage ? <ActivityIndicator color={colors.blue} testID="messages-next-loading" accessibilityLabel="Daha fazla görüşme yükleniyor" /> : null}
      {conversations.isFetchNextPageError ? (
        <View style={styles.nextError} testID="messages-next-error">
          <Text style={[textStyles.bodySmall, styles.nextErrorText]}>{userMessage(conversations.error)}</Text>
          <Btn label="Tekrar dene" variant="secondary" onPress={() => void conversations.fetchNextPage()} style={styles.nextRetry} testID="messages-next-retry" />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen background={colors.white} edges={['top', 'left', 'right']} testID="tab-screen-messages">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Mesajlar
        </Text>
      </View>
      <View style={styles.info}>
        <Icon name="info" size={15} color={colors.blue} />
        <Text style={styles.infoText}>{isAdmin ? 'Yönetici görünümü: müşterilerden gelen tüm mesajlar burada.' : 'Tüm görüşmeleriniz Neşeli Otomotiv ile ve bir ilana bağlıdır.'}</Text>
      </View>
      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarClearance }]}
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <ConversationRow row={item} onPress={() => router.push(conversationHref(item.id))} />}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        testID="messages-list"
      />
    </Screen>
  );
}

function ConversationRow({ row, onPress }: { row: ConversationRowModel; onPress: () => void }) {
  const hasUnread = row.unreadCount > 0;
  const label = [row.title, row.subtitle, row.preview, row.timeLabel, hasUnread ? `${row.unreadCount} okunmamış mesaj` : null].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, hasUnread && styles.rowUnread, pressed && styles.rowPressed]}
      testID={`conversation-row-${row.id}`}>
      <View style={styles.thumb}>
        {row.imageUri ? (
          <Image source={{ uri: row.imageUri }} style={{ width: THUMB, height: THUMB }} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.thumbEmpty}>
            <Icon name="camera" size={26} color={colors.slateFaint} />
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={[styles.rowTitle, hasUnread && styles.rowTitleUnread]} testID={`conversation-title-${row.id}`}>
            {row.title}
          </Text>
          <Text numberOfLines={1} style={[styles.rowTime, hasUnread && styles.rowTimeUnread]} testID={`conversation-time-${row.id}`}>
            {row.timeLabel}
          </Text>
        </View>
        {row.subtitle ? (
          <Text numberOfLines={1} style={styles.rowSubtitle} testID={`conversation-listing-${row.id}`}>
            {row.subtitle}
          </Text>
        ) : null}
        <View style={styles.rowBottom}>
          <Text numberOfLines={1} style={styles.rowPreview} testID={`conversation-preview-${row.id}`}>
            {row.preview}
          </Text>
          {hasUnread ? (
            <View style={styles.unreadBadge} testID={`conversation-unread-${row.id}`}>
              <Text style={styles.unreadText} allowFontScaling={false}>
                {row.unreadLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Yükleniyor: satırla aynı ölçüde iskelet (içerik gelince yerleşim kaymaz). */
function ConversationSkeletons({ testID, count = 5 }: { testID: string; count?: number }) {
  return (
    <View accessible accessibilityLabel="Mesajlar yükleniyor" accessibilityState={{ busy: true }} testID={testID}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.thumb, styles.skeleton]} />
          <View style={styles.rowBody}>
            <View style={[styles.bar, { width: '70%', height: 14 }]} />
            <View style={[styles.bar, { width: '90%', height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.lineSoft, backgroundColor: colors.white },
  title: { ...textStyles.titlePage, color: colors.navy },
  info: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 10, backgroundColor: colors.blueTint },
  infoText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 16.8, color: colors.blue },
  list: { flex: 1, backgroundColor: colors.white },
  listContent: { flexGrow: 1 },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.white,
  },
  rowUnread: { backgroundColor: colors.blueTint },
  rowPressed: { opacity: 0.85 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radii.lg, overflow: 'hidden' },
  rowSubtitle: { fontFamily: fontFamily.inter500, fontSize: 12, color: colors.slate },
  thumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lineSoft },
  skeleton: { backgroundColor: colors.lineSoft },
  rowBody: { flex: 1, minWidth: 0, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  rowTitle: { flex: 1, minWidth: 0, fontFamily: fontFamily.inter500, fontSize: 15, lineHeight: 18, color: colors.navy },
  rowTitleUnread: { fontFamily: fontFamily.inter700 },
  rowTime: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 14.4, color: colors.slateLight },
  rowTimeUnread: { fontFamily: fontFamily.inter600, color: colors.greenPressed },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowPreview: { flex: 1, minWidth: 0, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 15.6, color: colors.slate },
  unreadBadge: { minWidth: 20, minHeight: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  unreadText: { fontFamily: fontFamily.inter700, fontSize: 11, lineHeight: 14, color: colors.white, textAlign: 'center' },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
  footer: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
  nextError: { alignSelf: 'stretch', paddingHorizontal: spacing.xl, gap: spacing.md },
  nextErrorText: { color: colors.slate, textAlign: 'center' },
  nextRetry: { maxWidth: 240, alignSelf: 'center' },
});
