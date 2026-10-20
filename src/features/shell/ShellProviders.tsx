import type { ReactNode } from 'react';

import { useBootstrapResult } from '@/bootstrap';
import { OnboardingProvider, type OnboardingStorage } from '@/features/onboarding';
import { PermissionsProvider, type PermissionsAdapter } from '@/permissions';

import { SessionProvider } from '../session/SessionProvider';

/** `<Bootstrap>` içinde (hydrate + getSession tamam): oturum durumu → izin adaptörü → onboarding durumu. İzin ISTEMEZ. */
type Props = {
  children: ReactNode;
  /** Testler için: sahte izin adaptörü ve onboarding deposu. Verilmezse gerçek sistem adaptörü / AsyncStorage. */
  permissions?: PermissionsAdapter;
  onboardingStorage?: OnboardingStorage;
};

export function ShellProviders({ children, permissions, onboardingStorage }: Props) {
  const { session } = useBootstrapResult();
  return (
    <SessionProvider initialSession={session}>
      <PermissionsProvider adapter={permissions}>
        <OnboardingProvider storage={onboardingStorage}>{children}</OnboardingProvider>
      </PermissionsProvider>
    </SessionProvider>
  );
}
