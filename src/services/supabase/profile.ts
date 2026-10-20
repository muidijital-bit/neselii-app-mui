import { appError, normalizeProfileName, normalizeProfilePhone, profileNameError, profilePhoneError, type UserProfile } from '@/domain';

import type { ProfileService, UpdateProfileInput } from '../contracts';
import { profileFor } from './auth';
import type { Supabase } from './client';
import { call, toSupabaseError } from './shared';

async function currentUser(sb: Supabase) {
  const { data } = await sb.auth.getSession();
  if (!data.session) throw appError.unauthenticated();
  return data.session.user;
}

/** Profil: `profiles` satırı (ad soyad, telefon). E-posta giriş bilgisidir, burada değişmez. */
export function createSupabaseProfile(sb: Supabase): ProfileService {
  return {
    getProfile: () => call(async (): Promise<UserProfile> => profileFor(sb, await currentUser(sb))),

    updateProfile: (input: UpdateProfileInput) =>
      call(async (): Promise<UserProfile> => {
        const user = await currentUser(sb);
        const fieldErrors: Record<string, string> = {};
        if (input.fullName !== undefined) {
          const message = profileNameError(input.fullName);
          if (message) fieldErrors.fullName = message;
        }
        if (input.phone !== undefined && input.phone !== null) {
          const message = profilePhoneError(input.phone);
          if (message) fieldErrors.phone = message;
        }
        if (Object.keys(fieldErrors).length > 0) throw appError.validation(fieldErrors);

        const patch: { full_name?: string; phone?: string | null } = {};
        if (input.fullName !== undefined) patch.full_name = normalizeProfileName(input.fullName);
        if (input.phone !== undefined) patch.phone = normalizeProfilePhone(input.phone);
        if (Object.keys(patch).length > 0) {
          const { error } = await sb.from('profiles').update(patch).eq('id', user.id);
          if (error) throw toSupabaseError(error);
        }
        return profileFor(sb, user);
      }),

    deleteAccount: () =>
      call(async () => {
        await currentUser(sb);
        // Sunucu işlevi auth kullanıcısını siler; profiller ve kullanıcıya bağlı kayıtlar yabancı anahtar zinciriyle silinir.
        const { error } = await sb.rpc('delete_my_account');
        if (error) throw toSupabaseError(error);
        await sb.auth.signOut({ scope: 'local' });
      }),
  };
}
