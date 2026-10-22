import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { asListingId, toAppError, userMessage, type AppError } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Colors } from '@/ui/theme';

import { MessagingState } from './MessagingState';
import { conversationHref } from './routes';
import { messagingKeys } from './useMessagingQueries';

/**
 * İlan detayındaki "Mesaj Gönder" hedefi: ilan için sohbeti alır/oluşturur (kullanıcı + ilan başına tek sohbet) ve sohbet ekranına
 * YERİNE geçer (geri, ilan detayına döner). Ekran kapanır/oturum değişirse gecikmiş sonuç yok sayılır; hata ve yeniden deneme vardır.
 */
export function ListingContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listingId = '' } = useLocalSearchParams<{ listingId?: string }>();
  const { messaging } = useServices();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (listingId === '' || userId === null) return undefined;
    let cancelled = false;
    setError(null);
    messaging
      .getOrCreateConversation(asListingId(listingId))
      .then((conversation) => {
        if (cancelled) return;
        queryClient.setQueryData(messagingKeys.conversation(userId, conversation.id), conversation);
        void queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) });
        router.replace(conversationHref(conversation.id));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(toAppError(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, userId, attempt, messaging, queryClient, router]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const notFound = listingId === '' || error?.kind === 'notFound';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="listing-contact-screen">
      <FocusStatusBar style="dark" />
      {notFound ? (
        <MessagingState icon="info" title="İlan bulunamadı" message="Bu ilan yayından kalkmış ya da mevcut değil; bu ilan için görüşme başlatılamaz." actionLabel="Geri dön" actionIcon="arrow-left" onAction={goBack} testID="listing-contact-missing" />
      ) : error ? (
        <MessagingState icon="info" title="Görüşme açılamadı" message={userMessage(error)} actionLabel="Tekrar dene" actionIcon="refresh-cw" onAction={() => setAttempt((n) => n + 1)} testID="listing-contact-error" />
      ) : (
        <MessagingState loading loadingLabel="Görüşme hazırlanıyor" testID="listing-contact-loading" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background } });
