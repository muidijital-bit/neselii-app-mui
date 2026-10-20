import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { StateMessage } from '@/features/listings/ListStates';
import { colors } from '@/theme';

import { PageHeader } from './PageHeader';

/** Geçersiz/bozuk bir bildirim hedefinin güvenli durumu (çökme yok): açıklama + bildirimlere dönüş. */
export function NotificationUnavailableScreen() {
  const router = useRouter();
  return (
    <Screen background={colors.white} testID="notification-unavailable-screen">
      <PageHeader title="Bildirim" testID="notification-unavailable-back" />
      <StateMessage
        icon="search-x"
        title="Bildirim içeriğine ulaşılamıyor"
        message="Bu bildirimin bağlantısı geçersiz ya da içerik artık mevcut değil. Bildirimlerinize dönebilirsiniz."
        actionLabel="Bildirimlere dön"
        actionIcon="arrow-left"
        onAction={() => router.navigate('/notifications')}
        testID="notification-unavailable"
      />
    </Screen>
  );
}
