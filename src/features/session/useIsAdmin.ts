import { useSession } from './SessionProvider';

/** Oturumdaki kullanıcı firma yöneticisi mi (tüm müşteri sohbetlerini görür ve cevaplar). */
export function useIsAdmin(): boolean {
  return useSession().session?.user.role === 'admin';
}
