import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

export type PermissionState = 'granted' | 'undetermined' | 'denied';

type Status = { granted: boolean; canAskAgain: boolean };

function toState(status: Status): PermissionState {
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission() {
  return toState(await Notifications.requestPermissionsAsync());
}

export async function requestLocationPermission() {
  return toState(await Location.requestForegroundPermissionsAsync());
}

/** İzin durumunu okur; uygulama ayarlardan dönünce tazeler. */
function usePermission(get: () => Promise<Status>) {
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(() => {
    get()
      .then((s) => setState(toState(s)))
      .catch(() => setState('undetermined'));
  }, [get]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return [state, refresh] as const;
}

export function useNotificationPermission() {
  return usePermission(Notifications.getPermissionsAsync);
}

export function useLocationPermission() {
  return usePermission(Location.getForegroundPermissionsAsync);
}

export function openAppSettings() {
  void Linking.openSettings();
}
