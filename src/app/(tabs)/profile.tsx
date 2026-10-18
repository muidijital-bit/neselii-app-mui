import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { useTabBarSpace } from '@/components/tab-bar';
import { Card, Divider, MenuRow } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFavoriteIds } from '@/features/favorites/api';
import { useProfile } from '@/features/profile/api';
import { useSavedSearches } from '@/features/saved-searches/api';
import { formatMonthYear, initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();
  const favorites = useFavoriteIds();
  const savedSearches = useSavedSearches();
  const tabBarSpace = useTabBarSpace();

  const name = profile.data?.full_name || session?.user.email?.split('@')[0] || '';

  const confirmSignOut = () =>
    Alert.alert('Çıkış yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => signOut().catch((e: Error) => Alert.alert('Hata', e.message)),
      },
    ]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profil" back={false} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}>
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text variant="heading" style={styles.avatarText}>
              {initials(name)}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="body" color="textSecondary" numberOfLines={1}>
              {session?.user.email}
            </Text>
            {session?.user.created_at ? (
              <Text variant="small">Üyelik: {formatMonthYear(session.user.created_at)}</Text>
            ) : null}
          </View>
        </Card>

        <Card>
          <MenuRow icon="user" title="Profil Bilgilerim" onPress={() => router.push('/account/edit')} />
          <Divider />
          <MenuRow
            icon="heart"
            title="Favori İlanlarım"
            value={favorites.data?.size ?? 0}
            onPress={() => router.push('/account/favorites')}
          />
          <Divider />
          <MenuRow
            icon="bookmark"
            title="Kayıtlı Aramalarım"
            value={savedSearches.data?.length ?? 0}
            onPress={() => router.push('/account/saved-searches')}
          />
          <Divider />
          <MenuRow
            icon="bell"
            title="Bildirim Tercihleri"
            onPress={() => router.push('/account/notification-settings')}
          />
        </Card>

        {profile.data?.role === 'admin' ? (
          <Card>
            <Text variant="overline" style={styles.panelLabel}>
              Firma Paneli
            </Text>
            <MenuRow icon="list" title="İlan Yönetimi" onPress={() => router.push('/admin/listings')} />
            <Divider />
            <MenuRow icon="plus-circle" title="Yeni İlan Ekle" onPress={() => router.push('/admin/listing-form')} />
            <Divider />
            <MenuRow
              icon="mci:bullhorn-outline"
              title="Duyurular"
              onPress={() => router.push('/admin/announcements')}
            />
          </Card>
        ) : null}

        <Card>
          <MenuRow icon="shield" title="Gizlilik ve Güvenlik" onPress={() => router.push('/account/privacy')} />
          <Divider />
          <MenuRow icon="log-out" title="Çıkış Yap" chevron={false} onPress={confirmSignOut} />
        </Card>

        <Card>
          <MenuRow
            icon="trash-2"
            tone="danger"
            title="Hesabımı Sil"
            subtitle="Hesabınız ve size ait tüm veriler kalıcı olarak silinir."
            onPress={() => router.push('/account/delete')}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, padding: Spacing.four },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 24 },
  panelLabel: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, color: Colors.green },
});
