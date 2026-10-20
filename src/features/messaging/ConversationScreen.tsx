import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { Image } from 'expo-image';

import { StripePlaceholder } from '@/components/StripePlaceholder';
import { Icon } from '@/components/icons/Icon';
import { formatMoney, formatRelativeDate, initialsOf, toAppError, userMessage, type Conversation, type Message } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { listingHref } from '@/features/listings/routes';
import { useSession } from '@/features/session/SessionProvider';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { formatClock } from './presentation';
import { useConversationChat, type PendingMessage } from './useConversationChat';
import { useScreenVisible } from './useScreenVisible';
import { messagingKeys, useMarkConversationRead } from './useMessagingQueries';

const MAX_LENGTH = 2000;
/** En alta bu kadar piksel yakınsa kullanıcı "altta" sayılır (yeni mesaj gelince alta kayılır). */
const BOTTOM_THRESHOLD = 80;
const TURKEY_OFFSET_MS = 3 * 3_600_000;
const dayKey = (iso: string) => new Date(Date.parse(iso) + TURKEY_OFFSET_MS).toISOString().slice(0, 10);

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
 * İlan sohbeti (10): kullanıcı ↔ Neşeli Otomotiv, ilana bağlı. Üstte ilan kartı (ilana gider), mesaj balonları (tik durumları),
 * altta composer. Boş mesaj gönderilmez; gönderim hatasında mesaj "Gönderilemedi · Tekrar dene" kalır ve aynı kimlikle yeniden denenir.
 * Başkasının/olmayan görüşme güvenli "bulunamadı" durumuna düşer.
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
  const customerName = conversationInfo?.customer?.fullName ?? 'Müşteri';

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
    body = <StateMessage icon="info" title="Görüşme bulunamadı" message="Bu görüşme mevcut değil ya da erişiminiz yok." actionLabel="Mesajlara dön" actionIcon="arrow-left" onAction={goBack} testID="conversation-missing" />;
  } else if (query.isPending) {
    body = (
      <View style={styles.center} accessible accessibilityLabel="Mesajlar yükleniyor" accessibilityState={{ busy: true }} testID="conversation-loading">
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  } else if (failed) {
    body = <StateMessage icon="info" title="Mesajlar yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void query.refetch()} testID="conversation-error" />;
  } else {
    // Henüz mesaj yoksa (2. aşama tasarımı) ilan kartı yazma alanının hemen üstünde, altında yönlendirme metniyle durur.
    const isEmpty = messages.length === 0 && visiblePending.length === 0 && !query.hasNextPage;
    body = (
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.messages, isEmpty && styles.messagesEmpty]}
        stickyHeaderIndices={listing && !isEmpty ? [0] : undefined}
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
        {isEmpty ? <View style={styles.flex} /> : null}
        {listing ? (
          <View style={[styles.listingWrap, isEmpty && styles.listingWrapEmpty]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`İlan: ${listing.title}, ${formatMoney(listing.price)}`} onPress={() => router.push(listingHref(listing.id))} style={styles.listingCard} testID="conversation-listing">
              <View style={[styles.listingThumb, isEmpty && styles.listingThumbLarge]}>
                {listing.coverImageUri ? (
                  <Image source={{ uri: listing.coverImageUri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
                ) : (
                  <StripePlaceholder width={isEmpty ? 76 : 56} height={isEmpty ? 64 : 48} />
                )}
              </View>
              <View style={styles.listingText}>
                <Text numberOfLines={2} style={styles.listingTitle}>
                  {listing.title}
                </Text>
                <Text style={styles.listingPrice}>{formatMoney(listing.price)}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.slateFaint} />
            </Pressable>
          </View>
        ) : null}
        {query.hasNextPage ? (
          <View style={styles.older}>
            {query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.blue} accessibilityLabel="Eski mesajlar yükleniyor" testID="conversation-older-loading" />
            ) : (
              <Btn label="Daha eski mesajlar" variant="secondary" onPress={loadOlder} style={styles.olderBtn} testID="conversation-older" />
            )}
          </View>
        ) : null}
        {query.isFetchNextPageError ? (
          <Text style={[textStyles.caption, styles.olderError]} testID="conversation-older-error">
            {userMessage(queryError)}
          </Text>
        ) : null}
        {isEmpty ? (
          <Text style={[textStyles.bodySmall, styles.emptyNote]} testID="conversation-empty">
            {isAdmin ? `${customerName} henüz mesaj yazmadı.` : 'İlan hakkında sorunuzu yazın; Neşeli Otomotiv size buradan cevap verecek.'}
          </Text>
        ) : null}
        {messages.map((message, index) => (
          <View key={message.id} style={styles.messageGroup}>
            {index === 0 || dayKey(messages[index - 1].sentAt) !== dayKey(message.sentAt) ? <DayChip label={formatRelativeDate(message.sentAt, nowMs)} /> : null}
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
    <Screen background={colors.surface} edges={['top', 'left', 'right']} testID="conversation-screen">
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={goBack} hitSlop={4} style={styles.back} testID="conversation-back">
            <Icon name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'} size={Platform.OS === 'ios' ? 26 : 24} color={colors.navy} />
          </Pressable>
          <View style={styles.avatar}>
            {isAdmin ? (
              <Text style={styles.avatarInitials} maxFontSizeMultiplier={1.2}>
                {initialsOf(customerName) || 'M'}
              </Text>
            ) : (
              <BrandLogo variant="emblem" height={19} accessibilityLabel="Neşeli Otomotiv" />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.company} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.3} testID="conversation-title">
              {isAdmin ? customerName : 'Neşeli Otomotiv'}
            </Text>
            {listing ? (
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.subtitle} testID="conversation-subtitle">
                {`İlan: ${listing.title}`}
              </Text>
            ) : null}
          </View>
        </View>
        {body}
        {missing || query.isPending || failed ? null : (
          <View style={[styles.composer, { paddingBottom: spacing.md + bottomPadding }]} testID="conversation-composer">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Mesaj yazın..."
              placeholderTextColor={colors.slateFaint}
              maxLength={MAX_LENGTH}
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
              style={[styles.sendButton, !canSend && styles.sendDisabled]}
              testID="conversation-send">
              <Icon name="send-horizontal" size={20} color={colors.white} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DayChip({ label }: { label: string }) {
  return (
    <View style={styles.dayWrap}>
      <Text style={styles.dayChip}>{label}</Text>
    </View>
  );
}

const TICK: Record<Message['status'], { icon: 'check' | 'check-check'; color: string; label: string }> = {
  sent: { icon: 'check', color: colors.blueLight, label: 'Gönderildi' },
  delivered: { icon: 'check-check', color: colors.blueLight, label: 'İletildi' },
  read: { icon: 'check-check', color: colors.greenTick, label: 'Okundu' },
};

function Bubble({ message, isAdmin, peerName }: { message: Message; isAdmin: boolean; peerName: string }) {
  // "Benim" mesajım: müşteride kullanıcı mesajı, yöneticide firma (yönetici) mesajı.
  const mine = isAdmin ? message.sender === 'company' : message.sender === 'user';
  const tick = TICK[message.status];
  const time = formatClock(message.sentAt);
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]} accessible accessibilityLabel={`${mine ? 'Siz' : peerName}: ${message.text}, ${time}${mine ? `, ${tick.label}` : ''}`} testID={`message-${message.id}`}>
        <Text style={[styles.bubbleText, mine ? styles.textMine : styles.textTheirs]}>{message.text}</Text>
        <View style={styles.meta}>
          <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{time}</Text>
          {mine ? (
            <View testID={`message-status-${message.status}`}>
              <Icon name={tick.icon} size={14} color={tick.color} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PendingBubble({ entry, onRetry }: { entry: PendingMessage; onRetry: () => void }) {
  const failed = entry.state === 'failed';
  return (
    <View style={[styles.bubbleRow, styles.rowMine]}>
      <View style={styles.pendingColumn}>
        <View style={[styles.bubble, styles.bubbleMine, failed && styles.bubbleFailed]} testID={`pending-${entry.clientMessageId}`}>
          <Text style={[styles.bubbleText, styles.textMine]}>{entry.text}</Text>
          <View style={styles.meta}>
            <Text style={[styles.time, styles.timeMine]}>{failed ? 'Gönderilemedi' : 'Gönderiliyor…'}</Text>
          </View>
        </View>
        {failed ? (
          <View style={styles.failedRow}>
            <Text style={styles.failedText} testID="pending-error">
              {entry.error ? userMessage(entry.error) : 'Mesaj gönderilemedi.'}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Mesajı tekrar gönder" onPress={onRetry} hitSlop={8} style={styles.retry} testID="pending-retry">
              <Icon name="refresh-cw" size={14} color={colors.blue} />
              <Text style={styles.retryText}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs, paddingRight: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0, gap: 3, marginLeft: spacing.xs },
  avatarInitials: { fontFamily: fontFamily.montserrat700, fontSize: 14, color: colors.white },
  company: { fontFamily: fontFamily.montserrat700, fontSize: 15, lineHeight: 16.5, color: colors.navy },
  subtitle: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 13.2, color: colors.slateLight },
  messages: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: 10 },
  listingWrap: { paddingTop: spacing.lg, backgroundColor: colors.surface },
  listingCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: radii.card },
  listingThumb: { width: 56, height: 48, borderRadius: radii.md, overflow: 'hidden' },
  listingText: { flex: 1, minWidth: 0, gap: 5 },
  listingTitle: { fontFamily: fontFamily.montserrat600, fontSize: 13, lineHeight: 16.25, color: colors.navy },
  listingPrice: { fontFamily: fontFamily.montserrat700, fontSize: 15, lineHeight: 15, color: colors.navy },
  older: { alignItems: 'center' },
  olderBtn: { maxWidth: 220 },
  olderError: { color: colors.danger, textAlign: 'center' },
  emptyNote: { color: colors.slate, textAlign: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.xl },
  messagesEmpty: { flexGrow: 1 },
  listingWrapEmpty: { backgroundColor: 'transparent' },
  listingThumbLarge: { width: 76, height: 64 },
  messageGroup: { gap: 10 },
  dayWrap: { alignItems: 'center', marginVertical: spacing.xs },
  dayChip: { fontFamily: fontFamily.inter500, fontSize: 12, lineHeight: 12, color: colors.slate, backgroundColor: colors.stripe, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', gap: spacing.xs },
  bubbleMine: { backgroundColor: colors.navy, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4, paddingTop: 10, paddingRight: 12, paddingBottom: 6, paddingLeft: 14 },
  bubbleTheirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 4, borderBottomRightRadius: 16, paddingTop: 10, paddingRight: 14, paddingBottom: 6, paddingLeft: 12 },
  bubbleFailed: { opacity: 0.75 },
  bubbleText: { fontFamily: fontFamily.inter400, fontSize: 14, lineHeight: 20.3 },
  textMine: { color: colors.white },
  textTheirs: { color: colors.ink },
  meta: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: { fontFamily: fontFamily.inter400, fontSize: 11, lineHeight: 11 },
  timeMine: { color: colors.blueLight },
  timeTheirs: { color: colors.slateLight },
  pendingColumn: { maxWidth: '78%', alignItems: 'flex-end', gap: spacing.xs },
  failedRow: { alignItems: 'flex-end', gap: spacing.xxs },
  failedText: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 15.6, color: colors.danger, textAlign: 'right' },
  retry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  retryText: { fontFamily: fontFamily.inter600, fontSize: 13, lineHeight: 16, color: colors.blue },
  composer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md, paddingLeft: spacing.lg, paddingRight: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  input: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: 22, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, marginRight: spacing.sm, fontFamily: fontFamily.inter400, fontSize: 15, color: colors.ink },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
