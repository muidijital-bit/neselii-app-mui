import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card, Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

type BuyerType = 'individual' | 'corporate';

type Step = { readonly title: string; readonly items: readonly string[] };

/**
 * Madde 16: satın alma için gerekli belgeler (firma içeriği). Bireysel ve kurumsal alım için adım adım belge listesi. Bilgilendirme amaçlıdır;
 * firma kendi süreciyle güncelleyebilir (şimdilik uygulama içinde sabit metin).
 */
const STEPS: Record<BuyerType, readonly Step[]> = {
  individual: [
    { title: '1. Kimlik ve adres', items: ['T.C. kimlik kartı (aslı)', 'İkametgâh belgesi (e-Devlet’ten alınabilir)'] },
    {
      title: '2. Ödeme / finansman',
      items: ['Peşin alımda: ödeme dekontu', 'Kredili alımda: gelir belgesi veya maaş bordrosu', 'Kredili alımda: son 3 aylık banka hesap dökümü'],
    },
    {
      title: '3. Noter satışı',
      items: ['Alıcı ve satıcı noterde hazır bulunur', 'Başkası adına alımda noter onaylı vekâletname', 'Araç muayenesinin geçerli olması'],
    },
    {
      title: '4. Teslimattan önce',
      items: ['Zorunlu trafik sigortası (satış günü yaptırılır)', 'İsteğe bağlı kasko', 'Ticari taşımacılık yapılacaksa yetki belgesi (K belgesi) başvurusu'],
    },
  ],
  corporate: [
    {
      title: '1. Şirket belgeleri',
      items: [
        'Vergi levhası',
        'Ticaret sicil gazetesi (kuruluş ve son yetkili değişikliği)',
        'İmza sirküleri',
        'Faaliyet belgesi (son 6 ay içinde alınmış)',
      ],
    },
    { title: '2. Yetkili kişi', items: ['Şirket yetkilisinin kimlik kartı', 'Yetkili dışında biri gelirse noter onaylı vekâletname'] },
    {
      title: '3. Ödeme / finansman',
      items: ['Peşin alımda: şirket hesabından ödeme dekontu', 'Kredili / leasing alımda: son 2 yıl bilanço ve gelir tablosu', 'Güncel mizan ve banka hesap dökümü'],
    },
    {
      title: '4. Noter satışı ve teslimat',
      items: ['Noter satışı şirket adına yapılır', 'Zorunlu trafik sigortası ve isteğe bağlı kasko', 'Ticari taşımacılık için yetki belgesi (K belgesi)'],
    },
  ],
};

export function DocumentsScreen() {
  const [type, setType] = useState<BuyerType>('individual');
  return (
    <View style={styles.container} testID="documents-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Gerekli Belgeler" testID="documents-back">
        <View style={styles.tabs}>
          <Chip label="Bireysel alım" selected={type === 'individual'} onPress={() => setType('individual')} />
          <Chip label="Kurumsal alım" selected={type === 'corporate'} onPress={() => setType('corporate')} />
        </View>
      </PageHeader>
      <ScrollView contentContainerStyle={styles.content}>
        {STEPS[type].map((step) => (
          <Card key={step.title} style={styles.card}>
            <Text variant="subheading">{step.title}</Text>
            {step.items.map((item) => (
              <View key={item} style={styles.item}>
                <Icon name="check-square" size={18} color="success" />
                <Text variant="body" style={styles.flex}>
                  {item}
                </Text>
              </View>
            ))}
          </Card>
        ))}
        <View style={styles.note}>
          <Icon name="info" size={18} color="heading" />
          <Text variant="small" style={styles.flex}>
            Liste bilgilendirme amaçlıdır. Size özel belge listesi için danışmanımızla görüşebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  card: { padding: Spacing.three, gap: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Colors.surfaceHighlight },
});
