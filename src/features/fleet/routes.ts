import type { Href } from 'expo-router';

/** Filo (madde 48–50). `new` yeni araç formudur. */
export const FLEET_HREF: Href = '/fleet';
export const NEW_VEHICLE = 'new';
export const fleetVehicleHref = (vehicleId: string): Href => ({ pathname: '/fleet/[vehicleId]', params: { vehicleId } });
