import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { LogoMark } from '@/components/logo';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Company } from '@/constants/company';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  useConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from '@/features/messages/api';
import { formatPrice, formatTime, timeAgo } from '@/lib/format';
import type { MessageRow } from '@/types/database';

type Item = { kind: 'day'; id: string; label: string } | { kind: 'message'; id: string; message: MessageRow };

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Bugün';
  if (date.toDateString() === yesterday.toDateString()) return 'Dün';
  return timeAgo(iso);
}

/** Mesajları gün ayraçlarıyla birlikte, ters listeye uygun sırada (en yeni başta) döndürür. */
function withDaySeparators(messages: MessageRow[]): Item[] {
  const items: Item[] = [];
  let lastDay = '';
  for (const message of messages) {
    const day = new Date(message.created_at).toDateString();
    if (day !== lastDay) {
      items.push({ kind: 'day', id: `day-${day}`, label: dayLabel(message.created_at) });
      lastDay = day;
    }
    items.push({ kind: 'message', id: message.id, message });
  }
  return items.reverse();
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  const conversation = useConversation(id);
  const messages = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkConversationRead();
  const { mutate: markConversationRead } = markRead;

  const unreadFromStaff = messages.data?.some((m) => m.is_staff && !m.read_at) ?? false;
  useEffect(() => {
    if (unreadFromStaff) markConversationRead(id);
  }, [unreadFromStaff, id, markConversationRead]);

  const listing = conversation.data?.listing;
  const canSend = draft.trim().length > 0 && !sendMessage.isPending;

  const onSend = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    sendMessage.mutate(body, {
      onError: (e) => {
        setDraft(body);
        Alert.alert('Mesaj gönderilemedi', e.message);
      },
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable hitSlop={12} accessibilityLabel="Geri" onPress={() => router.back()}>
          <Icon name="chevron-left" size={30} />
        </Pressable>
        <LogoMark size={52} />
        <View style={styles.flex}>
          <Text variant="subheading">{Company.name}</Text>
          {listing ? (
            <Text variant="small" numberOfLines={1}>
              İlan: {listing.title}
            </Text>
          ) : null}
        </View>
      </View>

      {messages.isLoading ? (
        <StateView loading />
      ) : (
        <FlatList
          inverted
          data={withDaySeparators(messages.data ?? [])}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          ListFooterComponent={
            listing ? (
              <Pressable
                style={styles.listingCard}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}>
                <ListingImage uri={listing.cover_url} style={styles.listingThumb} iconSize={20} />
                <View style={styles.flex}>
                  <Text variant="bodySemibold" color="heading" numberOfLines={2}>
                    {listing.title}
                  </Text>
                  <Text variant="price">{formatPrice(listing.price, listing.currency)}</Text>
                </View>
                <Icon name="chevron-right" size={22} color="textTertiary" />
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            <Text variant="small" align="center" style={styles.empty}>
              İlan hakkında sorunuzu yazın; Neşeli Otomotiv size buradan cevap verecek.
            </Text>
          }
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              return (
                <View style={styles.day}>
                  <Text variant="smallMedium" color="textSecondary">
                    {item.label}
                  </Text>
                </View>
              );
            }
            const { message } = item;
            const mine = !message.is_staff;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text variant="body" style={mine ? styles.white : undefined}>
                  {message.body}
                </Text>
                <View style={styles.meta}>
                  <Text variant="caption" style={{ color: mine ? '#8FA6C4' : Colors.textSecondary }}>
                    {formatTime(message.created_at)}
                  </Text>
                  {mine ? (
                    <Icon
                      name={message.read_at ? 'mci:check-all' : 'check'}
                      size={16}
                      color={message.read_at ? Colors.greenSoft : '#8FA6C4'}
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.composer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Mesaj yazın..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          onPress={onSend}
          disabled={!canSend}
          style={[styles.send, { backgroundColor: canSend ? Colors.green : Colors.greenSoft }]}>
          <Icon name="send" size={24} color="white" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  white: { color: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  empty: { marginTop: Spacing.four, paddingHorizontal: Spacing.four },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listingThumb: { width: 76, height: 64, borderRadius: Radius.sm },
  day: {
    alignSelf: 'center',
    backgroundColor: Colors.chip,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three - 4,
    paddingBottom: Spacing.two,
    gap: 2,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.navy, borderBottomRightRadius: 4 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 54,
    maxHeight: 140,
    borderRadius: 27,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.four,
    paddingTop: 15,
    paddingBottom: 15,
    fontFamily: Fonts.regular,
    fontSize: 17,
    color: Colors.text,
  },
  send: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});
