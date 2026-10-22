import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSignOut } from '@/features/auth/useSignOut';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useOnboarding } from '@/features/onboarding';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useFavoritesQuery } from '@/features/saved/useFavorites';
import { useSavedSearchesQuery } from '@/features/saved/useSavedSearches';
import { useSession } from '@/features/session/SessionProvider';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { formatMonthYear, initials } from '@/ui/format';
import { Icon, type IconName } from '@/ui/Icon';
import { enterFadeUp } from '@/ui/motion';
import { useTabBarSpace } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Card, Divider } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { EDIT_PROFILE_HREF, PROFILE_TARGETS } from './routes';

// Test araçları (main ile aynı): geliştirme sürümünde ve Expo Go'da görünür, TestFlight/App Store sürümünde gizli.
const showTestTools = __DEV__ || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Profil (main tasarımı): kullanıcı kartı (baş harfler, ad, e-posta, üyelik ayı) ve menü kartları. Özet OTURUMDAKİ kullanıcıdan okunur (tek kaynak);
 * profil düzenleme kaydı oturumu günceller, böylece kayıt buraya anında yansır. Yöneticide adın altında "Yönetici" rozeti görünür.
 * Main'deki firma paneli (ilan/duyuru yönetimi) bu uygulamada yoktur. "Tanıtımı yeniden göster (test)" satırı yalnız geliştirme sürümünde /
 * Expo Go'da görünür: tanıtım bayrağını sıfırlar, oturum açık kalır; yönlendirme tanıtımı açar ve tanıtım bitince ana sayfaya döner.
 * Kartlar ilk açılışta kademeli, hafifçe yükselerek gelir (hareketi azalt açıkken anında).
 * Favori İlanlarım / Kayıtlı Aramalarım sayıları kart, ilan detayı ve liste ekranlarıyla AYNI listeden türer (`useFavoritesQuery` /
 * `useSavedSearchesQuery`); liste yüklenemediyse ya da henüz yüklenmediyse sayı gösterilmez (sahte sayı yok).
 * Çıkış Yap → `useSignOut` (hata görünür, "Çıkışı tekrar dene").
 */
export function ProfileScreen() {
  const tabBarSpace = useTabBarSpace();
  const { session } = useSession();
  const user = session?.user ?? null;
  const router = useRouter();
  const { signOut, signingOut, failure } = useSignOut();
  const onboarding = useOnboarding();
  const favoriteCount = useFavoritesQuery().data?.length ?? null;
  const savedSearchCount = useSavedSearchesQuery().data?.length ?? null;

  const go = (href: Href) => () => router.push(href);
  const name = user ? user.fullName || user.email.split('@')[0] || '' : '';
  const memberSince = user && Number.isFinite(Date.parse(user.memberSince)) ? formatMonthYear(user.memberSince) : '';

  return (
    <View style={styles.container} testID="tab-screen-profile">
      <FocusStatusBar style="dark" />
      <PageHeader title="Profil" back={false} right={<AdminBadge testID="profile-header-admin-badge" />} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]} testID="profile-scroll">
        {user ? (
          <EnterCard index={0} style={styles.userCard}>
            <View style={styles.summary} testID="profile-summary" accessible accessibilityLabel={`${name}, ${user.email}${memberSince ? `, Üyelik: ${memberSince}` : ''}`}>
              <View style={styles.avatar}>
                <Text variant="heading" style={styles.avatarText} testID="profile-initials" maxFontSizeMultiplier={1.2}>
                  {initials(name)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="heading" numberOfLines={1} testID="profile-name">
                  {name}
                </Text>
                {user.role === 'admin' ? (
                  <View style={styles.adminBadge} testID="profile-admin-badge">
                    <Icon name="shield" size={14} color="success" />
                    <Text variant="smallSemibold" color="success">
                      Yönetici
                    </Text>
                  </View>
                ) : null}
                <Text variant="body" color="textSecondary" numberOfLines={1} testID="profile-email">
                  {user.email}
                </Text>
                {memberSince ? (
                  <Text variant="small" testID="profile-member-since">
                    Üyelik: {memberSince}
                  </Text>
                ) : null}
              </View>
            </View>
          </EnterCard>
        ) : null}

        <EnterCard index={1}>
          <MenuRow icon="user" title="Profil Bilgilerim" onPress={go(EDIT_PROFILE_HREF)} testID="profile-menu-edit" />
          <Divider />
          <MenuRow icon="heart" title={PROFILE_TARGETS.favorites.title} value={favoriteCount} onPress={go(PROFILE_TARGETS.favorites.href)} testID="profile-menu-favorites" />
          <Divider />
          <MenuRow
            icon="bookmark"
            title={PROFILE_TARGETS.savedSearches.title}
            value={savedSearchCount}
            onPress={go(PROFILE_TARGETS.savedSearches.href)}
            testID="profile-menu-saved-searches"
          />
          <Divider />
          <MenuRow
            icon="bell"
            title={PROFILE_TARGETS.notificationPreferences.title}
            onPress={go(PROFILE_TARGETS.notificationPreferences.href)}
            testID="profile-menu-notification-preferences"
          />
        </EnterCard>

        {failure ? (
          <Text variant="small" color="danger" style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="profile-sign-out-error">
            {`Çıkış yapılamadı. ${failure.message ?? ''}`.trim()}
          </Text>
        ) : null}
        <EnterCard index={2}>
          <MenuRow icon="shield" title={PROFILE_TARGETS.privacy.title} onPress={go(PROFILE_TARGETS.privacy.href)} testID="profile-menu-privacy" />
          <Divider />
          <MenuRow
            icon="log-out"
            title={failure ? 'Çıkışı tekrar dene' : 'Çıkış Yap'}
            chevron={false}
            busy={signingOut}
            onPress={() => void signOut()}
            testID="profile-sign-out"
          />
        </EnterCard>

        {showTestTools ? (
          <EnterCard index={3}>
            <MenuRow
              icon="refresh-cw"
              title="Tanıtımı yeniden göster (test)"
              chevron={false}
              onPress={() => void onboarding.reset()}
              testID="profile-reset-onboarding"
            />
          </EnterCard>
        ) : null}

        <EnterCard index={4}>
          <MenuRow
            icon="trash-2"
            tone="danger"
            title={PROFILE_TARGETS.deleteAccount.title}
            subtitle="Hesabınız ve size ait tüm veriler kalıcı olarak silinir."
            onPress={go(PROFILE_TARGETS.deleteAccount.href)}
            testID="profile-menu-delete-account"
          />
        </EnterCard>
      </ScrollView>
    </View>
  );
}

/** İlk açılışta kademeli, hafifçe yükselerek gelen kart (`index` gecikme sırası). */
function EnterCard({ index, style, children }: { index: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Animated.View entering={enterFadeUp(index)}>
      <Card style={style}>{children}</Card>
    </Animated.View>
  );
}

type MenuRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Satır sonundaki sayı; `null`/yok = gösterilmez. */
  value?: number | null;
  tone?: 'default' | 'danger';
  chevron?: boolean;
  busy?: boolean;
  onPress: () => void;
  testID: string;
};

/** `@/ui/Ui` MenuRow ile birebir aynı görünüm; ek olarak testID, sayı testID'si ve meşgul (çıkış sürerken) durumu. */
function MenuRow({ icon, title, subtitle, value = null, tone = 'default', chevron = true, busy = false, onPress, testID }: MenuRowProps) {
  const danger = tone === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? `${title}, yükleniyor` : value === null ? title : `${title}, ${value}`}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
      testID={testID}>
      <Icon name={icon} size={24} color={danger ? 'danger' : 'heading'} />
      <View style={styles.menuText}>
        <Text variant="bodyMedium" color={danger ? 'danger' : 'text'} style={styles.menuTitle}>
          {title}
        </Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      {value !== null ? (
        <Text variant="bodySemibold" color="textSecondary" testID={`${testID}-count`}>
          {value}
        </Text>
      ) : null}
      {busy ? <ActivityIndicator size="small" color={Colors.navy} testID={`${testID}-busy`} /> : chevron ? <Icon name="chevron-right" size={22} color="textTertiary" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  userCard: { padding: Spacing.four },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 24 },
  adminBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half,
    marginVertical: Spacing.half,
    backgroundColor: Colors.successSoft,
  },
  error: { marginHorizontal: Spacing.one },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four - Spacing.one,
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 17 },
  pressed: { backgroundColor: Colors.background },
});
