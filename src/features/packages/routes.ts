import type { Href } from 'expo-router';

/** Madde 45: araç paketleri. */
export const PACKAGES_HREF: Href = '/packages';
export const NEW_PACKAGE = 'new';
export const packageHref = (packageId: string): Href => ({ pathname: '/packages/[packageId]', params: { packageId } });
export const packageEditHref = (packageId: string): Href => ({ pathname: '/packages/[packageId]/edit', params: { packageId } });
