import type { Href } from 'expo-router';

import type { FinancePlan } from '@/domain';

/** Yönetici: finansman ayarları (faiz, peşinat, vadeler). */
export const FINANCE_SETTINGS_HREF: Href = '/finance-settings';

/** "Bütçeme göre araç bul" (ana sayfa kısayolu). */
export const BUDGET_HREF: Href = '/budget';

/** Madde 24: ilanın toplam sahip olma maliyeti. */
export const ownershipCostHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]/cost', params: { listingId } });

/** Hesaplayıcıdan finansman talebi: talep formu konu "Finansman" ve ödeme planıyla açılır. */
export const financeLeadHref = (listingId: string, plan: FinancePlan): Href => ({
  pathname: '/listings/[listingId]/request',
  params: {
    listingId,
    topic: 'financing',
    plan: JSON.stringify({
      priceKurus: plan.priceKurus,
      downPaymentKurus: plan.downPaymentKurus,
      termMonths: plan.termMonths,
      monthlyRatePercent: plan.monthlyRatePercent,
    }),
  },
});
