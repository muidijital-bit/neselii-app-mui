import { createContext, useContext, type ReactNode } from 'react';

import { expoPermissions } from './expoPermissions';
import type { PermissionsAdapter } from './types';

const PermissionsContext = createContext<PermissionsAdapter>(expoPermissions);

/** Varsayılan gerçek sistem adaptörüdür; testler sahte adaptör verir. Bu bileşen izin ISTEMEZ. */
export function PermissionsProvider({ adapter = expoPermissions, children }: { adapter?: PermissionsAdapter; children: ReactNode }) {
  return <PermissionsContext.Provider value={adapter}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsAdapter {
  return useContext(PermissionsContext);
}
