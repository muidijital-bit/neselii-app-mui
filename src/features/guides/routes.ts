import type { Href } from 'expo-router';

/** Madde 46: sektör rehberi. */
export const GUIDES_HREF: Href = '/guides';
export const NEW_GUIDE = 'new';
export const guideHref = (guideId: string): Href => ({ pathname: '/guides/[guideId]', params: { guideId } });
export const guideEditHref = (guideId: string): Href => ({ pathname: '/guides/[guideId]/edit', params: { guideId } });
