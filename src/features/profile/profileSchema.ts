import { z } from 'zod';

import { profileNameError, profilePhoneError } from '@/domain';

/**
 * Profil düzenleme form şeması. Kurallar ve sabit iletiler `@/domain/profileRules` ile ortaktır (servis aynı kuralları uygular);
 * girilen değer iletiye kopyalanmaz. E-posta düzenlenemez: şemada alanı yoktur.
 */
const rule = (check: (value: string) => string | null) => (value: string, ctx: z.RefinementCtx) => {
  const message = check(value);
  if (message) ctx.addIssue({ code: 'custom', message });
};

export const profileSchema = z.object({
  fullName: z.string().superRefine(rule(profileNameError)),
  phone: z.string().superRefine(rule(profilePhoneError)),
});
export type ProfileValues = z.infer<typeof profileSchema>;
