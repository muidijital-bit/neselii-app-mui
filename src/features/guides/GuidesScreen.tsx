import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SECTORS, sectorById, userMessage, type Guide, type SectorId } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSector } from '@/features/sector/SectorProvider';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Badge, Card, Chip } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { NEW_GUIDE, guideEditHref, guideHref } from './routes';
import { useGuidesQuery } from './useGuides';

/**
 * Madde 46: sektör rehberi. Üstte sektör çipleri (varsayılan: kullanıcının seçtiği sektör); seçilen sektörün ve genel yazılar en yeni önce.
 * Yönetici taslakları da görür ("Taslak" etiketi) ve "Yeni Rehber Yazısı" ile ekler.
 */
export function GuidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAdmin = useIsAdmin();
  const { sector: mySector } = useSector();
  const [sector, setSector] = useState<SectorId | null>(mySector);
  const query = useGuidesQuery(sector);
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
    empty = <StateMessage icon="wifi-off" title="Rehber yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="guides-error" />;
  } else {
    empty = <StateMessage top icon="book-open" title="Henüz yazı yok" message="Bu sektör için rehber yazıları yakında burada olacak." testID="guides-empty" />;
  }

  return (
    <View style={styles.container} testID="guides-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Sektör Rehberi" testID="guides-back" right={<AdminBadge />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tümü" selected={sector === null} onPress={() => setSector(null)} />
          {SECTORS.map((s) => (
            <Chip key={s.id} label={s.label} selected={sector === s.id} onPress={() => setSector(s.id)} />
          ))}
        </ScrollView>
      </PageHeader>
      <FlatList
        style={styles.flex}
        contentContainerStyle={[styles.list, isAdmin && { paddingBottom: insets.bottom + 96 }]}
        data={query.data ?? []}
        keyExtractor={(guide) => guide.id}
        renderItem={({ item }) => <GuideCard guide={item} onPress={() => router.push(guideHref(item.id))} />}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="guides-list"
      />
      {isAdmin ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
          <Button title="Yeni Rehber Yazısı" icon="edit-3" onPress={() => router.push(guideEditHref(NEW_GUIDE))} testID="guides-new" />
        </View>
      ) : null}
    </View>
  );
}

function GuideCard({ guide, onPress }: { guide: Guide; onPress: () => void }) {
  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID={`guide-${guide.id}`}>
        <View style={styles.head}>
          <Text variant="caption" style={styles.flex}>
            {guide.sector ? sectorById(guide.sector).label : 'Genel'}
          </Text>
          {guide.published ? null : <Badge label="Taslak" tone="warning" />}
        </View>
        <Text variant="subheading">{guide.title}</Text>
        <Text variant="small" numberOfLines={3}>
          {guide.body}
        </Text>
        <View style={styles.more}>
          <Text variant="smallSemibold" color="green">
            Devamını oku
          </Text>
          <Icon name="arrow-right" size={16} color="green" />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  chips: { gap: Spacing.two, paddingRight: Spacing.three },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  card: { padding: Spacing.three, gap: Spacing.one + 2 },
  pressed: { backgroundColor: Colors.background },
  head: { flexDirection: 'row', alignItems: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
