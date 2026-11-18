import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { DOCUMENT_KIND_LABELS, type CustomerDocument } from '@/domain';
import { formatLeadDate } from '@/features/leads/presentation';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

/** Belge satırı: tür etiketi, ad, tarih; dokununca belge uygulama içi tarayıcıda açılır. Yöneticide sil düğmesi. */
export function DocumentRow({ doc, onRemove }: { doc: CustomerDocument; onRemove?: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${doc.title}, aç`}
        disabled={!doc.uri}
        onPress={() => doc.uri && void WebBrowser.openBrowserAsync(doc.uri).catch(() => undefined)}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        testID={`document-${doc.id}`}>
        <View style={styles.icon}>
          <Icon name="file-text" size={20} color="heading" />
        </View>
        <View style={styles.text}>
          <Text variant="bodySemibold" numberOfLines={2}>
            {doc.title}
          </Text>
          <Text variant="caption">{formatLeadDate(doc.createdAt)}</Text>
        </View>
        <Badge label={DOCUMENT_KIND_LABELS[doc.kind]} tone={doc.kind === 'quote' ? 'success' : 'info'} />
      </Pressable>
      {onRemove ? (
        <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={`${doc.title}, sil`} onPress={onRemove} style={styles.remove}>
          <Icon name="trash-2" size={18} color="danger" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  remove: { padding: Spacing.one },
});
