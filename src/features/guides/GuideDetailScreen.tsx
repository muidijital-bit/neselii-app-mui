import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { sectorById, userMessage } from '@/domain';
import { formatLeadDate } from '@/features/leads/presentation';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { guideEditHref } from './routes';
import { useGuideQuery } from './useGuides';

/** Madde 46: rehber yazısı. Yöneticide "Düzenle". */
export function GuideDetailScreen() {
  const { guideId } = useLocalSearchParams<{ guideId?: string | string[] }>();
  const id = typeof guideId === 'string' ? guideId : '';
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const query = useGuideQuery(id);
  const guide = query.data;

  return (
    <View style={styles.container} testID="guide-detail-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Sektör Rehberi" testID="guide-back" />
      {query.isPending ? (
        <StateView loading />
      ) : !guide ? (
        <StateView icon="alert-circle" title="Yazı bulunamadı" message={userMessage(query.error)} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.meta}>
            <Badge label={guide.sector ? sectorById(guide.sector).label : 'Genel'} tone="info" />
            {guide.published ? null : <Badge label="Taslak" tone="warning" />}
            <Text variant="caption">{formatLeadDate(guide.updatedAt)}</Text>
          </View>
          <Text variant="title" accessibilityRole="header">
            {guide.title}
          </Text>
          <Text variant="body" style={styles.body} selectable>
            {guide.body}
          </Text>
          {isAdmin ? <Button title="Düzenle" icon="edit-2" variant="outline" onPress={() => router.push(guideEditHref(guide.id))} testID="guide-edit" /> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  body: { lineHeight: 26 },
});
