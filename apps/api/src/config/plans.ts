/**
 * Subscription plans, priced in naira per month. Flutterwave charges in naira
 * directly, so these figures are used as-is at the point of charge.
 */
export type PlanId = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  /** Naira per month. */
  monthly: number;
  /** Naira per year — two months free against the monthly rate. */
  yearly: number;
  maxUsers: number;
  description: string;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthly: 15000,
    yearly: 150000,
    maxUsers: 3,
    description: 'For a small office running visas and tickets.',
    features: [
      'Up to 3 staff accounts',
      'Customers, travel files and bookings',
      'Visa pipeline and issued-visa groups',
      'Payments, invoices and receipts',
      'Branded PDF manifests',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    monthly: 35000,
    yearly: 350000,
    maxUsers: 10,
    description: 'For an agency running Hajj and Umrah groups.',
    features: [
      'Up to 10 staff accounts',
      'Everything in Starter',
      'Packages with seat control',
      'Family and group bookings',
      'Reports and CSV export',
      'Customer portal and tracking links',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 75000,
    yearly: 750000,
    maxUsers: 100,
    description: 'For multi-branch operators.',
    features: [
      'Up to 100 staff accounts',
      'Everything in Professional',
      'Multiple branches',
      'Refund approvals and audit trail',
      'AI insights',
      'Priority support',
    ],
  },
};

export function planPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = PLANS[planId];
  return cycle === 'yearly' ? plan.yearly : plan.monthly;
}

/** How far a successful payment pushes the paid-through date. */
export function cycleMonths(cycle: BillingCycle): number {
  return cycle === 'yearly' ? 12 : 1;
}
