import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { StateView } from '@/components/state-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useConversations } from '@/features/messages/api';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function MessagesScreen() {
  const theme = useTheme();
  const { userId } = useAuth();
  const conversations = useConversations();

  if (!userId) {
    return (
      <ThemedView style={styles.container}>
        <StateView
          title="Mesajlarınız"
          message="Satıcılarla mesajlaşmak için giriş yapın."
          actionTitle="Giriş yap"
          onAction={() => router.push('/sign-in')}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void conversations.refetch()}
        refreshing={conversations.isRefetching}
        renderItem={({ item }) => {
          const other = item.buyer_id === userId ? item.seller : item.buyer;
          return (
            <Link href={{ pathname: '/chat/[id]', params: { id: item.id } }} asChild>
              <Pressable style={[styles.row, { borderBottomColor: theme.border }]}>
                <Image source={item.listing?.cover_image_url} style={styles.thumb} contentFit="cover" />
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {other?.full_name ?? 'Kullanıcı'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.listing?.title}
                  </ThemedText>
                  <ThemedText type="small" numberOfLines={1}>
                    {item.last_message ?? 'Konuşma başlatıldı'}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatTime(item.last_message_at)}
                </ThemedText>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={
          conversations.isLoading ? (
            <StateView loading />
          ) : (
            <StateView title="Mesajınız yok" message="Bir ilan sayfasından satıcıya mesaj gönderebilirsiniz." />
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  rowBody: { flex: 1, gap: Spacing.half },
});
