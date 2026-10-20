import { useCallback, useEffect, useRef, useState } from 'react';

import { toAppError, userMessage, type AppError } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';

export type SubmitFailure = {
  /** Forma ait genel ileti (alan altı hata dışında kalanlar). */
  readonly message: string | null;
  /** Servisin alan bazlı doğrulama hataları (ör. `email_taken`). */
  readonly fieldErrors: Readonly<Record<string, string>>;
};

/** `invalid_credentials` gibi alan atanamayan doğrulama hataları için sabit, hesap varlığını sızdırmayan ileti. */
function failureOf(error: AppError): SubmitFailure {
  if (error.code === 'invalid_credentials') return { message: 'E-posta veya şifre hatalı.', fieldErrors: {} };
  if (error.code === 'email_not_verified') return { message: 'E-postanız henüz doğrulanmadı. Gelen kutunuzdaki bağlantıya dokunun.', fieldErrors: {} };
  if (error.code === 'link_invalid') return { message: 'Bağlantı geçersiz ya da süresi dolmuş. Lütfen yeni bir bağlantı isteyin.', fieldErrors: {} };
  if (error.kind === 'validation') {
    const fieldErrors = error.fieldErrors ?? {};
    return { message: Object.keys(fieldErrors).length === 0 ? userMessage(error) : null, fieldErrors };
  }
  return { message: userMessage(error), fieldErrors: {} };
}

/**
 * Auth çağrısı için tek uçuşlu gönderim durumu. TanStack `useMutation` BİLİNÇLİ OLARAK kullanılmaz: mutation önbelleği
 * değişkenleri (parola) saklar; burada parola yalnızca çağrı sırasında yığındadır. Yalnızca `AppError`'dan türeyen sabit iletiler
 * tutulur — ham hata ya da `cause` durum/günlüğe girmez.
 */
export function useAuthSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<SubmitFailure | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const { beginOperation } = useSession();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * `work` başarıyla biterse `onSuccess` çağrılır (ekran bu sırada kapanmış olabilir); hata `failure`'a çevrilir ve döner.
   * İş sürerken oturum bitirildiyse (çıkış/silme/sıfırlama) sonuç YOK SAYILIR: `onSuccess` çağrılmaz, eski oturum geri gelmez.
   */
  const submit = useCallback(async <T>(work: () => Promise<T>, onSuccess: (result: T) => void): Promise<SubmitFailure | null> => {
    if (inFlight.current) return null; // çift dokunma: ikinci istek yok
    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    const isCurrent = beginOperation();
    try {
      const result = await work();
      if (isCurrent()) onSuccess(result);
      return null;
    } catch (error) {
      const next = failureOf(toAppError(error));
      if (mounted.current) setFailure(next);
      return next;
    } finally {
      inFlight.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }, [beginOperation]);

  const clearFailure = useCallback(() => setFailure(null), []);

  return { submitting, failure, submit, clearFailure };
}
