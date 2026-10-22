import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

const POINTS: readonly { icon: IconName; text: string }[] = [
  { icon: 'users', text: 'Her görüşme müşterinin adı ve sorduğu ilanla birlikte listelenir.' },
  { icon: 'send', text: 'Yazdığınız cevaplar müşteriye Neşeli Otomotiv adına gider.' },
  { icon: 'bell', text: 'Yeni müşteri mesajı geldiğinde bildirim ve sekmedeki sayaçla haber verilir.' },
];

/** Kapanış animasyonu bitince pencere kaldırılır. */
const EXIT_MS = 220;
/** Bu yüksekliğin altındaki ekranlarda (ör. 360×640) kart sıkılaşır: daha küçük simge, dar boşluklar. */
const COMPACT_HEIGHT = 700;

/**
 * Yöneticiye Mesajlar sekmesinin ne işe yaradığını anlatan tek seferlik pencere: koyu zemin solarak, kart aşağıdan yaylanarak gelir;
 * "Anladım" ile aynı animasyonun tersiyle kapanır. Gösterim kararı `useAdminInboxIntro`'dadır.
 */
export function AdminInboxIntro({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().height < COMPACT_HEIGHT;
  // Kapanırken içerik çıkış animasyonunu oynatır; pencere animasyon bitince (`onDismiss` → visible=false) kalkar.
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onDismiss();
      setClosing(false);
    }, EXIT_MS);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      {!closing ? (
        // Kart güvenli alanın içinde kalır (üstte durum çubuğu, altta gezinme çubuğu); sığmazsa içerik kayar, "Anladım" hep görünür.
        <View style={[styles.root, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
          <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(EXIT_MS)} style={styles.backdrop} />
          <Animated.View
            entering={FadeInDown.springify().damping(18).stiffness(140)}
            exiting={FadeOutDown.duration(EXIT_MS)}
            style={[styles.card, compact && styles.cardCompact]}
            accessibilityViewIsModal>
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact]} bounces={false}>
              <View style={styles.hero}>
                <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
                  <Icon name="mci:message-text-outline" size={compact ? 28 : 34} color="white" />
                </View>
                <View style={styles.badge}>
                  <Icon name="shield" size={13} color="white" />
                  <Text style={styles.badgeText}>Yönetici</Text>
                </View>
              </View>

              {/* testID başlıkta: iOS erişilebilirlik ağacında düzen kapları (kök View) görünmez, metin her iki platformda da görünür. */}
              <Text variant="title" align="center" accessibilityRole="header" testID="admin-inbox-intro">
                Müşteri mesajları burada
              </Text>
              <Text variant="body" color="textSecondary" align="center" style={styles.lead}>
                Müşterilerin ilanlar hakkında gönderdiği tüm mesajları bu sekmeden görebilir ve yanıtlayabilirsiniz.
              </Text>

              <View style={[styles.points, compact && styles.pointsCompact]}>
                {POINTS.map((point) => (
                  <View key={point.text} style={styles.point}>
                    <View style={styles.pointIcon}>
                      <Icon name={point.icon} size={18} color="heading" />
                    </View>
                    <Text variant="small" color="text" style={styles.flex}>
                      {point.text}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <Button title="Anladım" onPress={close} testID="admin-inbox-intro-ok" />
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: Spacing.three },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 33, 63, 0.55)' },
  card: {
    // Kökün güvenli alan içindeki yüksekliğini aşarsa küçülür (içerideki ScrollView kayar), düğme kartın altında sabit kalır.
    flexShrink: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl + 4,
    padding: Spacing.four,
    gap: Spacing.three,
    boxShadow: '0 12px 32px rgba(10, 33, 63, 0.25)',
  },
  cardCompact: { padding: Spacing.three + 4, gap: Spacing.two + 4 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { gap: Spacing.three },
  scrollContentCompact: { gap: Spacing.two + 4 },
  hero: { alignItems: 'center', marginBottom: Spacing.one },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleCompact: { width: 64, height: 64, borderRadius: 32 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16, color: Colors.white },
  lead: { lineHeight: 23 },
  points: { gap: Spacing.three, backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.three },
  pointsCompact: { gap: Spacing.two + 4, padding: Spacing.three - 4 },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
