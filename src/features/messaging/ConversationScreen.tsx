import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type KeyboardEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney, toAppError, userMessage, type Conversation, type Message } from '@/domain';
import { listingHref } from '@/features/listings/routes';
import { useSession } from '@/features/session/SessionProvider';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { initials } from '@/ui/format';
import { Icon, type IconName } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { LogoMark } from '@/ui/Logo';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

import { MessagingState } from './MessagingState';
import { dayLabel, formatClock } from './presentation';
import { useConversationChat, type PendingMessage } from './useConversationChat';
import { messagingKeys, useMarkConversationRead } from './useMessagingQueries';
import { useScreenVisible } from './useScreenVisible';

const MAX_LENGTH = 2000;
/** En alta bu kadar piksel yakınsa kullanıcı "altta" sayılır (yeni mesaj gelince alta kayılır). */
const BOTTOM_THRESHOLD = 80;
const TURKEY_OFFSET_MS = 3 * 3_600_000;
const dayKey = (iso: string) => new Date(Date.parse(iso) + TURKEY_OFFSET_MS).toISOString().slice(0, 10);
/** Lacivert balondaki saat/tik rengi (main tasarımı). */
const META_ON_NAVY = '#8FA6C4';

/**
 * Klavye yüksekliği/görünürlüğü. iOS'ta `KeyboardAvoidingView` yerleşimi kaydırır; Android'de pencere kenardan kenara olduğundan
 * (bkz. `FormScroll`) klavye pencereyi küçültmez: composer'ın altına klavye kadar boşluk biz ekleriz. Dinleyiciler efekt temizliğinde bırakılır.
 */
function useKeyboard() {
  const [state, setState] = useState({ visible: false, height: 0 });
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event: KeyboardEvent) => setState({ visible: true, height: event.endCoordinates.height }));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setState({ visible: false, height: 0 }));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return state;
}

/**
 * İlan sohbeti (10): kullanıcı ↔ Neşeli Otomotiv, ilana bağlı. Başlıkta firma (müşteride) ya da müşteri (yöneticide), mesajların üstünde
 * ilan kartı (ilana gider), mesaj balonları (tik durumları), altta composer. Boş mesaj gönderilmez; gönderim hatasında mesaj
 * "Gönderilemedi · Tekrar dene" kalır ve aynı kimlikle yeniden denenir. Başkasının/olmayan görüşme güvenli "bulunamadı" durumuna düşer.
 */
export function ConversationScreen() {
  const router = useRouter();
  const { conversationId = '' } = useLocalSearchParams<{ conversationId?: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const visible = useScreenVisible();
  const { query, messages, pending, send, retry } = useConversationChat(conversationId, visible);
  const markRead = useMarkConversationRead();
  const { mutate: markConversationRead } = markRead;
  const keyboard = useKeyboard();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [draft, setDraft] = useState('');

  // Ekran görünür oldukça (açılış + odak/ön plana dönüş; mesajlar erişim doğrulanarak yüklendikten sonra) okundu işaretle. Görünmezken
  // (başka ekran üstte / arka plan) işaretlenmez: o sırada gelen yanıt okunmamış kalır ve dönüşte temizlenir.
  const loaded = query.isSuccess;
  useEffect(() => {
    if (loaded && visible) markConversationRead(conversationId);
  }, [loaded, visible, conversationId, markConversationRead]);

  // Kaydırma: yalnızca "alta yapışıkken" (ilk yükleme, kendi gönderimim, zaten en alttayken gelen yanıt) en alta kay. Kullanıcı geçmişi
  // okurken gelen mesaj onu zorla alta atmaz; eski sayfa yüklenince okuma konumu korunur (içerik yukarı büyüdüğü kadar kaydırılır).
  const stickToBottom = useRef(true);
  const userScrolling = useRef(false);
  const bottomFrame = useRef<number | null>(null);
  const scrollToBottom = useCallback(() => {
    if (bottomFrame.current !== null) cancelAnimationFrame(bottomFrame.current);
    bottomFrame.current = requestAnimationFrame(() => {
      bottomFrame.current = null;
      if (stickToBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, []);
  useEffect(() => () => {
    if (bottomFrame.current !== null) cancelAnimationFrame(bottomFrame.current);
  }, []);
  const scrollState = useRef({ offset: 0, height: 0 });
  const olderAnchor = useRef<{ height: number; offset: number } | null>(null);
  const fetchingOlder = useRef(false);
  fetchingOlder.current = query.isFetchingNextPage;
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollState.current = { offset: contentOffset.y, height: contentSize.height };
    // İçerik/klavye yerleşimi de onScroll üretir. Bu olaylar, kullanıcı alta yapışıkken hata satırı büyüdüğünde
    // onun geçmiş okumaya geçtiği sanılmasına yol açmamalı; niyeti yalnız gerçek sürükleme/momentum değiştirir.
    if (userScrolling.current) stickToBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < BOTTOM_THRESHOLD;
  }, []);
  const onContentSizeChange = useCallback((_width: number, height: number) => {
    const anchor = olderAnchor.current;
    if (anchor) {
      if (fetchingOlder.current) {
        anchor.height = height; // yükleniyor göstergesi düğmenin yerini aldı: taban yüksekliği güncelle
        return;
      }
      olderAnchor.current = null;
      if (height > anchor.height) {
        scrollRef.current?.scrollTo({ y: anchor.offset + (height - anchor.height), animated: false });
        scrollState.current = { offset: anchor.offset + (height - anchor.height), height };
        return;
      }
    }
    scrollState.current = { ...scrollState.current, height };
    if (stickToBottom.current) scrollToBottom();
  }, [scrollToBottom]);
  // Görünür alan küçülünce (klavye açıldı) alta yapışık kullanıcı son mesajı görmeye devam eder.
  const onViewportChange = useCallback(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [scrollToBottom]);
  const loadOlder = useCallback(() => {
    stickToBottom.current = false;
    olderAnchor.current = { height: scrollState.current.height, offset: scrollState.current.offset };
    void query.fetchNextPage();
  }, [query]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/messages'));

  const userId = session?.user.id ?? null;
  const cachedConversation = queryClient
    .getQueryData<{ pages: { items: Conversation[] }[] }>(messagingKeys.conversations(userId))
    ?.pages.flatMap((page) => page.items)
    .find((conversation) => conversation.id === conversationId);
  const seeded = queryClient.getQueryData<Conversation>(messagingKeys.conversation(userId, conversationId));
  const conversationInfo = markRead.data ?? seeded ?? cachedConversation;
  const listing = conversationInfo?.listing ?? null;
  // Yönetici sohbeti müşteri adına açar; müşteri "Neşeli Otomotiv" ile konuşur.
  const isAdmin = useIsAdmin();
  const customerName = conversationInfo?.customer?.fullName || 'Müşteri';
  const customerPhone = conversationInfo?.customer?.phone ?? null;

  // Yüklenmiş mesaj varken (eski sayfa/yenileme hatası) sohbet ekranı hata durumuna DÜŞMEZ: TanStack bu durumda da `isError` verir.
  const failed = query.isError && query.data === undefined;
  const missing = conversationId === '' || (failed && toAppError(query.error).kind === 'notFound');
  const nowMs = Date.now();
  const knownClientIds = new Set(messages.map((message) => message.clientMessageId).filter(Boolean));
  const visiblePending = pending.filter((entry) => !knownClientIds.has(entry.clientMessageId));

  const onSend = useCallback(() => {
    if (send(draft)) {
      stickToBottom.current = true; // kendi mesajım: geçmişi okuyor olsam da en alta in
      setDraft(''); // klavye ve odak korunur: blur/dismiss çağrısı yok
    }
  }, [draft, send]);

  const canSend = draft.trim() !== '';
  // Android (kenardan kenara pencere): klavye pencereyi küçültmez ve `endCoordinates.height` gezinme çubuğu payını İÇERMEZ (Android 16 emülatöründe
  // ölçüldü: yalnız klavye kadar boşluk composer'ın altını klavyenin altında bırakıyordu) → klavye + alt güvenli alan. iOS: `KeyboardAvoidingView`
  // klavyenin üstüne taşır; klavye açıkken alt güvenli alan gerekmez.
  const bottomPadding = Platform.OS === 'android' ? (keyboard.visible ? keyboard.height + insets.bottom : insets.bottom) : keyboard.visible ? 0 : insets.bottom;

  const queryError = query.error;
  let body;
  if (missing) {
    body = <MessagingState icon="info" title="Görüşme bulunamadı" message="Bu görüşme mevcut değil ya da erişiminiz yok." actionLabel="Mesajlara dön" actionIcon="arrow-left" onAction={goBack} testID="conversation-missing" />;
  } else if (query.isPending) {
    body = <MessagingState loading loadingLabel="Mesajlar yükleniyor" testID="conversation-loading" />;
  } else if (failed) {
    body = <MessagingState icon="info" title="Mesajlar yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" actionIcon="refresh-cw" onAction={() => void query.refetch()} testID="conversation-error" />;
  } else {
    const isEmpty = messages.length === 0 && visiblePending.length === 0 && !query.hasNextPage;
    // Main tasarımı (ters liste): içerik alta yaslanır; ilan kartı en eski mesajın üstünde akışla kayar, mesaj yoksa altında yönlendirme metni.
    body = (
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        onScrollBeginDrag={() => { userScrolling.current = true; }}
        onScrollEndDrag={() => { userScrolling.current = false; }}
        onMomentumScrollBegin={() => { userScrolling.current = true; }}
        onMomentumScrollEnd={() => { userScrolling.current = false; }}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        onLayout={onViewportChange}
        testID="conversation-messages">
        <View style={styles.spacer} />
        {listing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`İlan: ${listing.title}, ${formatMoney(listing.price)}`}
            onPress={() => router.push(listingHref(listing.id))}
            style={styles.listingCard}
            testID="conversation-listing">
            <ListingImage uri={listing.coverImageUri} style={styles.listingThumb} iconSize={20} />
            <View style={styles.flex}>
              <Text variant="bodySemibold" color="heading" numberOfLines={2}>
                {listing.title}
              </Text>
              <Text variant="price">{formatMoney(listing.price)}</Text>
            </View>
            <Icon name="chevron-right" size={22} color="textTertiary" />
          </Pressable>
        ) : null}
        {query.hasNextPage ? (
          <View style={styles.older}>
            {query.isFetchingNextPage ? (
              <ActivityIndicator color={Colors.navy} accessibilityLabel="Eski mesajlar yükleniyor" testID="conversation-older-loading" />
            ) : (
              <Button title="Daha eski mesajlar" variant="outline" onPress={loadOlder} style={styles.olderBtn} testID="conversation-older" />
            )}
          </View>
        ) : null}
        {query.isFetchNextPageError ? (
          <Text variant="caption" color="danger" align="center" testID="conversation-older-error">
            {userMessage(queryError)}
          </Text>
        ) : null}
        {isEmpty ? (
          <Text variant="small" align="center" style={styles.empty} testID="conversation-empty">
            {isAdmin ? 'Henüz mesaj yok.' : 'İlan hakkında sorunuzu yazın; Neşeli Otomotiv size buradan cevap verecek.'}
          </Text>
        ) : null}
        {messages.map((message, index) => (
          <View key={message.id} style={styles.messageGroup}>
            {index === 0 || dayKey(messages[index - 1].sentAt) !== dayKey(message.sentAt) ? <DayChip label={dayLabel(message.sentAt, nowMs)} /> : null}
            <Bubble message={message} isAdmin={isAdmin} peerName={isAdmin ? customerName : 'Neşeli Otomotiv'} />
          </View>
        ))}
        {visiblePending.map((entry) => (
          <PendingBubble key={entry.clientMessageId} entry={entry} onRetry={() => retry(entry.clientMessageId)} />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container} testID="conversation-screen">
      <FocusStatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={goBack} hitSlop={12} testID="conversation-back">
            <Icon name="chevron-left" size={30} />
          </Pressable>
          {isAdmin ? (
            <View style={styles.avatar}>
              <Text variant="subheading" style={styles.white} maxFontSizeMultiplier={1.2}>
                {initials(customerName)}
              </Text>
            </View>
          ) : (
            <LogoMark size={52} />
          )}
          <View style={styles.flex}>
            <Text variant="subheading" numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3} testID="conversation-title">
              {isAdmin ? customerName : 'Neşeli Otomotiv'}
            </Text>
            {listing ? (
              <Text variant="small" numberOfLines={1} maxFontSizeMultiplier={1.3} testID="conversation-subtitle">
                {`İlan: ${listing.title}`}
              </Text>
            ) : null}
          </View>
          {isAdmin && customerPhone ? (
            <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Müşteriyi ara" onPress={() => void Linking.openURL(`tel:${customerPhone}`)} testID="conversation-call">
              <Icon name="phone" size={24} />
            </Pressable>
          ) : null}
        </View>
        {body}
        {missing || query.isPending || failed ? null : (
          <View style={[styles.composer, { paddingBottom: Spacing.two + bottomPadding }]} testID="conversation-composer">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Mesaj yazın..."
              placeholderTextColor={Colors.textTertiary}
              maxLength={MAX_LENGTH}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={onSend}
              accessibilityLabel="Mesaj yazın"
              style={styles.input}
              testID="conversation-input"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gönder"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={onSend}
              style={[styles.send, { backgroundColor: canSend ? Colors.green : Colors.greenSoft }]}
              testID="conversation-send">
              <Icon name="send" size={24} color="white" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function DayChip({ label }: { label: string }) {
  return (
    <View style={styles.day}>
      <Text variant="smallMedium" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/** Tikler (main tasarımı + iletildi): gönderildi tek gri tik, iletildi çift gri tik, okundu çift yeşil tik. */
const TICK: Record<Message['status'], { icon: IconName; color: string; label: string }> = {
  sent: { icon: 'check', color: META_ON_NAVY, label: 'Gönderildi' },
  delivered: { icon: 'mci:check-all', color: META_ON_NAVY, label: 'İletildi' },
  read: { icon: 'mci:check-all', color: Colors.greenSoft, label: 'Okundu' },
};

function Bubble({ message, isAdmin, peerName }: { message: Message; isAdmin: boolean; peerName: string }) {
  // "Benim" mesajım: müşteride kullanıcı mesajı, yöneticide firma (yönetici) mesajı.
  const mine = isAdmin ? message.sender === 'company' : message.sender === 'user';
  const tick = TICK[message.status];
  const time = formatClock(message.sentAt);
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]} accessible accessibilityLabel={`${mine ? 'Siz' : peerName}: ${message.text}, ${time}${mine ? `, ${tick.label}` : ''}`} testID={`message-${message.id}`}>
      <Text variant="body" style={mine ? styles.white : undefined}>
        {message.text}
      </Text>
      <View style={styles.meta}>
        <Text variant="caption" style={{ color: mine ? META_ON_NAVY : Colors.textSecondary }}>
          {time}
        </Text>
        {mine ? (
          <View testID={`message-status-${message.status}`}>
            <Icon name={tick.icon} size={16} color={tick.color} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PendingBubble({ entry, onRetry }: { entry: PendingMessage; onRetry: () => void }) {
  const failed = entry.state === 'failed';
  return (
    <View style={styles.pendingColumn}>
      <View style={[styles.bubble, styles.mine, styles.pendingBubble, failed && styles.bubbleFailed]} testID={`pending-${entry.clientMessageId}`}>
        <Text variant="body" style={styles.white}>
          {entry.text}
        </Text>
        <View style={styles.meta}>
          <Text variant="caption" style={{ color: META_ON_NAVY }}>
            {failed ? 'Gönderilemedi' : 'Gönderiliyor…'}
          </Text>
        </View>
      </View>
      {failed ? (
        <View style={styles.failedRow}>
          <Text variant="caption" color="danger" align="right" testID="pending-error">
            {entry.error ? userMessage(entry.error) : 'Mesaj gönderilemedi.'}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Mesajı tekrar gönder" onPress={onRetry} hitSlop={8} style={styles.retry} testID="pending-retry">
            <Icon name="refresh-cw" size={14} />
            <Text variant="smallSemibold" color="heading">
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  white: { color: Colors.white },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Ters listedeki gibi az içerik alta yaslanır.
  spacer: { flex: 1, marginBottom: -Spacing.three },
  empty: { marginTop: Spacing.four - Spacing.three, paddingHorizontal: Spacing.four },
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
  older: { alignItems: 'center' },
  olderBtn: { minWidth: 220 },
  messageGroup: { gap: Spacing.three },
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
  pendingColumn: { alignSelf: 'flex-end', maxWidth: '80%', alignItems: 'flex-end', gap: Spacing.one },
  pendingBubble: { maxWidth: '100%' },
  bubbleFailed: { opacity: 0.75 },
  failedRow: { alignItems: 'flex-end', gap: Spacing.half },
  retry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
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
