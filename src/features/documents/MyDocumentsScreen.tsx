import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { userMessage } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Card } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { DocumentRow } from './DocumentRow';
import { useMyDocuments } from './useDocuments';

/** Madde 52: Belgelerim — firmanın gönderdiği teklif, ekspertiz, teslimat ve sözleşme belgeleri (en yeni önce). */
export function MyDocumentsScreen() {
  const router = useRouter();
  const query = useMyDocuments();
  const { refetch } = query;
  const { pulling, onRefresh } = usePullRefresh(refetch);
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Belgeler yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="my-documents-error" />;
  } else {
    empty = (
      <StateMessage
        top
        icon="file-text"
        title="Henüz belgeniz yok"
        message="Teklif, ekspertiz ve teslimat belgeleriniz danışmanınız gönderdikçe burada saklanır."
        actionLabel="İlanlara göz at"
        actionIcon="search"
        onAction={() => router.navigate('/')}
        testID="my-documents-empty"
      />
    );
  }

  return (
    <View style={styles.container} testID="my-documents-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Belgelerim" testID="my-documents-back" />
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={query.data ?? []}
        keyExtractor={(doc) => doc.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <DocumentRow doc={item} />
          </Card>
        )}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="my-documents-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  card: { paddingHorizontal: Spacing.three },
});
