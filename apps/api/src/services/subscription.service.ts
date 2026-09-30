import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../config';
import { PLANS, PlanId, BillingCycle, planPrice, cycleMonths, Entitlements, TRIAL_ENTITLEMENTS } from '../config/plans';
import { Agency, IAgency } from '../models/Agency';
import { SubscriptionPayment } from '../models/SubscriptionPayment';
import { User } from '../models/User';
import { flutterwaveService } from './flutterwave.service';
import { AppError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export type AccessState = 'trialing' | 'active' | 'grace' | 'locked' | 'suspended';

export interface SubscriptionStatus {
  state: AccessState;
  /** True while the agency may still create and edit. */
  canWrite: boolean;
  plan: string;
  billingCycle?: string;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  /** The date access is measured against — whichever cover runs latest. */
  accessUntil?: Date;
  graceEndsAt?: Date;
  /** Whole days until accessUntil. Negative once it has passed. */
  daysLeft: number;
  lastPaymentAt?: Date;
}

const DAY = 24 * 60 * 60 * 1000;

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

function latest(...dates: Array<Date | undefined | null>): Date | undefined {
  const valid = dates.filter(Boolean) as Date[];
  if (!valid.length) return undefined;
  return valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}

export const subscriptionService = {
  /**
   * The single source of truth for whether an agency may use the app.
   *
   * Access is derived from dates rather than the stored status string, so a
   * missed cron run or a half-finished webhook can never leave an agency
   * wrongly locked out or wrongly let in.
   */
  accessState(agency: IAgency): SubscriptionStatus {
    const sub = agency.subscription || ({} as IAgency['subscription']);
    const now = Date.now();

    const accessUntil = latest(sub.trialEndsAt, sub.currentPeriodEnd, sub.extendedUntil);
    const graceEndsAt = accessUntil ? new Date(accessUntil.getTime() + config.billing.graceDays * DAY) : undefined;

    let state: AccessState;
    if (agency.isActive === false) {
      state = 'suspended';
    } else if (!accessUntil) {
      // Pre-dates the trial system — treat as locked so it surfaces rather than
      // silently granting free access forever.
      state = 'locked';
    } else if (accessUntil.getTime() > now) {
      const paidCover = latest(sub.currentPeriodEnd, sub.extendedUntil);
      state = paidCover && paidCover.getTime() > now ? 'active' : 'trialing';
    } else if (graceEndsAt && graceEndsAt.getTime() > now) {
      state = 'grace';
    } else {
      state = 'locked';
    }

    return {
      state,
      canWrite: state === 'trialing' || state === 'active',
      plan: sub.plan || 'trial',
      billingCycle: sub.billingCycle,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      accessUntil,
      graceEndsAt,
      daysLeft: accessUntil ? Math.ceil((accessUntil.getTime() - now) / DAY) : 0,
      lastPaymentAt: sub.lastPaymentAt,
    };
  },

  /** Starts the free trial. Called once, when an agency registers. */
  startTrial(): IAgency['subscription'] {
    return {
      plan: 'trial',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + config.billing.trialDays * DAY),
    } as IAgency['subscription'];
  },

  /**
   * Gives an agency that pre-dates the billing system a trial the first time
   * it is seen, rather than reading as locked.
   *
   * This makes the rollout self-healing: the backfill script is a convenience
   * for seeing what will happen, not a prerequisite. Returns true if it wrote.
   */
  async ensureTrial(agency: IAgency): Promise<boolean> {
    const sub = agency.subscription;
    if (sub?.trialEndsAt || sub?.currentPeriodEnd || sub?.extendedUntil) return false;

    agency.subscription = {
      ...(sub as any),
      plan: sub?.plan || 'trial',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + config.billing.trialDays * DAY),
    } as IAgency['subscription'];
    await agency.save();
    logger.info(`Started a trial for pre-existing agency ${agency._id}`);
    return true;
  },

  /**
   * What this agency may actually use right now.
   *
   * A trial gets everything so the whole product can be judged. A lapsed
   * account keeps its last plan's entitlements — the access gate already
   * stops it writing, and stripping features as well would only confuse.
   */
  entitlements(agency: IAgency): Entitlements {
    const { state } = this.accessState(agency);
    if (state === 'trialing') return TRIAL_ENTITLEMENTS;

    const plan = agency.subscription?.plan;
    if (plan && plan !== 'trial' && PLANS[plan as PlanId]) {
      return PLANS[plan as PlanId].entitlements;
    }
    return TRIAL_ENTITLEMENTS;
  },

  async getStatus(
    agencyId: string
  ): Promise<SubscriptionStatus & { plans: typeof PLANS; gatewayConfigured: boolean; entitlements: Entitlements }> {
    const agency = await Agency.findById(agencyId);
    if (!agency) throw new NotFoundError('Agency');
    await this.ensureTrial(agency);
    return {
      ...this.accessState(agency),
      plans: PLANS,
      gatewayConfigured: flutterwaveService.isConfigured(),
      entitlements: this.entitlements(agency),
    };
  },

  /** Writes the derived state back so admin listings can filter on it. */
  async syncStatus(agency: IAgency): Promise<void> {
    const { state } = this.accessState(agency);
    const mapped = state === 'suspended' ? 'cancelled' : state;
    if (agency.subscription?.status !== mapped) {
      agency.subscription.status = mapped as IAgency['subscription']['status'];
      await agency.save();
    }
  },

  /** Opens a Flutterwave checkout for a plan and records the pending attempt. */
  async createCheckout(
    agencyId: string,
    userId: string,
    plan: PlanId,
    billingCycle: BillingCycle
  ): Promise<{ paymentLink: string; reference: string; amount: number }> {
    if (!PLANS[plan]) throw new AppError('Unknown plan', 400);

    const [agency, user] = await Promise.all([Agency.findById(agencyId), User.findById(userId)]);
    if (!agency) throw new NotFoundError('Agency');

    const amount = planPrice(plan, billingCycle);
    const reference = `TOPS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    await SubscriptionPayment.create({
      agencyId: agency._id,
      plan,
      billingCycle,
      amount,
      reference,
      status: 'pending',
    });

    const init = await flutterwaveService.initializePayment({
      email: user?.email || agency.email,
      name: agency.name,
      phone: agency.phone,
      amountNaira: amount,
      reference,
      meta: { agencyId: agency._id.toString(), plan, billingCycle, agencyName: agency.name },
    });

    return { paymentLink: init.paymentLink, reference, amount };
  },

  /**
   * Confirms a reference with Flutterwave and, if it really succeeded,
   * extends the agency's paid-through date.
   *
   * Safe to call repeatedly — the callback page and the webhook both land
   * here, and a payment already marked success short-circuits.
   */
  async confirmPayment(reference: string): Promise<{ applied: boolean; status: string }> {
    const record = await SubscriptionPayment.findOne({ reference });
    if (!record) throw new NotFoundError('Payment reference');
    if (record.status === 'success') return { applied: false, status: 'success' };

    const result = await flutterwaveService.verifyPayment(reference);

    if (result.status !== 'successful') {
      record.status = result.status === 'failed' ? 'failed' : 'abandoned';
      record.gatewayResponse = result.gatewayResponse;
      record.raw = result.raw;
      await record.save();
      return { applied: false, status: record.status };
    }

    // Guard against a tampered reference being replayed for a cheaper plan.
    const expected = planPrice(record.plan, record.billingCycle);
    if (result.amount + 0.001 < expected) {
      record.status = 'failed';
      record.gatewayResponse = `Underpaid: expected ${expected}, got ${result.amount}`;
      await record.save();
      throw new AppError('The amount paid does not match the plan price', 400);
    }

    const agency = await Agency.findById(record.agencyId);
    if (!agency) throw new NotFoundError('Agency');

    // Renewing early should add to the remaining time, not throw it away.
    const now = new Date();
    const base =
      agency.subscription?.currentPeriodEnd && agency.subscription.currentPeriodEnd > now
        ? agency.subscription.currentPeriodEnd
        : now;
    const periodEnd = addMonths(base, cycleMonths(record.billingCycle));

    agency.subscription.plan = record.plan;
    agency.subscription.billingCycle = record.billingCycle;
    agency.subscription.currentPeriodEnd = periodEnd;
    agency.subscription.lastPaymentAt = result.paidAt || now;
    agency.subscription.status = 'active';
    await agency.save();

    record.status = 'success';
    record.channel = result.channel;
    record.paidAt = result.paidAt || now;
    record.periodStart = base;
    record.periodEnd = periodEnd;
    record.gatewayResponse = result.gatewayResponse;
    record.raw = result.raw;
    await record.save();

    logger.info(`Subscription activated for agency ${agency._id} until ${periodEnd.toISOString()}`);
    return { applied: true, status: 'success' };
  },

  async history(agencyId: string) {
    return SubscriptionPayment.find({ agencyId }).sort({ createdAt: -1 }).limit(50).lean();
  },

  // ── Platform owner actions ────────────────────────────────────────────────

  /** Hands an agency extra days without a payment — for goodwill or a manual transfer. */
  async extend(agencyId: string, days: number): Promise<IAgency> {
    const agency = await Agency.findById(agencyId);
    if (!agency) throw new NotFoundError('Agency');

    const { accessUntil } = this.accessState(agency);
    const base = accessUntil && accessUntil > new Date() ? accessUntil : new Date();
    agency.subscription.extendedUntil = new Date(base.getTime() + days * DAY);
    await agency.save();
    await this.syncStatus(agency);
    return agency;
  },

  /** Records a payment the platform owner received outside the gateway. */
  async recordManualPayment(
    agencyId: string,
    actorId: string,
    plan: PlanId,
    billingCycle: BillingCycle,
    amount?: number
  ): Promise<IAgency> {
    const agency = await Agency.findById(agencyId);
    if (!agency) throw new NotFoundError('Agency');

    const now = new Date();
    const base =
      agency.subscription?.currentPeriodEnd && agency.subscription.currentPeriodEnd > now
        ? agency.subscription.currentPeriodEnd
        : now;
    const periodEnd = addMonths(base, cycleMonths(billingCycle));

    await SubscriptionPayment.create({
      agencyId: agency._id,
      plan,
      billingCycle,
      amount: amount ?? planPrice(plan, billingCycle),
      reference: `MANUAL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      status: 'success',
      paidAt: now,
      periodStart: base,
      periodEnd,
      recordedManuallyBy: new mongoose.Types.ObjectId(actorId),
      channel: 'manual',
    });

    agency.subscription.plan = plan;
    agency.subscription.billingCycle = billingCycle;
    agency.subscription.currentPeriodEnd = periodEnd;
    agency.subscription.lastPaymentAt = now;
    agency.subscription.status = 'active';
    await agency.save();
    return agency;
  },

  async setSuspended(agencyId: string, suspended: boolean): Promise<IAgency> {
    const agency = await Agency.findById(agencyId);
    if (!agency) throw new NotFoundError('Agency');
    agency.isActive = !suspended;
    await agency.save();
    await this.syncStatus(agency);
    return agency;
  },
};
