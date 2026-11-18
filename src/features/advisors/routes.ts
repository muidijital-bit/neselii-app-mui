import type { Href } from 'expo-router';

/** Yönetici: danışman listesi. */
export const ADVISORS_HREF: Href = '/advisors';

/** `new` yeni danışman formunu açar; diğer değerler danışman kimliğidir. */
export const NEW_ADVISOR = 'new';

export const advisorEditHref = (advisorId: string): Href => ({ pathname: '/advisors/[advisorId]', params: { advisorId } });
