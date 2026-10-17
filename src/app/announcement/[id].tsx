import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { IconTile } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAnnouncement } from '@/features/announcements/api';
import { timeAgo } from '@/lib/format';

export default function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const announcement = useAnnouncement(id);
  const data = announcement.data;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Duyuru" />
      {announcement.isLoading ? (
        <StateView loading />
      ) : !data ? (
        <StateView icon="alert-circle" title="Duyuru bulunamadı" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <IconTile icon="mci:bullhorn-outline" size={72} />
          <Text variant="title">{data.title}</Text>
          <Text variant="small">Genel duyuru · {timeAgo(data.published_at ?? data.created_at)}</Text>
          <Text variant="body" style={styles.body}>
            {data.body}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
  body: { fontSize: 17, lineHeight: 27 },
});
