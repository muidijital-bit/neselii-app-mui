import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useTabBarClearance } from '@/components/TabBar';
import { Icon, type IconName } from '@/components/icons/Icon';
import { formatMemberSince, initialsOf } from '@/domain';
import { FormError } from '@/features/auth/AuthForm';
import { useSignOut } from '@/features/auth/useSignOut';
import { useFavoritesQuery } from '@/features/saved/useFavorites';
import { useSavedSearchesQuery } from '@/features/saved/useSavedSearches';
import { useSession } from '@/features/session/SessionProvider';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { EDIT_PROFILE_HREF, PROFILE_TARGETS } from './routes';

/**
 * Profil (12): kullanıcı özeti (baş harfler, ad, e-posta, üyelik ayı) ve menü. Özet OTURUMDAKİ kullanıcıdan okunur (tek kaynak); profil
 * düzenleme kaydı oturumu günceller, böylece kayıt buraya anında yansır. Menü: Profil Bilgilerim (016) → düzenleme; Favori İlanlarım /
 * Kayıtlı Aramalarım (017), Bildirim Tercihleri (018), Gizlilik ve Güvenlik / Hesabımı Sil (019) → o görevlerin ekranları;
 * Çıkış Yap (007) → çıkış (hata görünür, "Çıkışı tekrar dene"). Profilde ilan ekleme/düzenleme/yönetim seçeneği yoktur.
 * Favori İlanlarım / Kayıtlı Aramalarım satırlarındaki sayılar (tasarım 12) kart, ilan detayı ve liste ekranlarıyla AYNI listeden türer
 * (`useFavoritesQuery` / `useSavedSearchesQuery`); liste yüklenemediyse ya da henüz yüklenmediyse sayı gösterilmez (sahte sayı yok).
 */
export function ProfileScreen() {
  const tabBarClearance = useTabBarClearance();
  const { session } = useSession();
  const user = session?.user ?? null;
  const router = useRouter();
  const { signOut, signingOut, failure } = useSignOut();
  const favoriteCount = useFavoritesQuery().data?.length ?? null;
  const savedSearchCount = useSavedSearchesQuery().data?.length ?? null;

  const go = (href: Href) => () => router.push(href);
  const memberSince = user ? formatMemberSince(user.memberSince) : '';
  const initials = user ? initialsOf(user.fullName) : '';

  return (
    <Screen edges={['top', 'left', 'right']} testID="tab-screen-profile">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Profil
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]} showsVerticalScrollIndicator={false} testID="profile-scroll">
        {user ? (
          <View style={styles.summary} testID="profile-summary" accessible accessibilityLabel={`${user.fullName}, ${user.email}${memberSince ? `, Üyelik: ${memberSince}` : ''}`}>
            <View style={styles.avatar}>
              {initials ? (
                <Text style={styles.initials} testID="profile-initials" maxFontSizeMultiplier={1.2}>
                  {initials}
                </Text>
              ) : (
                <Icon name="user-round" size={26} color={colors.white} />
              )}
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.name} numberOfLines={2} testID="profile-name">
                {user.fullName}
              </Text>
              <Text style={styles.email} numberOfLines={1} testID="profile-email">
                {user.email}
              </Text>
              {memberSince ? (
                <Text style={styles.member} testID="profile-member-since">
                  {`Üyelik: ${memberSince}`}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <MenuRow icon="user-round" label="Profil Bilgilerim" onPress={go(EDIT_PROFILE_HREF)} testID="profile-menu-edit" />
          <MenuRow icon="heart" label={PROFILE_TARGETS.favorites.title} value={favoriteCount} onPress={go(PROFILE_TARGETS.favorites.href)} testID="profile-menu-favorites" />
          <MenuRow
            icon="bookmark"
            label={PROFILE_TARGETS.savedSearches.title}
            value={savedSearchCount}
            onPress={go(PROFILE_TARGETS.savedSearches.href)}
            testID="profile-menu-saved-searches"
          />
          <MenuRow
            icon="bell"
            label={PROFILE_TARGETS.notificationPreferences.title}
            onPress={go(PROFILE_TARGETS.notificationPreferences.href)}
            last
            testID="profile-menu-notification-preferences"
          />
        </View>

        <FormError message={failure ? `Çıkış yapılamadı. ${failure.message ?? ''}`.trim() : null} testID="profile-sign-out-error" />
        <View style={styles.card}>
          <MenuRow icon="shield" label={PROFILE_TARGETS.privacy.title} onPress={go(PROFILE_TARGETS.privacy.href)} testID="profile-menu-privacy" />
          <MenuRow
            icon="log-out"
            label={failure ? 'Çıkışı tekrar dene' : 'Çıkış Yap'}
            onPress={() => void signOut()}
            busy={signingOut}
            chevron={false}
            last
            testID="profile-sign-out"
          />
        </View>

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PROFILE_TARGETS.deleteAccount.title}
            onPress={go(PROFILE_TARGETS.deleteAccount.href)}
            style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
            testID="profile-menu-delete-account">
            <Icon name="trash-2" size={20} color={colors.danger} />
            <View style={styles.deleteText}>
              <Text style={styles.deleteTitle}>{PROFILE_TARGETS.deleteAccount.title}</Text>
              <Text style={styles.deleteNote}>Hesabınız ve size ait tüm veriler kalıcı olarak silinir.</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.slateFaint} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  value = null,
  onPress,
  last = false,
  chevron = true,
  busy = false,
  testID,
}: {
  icon: IconName;
  label: string;
  /** Satır sonundaki sayı (tasarım 12: Montserrat 600 13, `slate`); `null` = gösterilmez. */
  value?: number | null;
  onPress: () => void;
  last?: boolean;
  chevron?: boolean;
  busy?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? `${label}, yükleniyor` : value === null ? label : `${label}, ${value}`}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.pressed]}
      testID={testID}>
      <Icon name={icon} size={20} color={colors.blue} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value === null ? null : (
        <Text style={styles.rowValue} testID={`${testID}-count`}>
          {value}
        </Text>
      )}
      {busy ? <ActivityIndicator size="small" color={colors.blue} testID={`${testID}-busy`} /> : chevron ? <Icon name="chevron-right" size={18} color={colors.slateFaint} /> : null}
    </Pressable>
  );
}

// Değerler design/claude-design/AppScreen.dc.html (12): üst çubuk 56, içerik 16 iç boşluk / 14 aralık, kartlar beyaz r14 kenarlı,
// satırlar 56 yüksek (16 / 14 iç boşluk, 14 aralık), avatar 56.
const styles = StyleSheet.create({
  header: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.xl, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  title: { ...textStyles.titlePage, color: colors.navy },
  content: { padding: spacing.xl, gap: 14 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.xl, backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamily.montserrat700, fontSize: 18, lineHeight: 21.6, color: colors.white },
  summaryText: { flex: 1, minWidth: 0, gap: spacing.xs },
  name: { fontFamily: fontFamily.montserrat700, fontSize: 17, lineHeight: 20.4, color: colors.navy },
  email: { fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 15.6, color: colors.slate },
  member: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 14.4, color: colors.slateLight },
  card: { backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: spacing.xl, paddingRight: 14, backgroundColor: colors.white },
  rowValue: { fontFamily: fontFamily.montserrat600, fontSize: 13, lineHeight: 15.6, color: colors.slate },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  rowLabel: { flex: 1, fontFamily: fontFamily.inter500, fontSize: 15, lineHeight: 19.5, color: colors.ink },
  pressed: { backgroundColor: colors.surface },
  deleteRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: spacing.lg, paddingLeft: spacing.xl, paddingRight: 14, backgroundColor: colors.white },
  deleteText: { flex: 1, gap: 3 },
  deleteTitle: { fontFamily: fontFamily.inter600, fontSize: 15, lineHeight: 19.5, color: colors.danger },
  deleteNote: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 16.2, color: colors.slateLight },
});
