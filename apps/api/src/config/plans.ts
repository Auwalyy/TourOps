/**
 * Subscription plans, priced in naira per month. Flutterwave charges in naira
 * directly, so these figures are used as-is at the point of charge.
 */
export type PlanId = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

/**
 * The capabilities a plan actually grants. Every line printed on the pricing
 * page must map to one of these, or the page is selling something the system
 * does not enforce.
 */
export interface Entitlements {
  maxUsers: number;
  /** Packages with hard seat limits. */
  packages: boolean;
  /** Family / departure-group bookings with a shared ledger. */
  groups: boolean;
  /** Reports and CSV export. */
  reports: boolean;
  /** Customer portal and public tracking links. */
  portal: boolean;
  /** Multiple branches. */
  branches: boolean;
  /** Refund requests with owner approval. */
  refunds: boolean;
  /** AI insights and passport scanning. */
  ai: boolean;
}

export type FeatureKey = keyof Omit<Entitlements, 'maxUsers'>;

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
  entitlements: Entitlements;
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
    entitlements: {
      maxUsers: 3,
      packages: false,
      groups: false,
      reports: false,
      portal: false,
      branches: false,
      refunds: false,
      ai: false,
    },
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
    entitlements: {
      maxUsers: 10,
      packages: true,
      groups: true,
      reports: true,
      portal: true,
      branches: false,
      refunds: false,
      ai: false,
    },
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
    entitlements: {
      maxUsers: 100,
      packages: true,
      groups: true,
      reports: true,
      portal: true,
      branches: true,
      refunds: true,
      ai: true,
    },
  },
};

/** A trial gets everything, so an agency sees the whole product before choosing. */
export const TRIAL_ENTITLEMENTS: Entitlements = {
  maxUsers: 100,
  packages: true,
  groups: true,
  reports: true,
  portal: true,
  branches: true,
  refunds: true,
  ai: true,
};

export function planPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = PLANS[planId];
  return cycle === 'yearly' ? plan.yearly : plan.monthly;
}

/** How far a successful payment pushes the paid-through date. */
export function cycleMonths(cycle: BillingCycle): number {
  return cycle === 'yearly' ? 12 : 1;
}
