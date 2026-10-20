import { AppError, toAppError, type Session } from '@/domain';
import type { ServiceContainer } from '@/services';

/**
 * Açılış zaman aşımı: yalnızca TAKILI depolamayı yakalar, yavaş ama çalışan cihazı hata saymaz. Ölçümler (Android emülatör,
 * dev build, soğuk açılış): sağlıklı ≈ 0,3–0,6 sn; RAM/takas baskısı altında bozulmuş emülatörde `AsyncStorage.getItem` 11,8 / 14,6 /
 * 29,7 sn'ye çıkıp yine BAŞARIYLA bitti (JS iş parçacığı aç kalmadı). Bu yüzden 30 sn; süre dolunca "Tekrar dene" aynı bekleyen
 * hydrate'e bağlanır (idempotent), yeni bir pencere açar.
 */
export const BOOTSTRAP_TIMEOUT_MS = 30_000;

export type BootstrapResult = {
  /** Kurtarılan oturum; `null` yalnızca "oturum yok" demektir (hata DEĞİL). */
  readonly session: Session | null;
  /** Kalıcı durum sonucu: `'initial'` (kayıt yok/bozuk) başarılı bir sonuçtur. */
  readonly hydrate: 'restored' | 'initial' | 'none';
};

/**
 * Açılış sırası (024 incelemesinin kesin sözleşmesi): ÖNCE `container.initialize()` (mock: `runtime.hydrate()`), SONRA
 * `services.auth.getSession()`. Hydrate sonuçlanmadan hiçbir servis çağrısı başlatılmaz.
 *
 * Her hata (hydrate'in kendisi dahil) `AppError`'a çevrilip yeniden fırlatılır — ASLA `null` oturuma dönüştürülmez.
 * `timeoutMs` içinde bitmezse `unknown`/`timeout` ile reddeder: açılış sonsuza dek beklemez (ör. donmuş depolama).
 */
export async function runBootstrap(container: ServiceContainer, { timeoutMs = BOOTSTRAP_TIMEOUT_MS }: { timeoutMs?: number } = {}): Promise<BootstrapResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError({ kind: 'unknown', code: 'timeout' })), timeoutMs);
  });

  const work = (async (): Promise<BootstrapResult> => {
    const hydrate = await container.initialize();
    const session = await container.services.auth.getSession();
    return { session, hydrate };
  })();

  try {
    return await Promise.race([work, timeout]);
  } catch (error) {
    throw toAppError(error);
  } finally {
    clearTimeout(timer);
    work.catch(() => undefined); // zaman aşımından sonra geç gelen hata yutulmuş promise olarak kalmasın
  }
}
