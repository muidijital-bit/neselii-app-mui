import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { userMessage, type Advisor } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Badge, Card } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { initials } from '@/ui/format';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { NEW_ADVISOR, advisorEditHref } from './routes';
import { useAdvisorsQuery } from './useAdvisors';

/**
 * Yönetici: danışmanlar (Profil → Danışmanlar). Aktif ve pasif danışmanlar ada göre listelenir; satıra dokununca düzenleme açılır, alttaki
 * "Danışman Ekle" yeni danışman formunu açar. Yeni taleplere yalnız aktif danışmanlar rastgele atanır.
 */
export function AdvisorsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useAdvisorsQuery(true);
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
      <View style={styles.loading} accessible accessibilityLabel="Danışmanlar yükleniyor">
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Danışmanlar yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="advisors-error" />;
  } else {
    empty = <StateMessage top icon="users" title="Henüz danışman yok" message="Talepler danışmanlara otomatik atanır. İlk danışmanı ekleyin." testID="advisors-empty" />;
  }

  const advisors = query.data ?? [];
  const activeCount = advisors.filter((advisor) => advisor.active).length;

  return (
    <View style={styles.container} testID="advisors-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Danışmanlar" testID="advisors-back" right={<AdminBadge />} />
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={advisors}
        keyExtractor={(advisor) => advisor.id}
        ListHeaderComponent={
          advisors.length > 0 ? (
            <Text variant="small" testID="advisors-count">
              {`${activeCount} aktif danışman · yeni talepler aktif danışmanlara rastgele atanır`}
            </Text>
          ) : null
        }
        renderItem={({ item }) => <AdvisorRow advisor={item} onPress={() => router.push(advisorEditHref(item.id))} />}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="advisors-list"
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Button title="Danışman Ekle" icon="user-plus" onPress={() => router.push(advisorEditHref(NEW_ADVISOR))} testID="advisors-add" />
      </View>
    </View>
  );
}

function AdvisorRow({ advisor, onPress }: { advisor: Advisor; onPress: () => void }) {
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${advisor.fullName}${advisor.active ? '' : ', pasif'}, düzenle`}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`advisor-row-${advisor.id}`}>
        <View style={[styles.avatar, !advisor.active && styles.avatarInactive]}>
          <Text variant="bodySemibold" style={styles.avatarText} maxFontSizeMultiplier={1.2}>
            {initials(advisor.fullName)}
          </Text>
        </View>
        <View style={styles.text}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {advisor.fullName}
          </Text>
          <Text variant="small" numberOfLines={1}>
            {advisor.phone ?? 'Telefon girilmedi'}
          </Text>
        </View>
        {advisor.active ? null : <Badge label="Pasif" />}
        <Icon name="chevron-right" size={22} color="textTertiary" />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
  avatar: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarInactive: { backgroundColor: Colors.textTertiary },
  avatarText: { color: Colors.white },
  text: { flex: 1, gap: 2 },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
