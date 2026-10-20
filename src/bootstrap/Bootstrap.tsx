import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { toAppError, userMessage, type AppError } from '@/domain';
import { useServiceContainer } from '@/services';
import { colors, spacing, textStyles } from '@/theme';

import { BOOTSTRAP_TIMEOUT_MS, runBootstrap, type BootstrapResult } from './runBootstrap';

type State = { status: 'loading' } | { status: 'ready'; result: BootstrapResult } | { status: 'error'; error: AppError };

const BootstrapContext = createContext<BootstrapResult | null>(null);

/** Hazır bootstrap sonucu (oturum + hydrate sonucu). Yalnızca `<Bootstrap>` çocuklarında, yani hazır olduktan sonra çağrılabilir. */
export function useBootstrapResult(): BootstrapResult {
  const result = useContext(BootstrapContext);
  if (!result) throw new Error('useBootstrapResult yalnızca <Bootstrap> içinde (hazır olduktan sonra) kullanılabilir.');
  return result;
}

type Props = { children: ReactNode; timeoutMs?: number };

/**
 * Servisleri kullanan çocukları, açılış hazırlığı BİTENE kadar render ETMEZ:
 *  - yükleniyor → marka yükleme ekranı (çocuk yok, servis çağrısı yok)
 *  - hazır      → çocuklar (oturum `null` olsa da; null = oturumsuzluk)
 *  - hata       → hata + "Tekrar dene" (girişe yönlendirme DEĞİL, sonsuz yükleme de DEĞİL); yeniden deneme aynı canlı kap üzerinden
 *                 yapılır (hydrate idempotent: depolama yeniden okunmaz, yarım kalan iş tekrarlanmaz).
 * Yönlendirme (onboarding/giriş) bu görevin değil; 005 hazır sonuçtan yönlendirir.
 */
export function Bootstrap({ children, timeoutMs = BOOTSTRAP_TIMEOUT_MS }: Props) {
  const container = useServiceContainer();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // StrictMode efekti iki kez çalıştırır: ilk çalıştırmanın sonucu `cancelled` ile yok sayılır; hydrate idempotent olduğundan
    // depolama yine bir kez okunur.
    let cancelled = false;
    runBootstrap(container, { timeoutMs }).then(
      (result) => !cancelled && setState({ status: 'ready', result }),
      (error: unknown) => !cancelled && setState({ status: 'error', error: toAppError(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [container, attempt, timeoutMs]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  if (state.status === 'ready') return <BootstrapContext.Provider value={state.result}>{children}</BootstrapContext.Provider>;
  if (state.status === 'error') return <BootstrapError error={state.error} onRetry={retry} />;
  return <BootstrapLoading />;
}

/** Marka yükleme ekranı (00a splash karşılığı): bootstrap ve onboarding durumu okunurken gösterilir. */
export function BootstrapLoading() {
  return (
    <Screen background={colors.navy} statusBar="light" testID="bootstrap-loading">
      <View style={styles.center}>
        <BrandLogo height={56} />
        <ActivityIndicator color={colors.greenBright} style={styles.spinner} accessibilityLabel="Yükleniyor" />
      </View>
    </Screen>
  );
}

function BootstrapError({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  return (
    <Screen background={colors.navy} statusBar="light" testID="bootstrap-error">
      <View style={styles.center}>
        <BrandLogo height={56} />
        {/* Kullanıcıya yalnızca güvenli sabit mesaj gösterilir; ham hata/cause asla. */}
        <Text style={[textStyles.bodyRelaxed, styles.message]} accessibilityRole="alert">
          {userMessage(error)}
        </Text>
        <View style={styles.action}>
          <Btn label="Tekrar dene" onPress={onRetry} testID="bootstrap-retry" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'], gap: spacing.xl },
  spinner: { marginTop: spacing['2xl'] },
  message: { color: colors.bluePale, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.lg },
});
