import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { toAppError, userMessage, type AppError } from '@/domain';
import { useServiceContainer } from '@/services';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';
import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

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

/** Açılış görseli; native açılış ekranıyla (app.json `expo-splash-screen`, 240 genişlik) aynı yerde durur, geçiş fark edilmez. */
const splashImage = require('../../assets/images/splash-icon.png');

/** Yükleme ekranı: bootstrap ve onboarding durumu okunurken native açılış ekranının devamı gibi görünür (main'deki gibi). */
export function BootstrapLoading() {
  return (
    <View style={styles.root} testID="bootstrap-loading">
      <StatusBar style="light" />
      <Image source={splashImage} style={styles.splash} contentFit="contain" accessibilityLabel="Yükleniyor" />
    </View>
  );
}

function BootstrapError({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  return (
    <View style={styles.root} testID="bootstrap-error">
      <StatusBar style="light" />
      <View style={styles.center}>
        <Logo height={56} />
        {/* Kullanıcıya yalnızca güvenli sabit mesaj gösterilir; ham hata/cause asla. */}
        <Text align="center" style={styles.message} accessibilityRole="alert">
          {userMessage(error)}
        </Text>
        <Button title="Tekrar dene" onPress={onRetry} style={styles.action} testID="bootstrap-retry" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  splash: { width: 240, height: 240 },
  center: { alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: Spacing.four, gap: Spacing.four },
  message: { color: '#D6E3F0' },
  action: { alignSelf: 'stretch' },
});
