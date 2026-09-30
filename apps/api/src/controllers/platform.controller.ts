import { Response, NextFunction } from 'express';
import { Agency } from '../models/Agency';
import { User } from '../models/User';
import { SubscriptionPayment } from '../models/SubscriptionPayment';
import { subscriptionService } from '../services/subscription.service';
import { PlanId, BillingCycle, PLANS } from '../config/plans';
import { AuthRequest } from '../types/express';
import { AppError } from '../utils/errors';

/** The TourOps owner's own view — every agency on the platform. */
export const platformController = {
  async stats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const agencies = await Agency.find().lean();
      const counts = { trialing: 0, active: 0, grace: 0, locked: 0, suspended: 0 };
      for (const a of agencies) {
        const { state } = subscriptionService.accessState(a as any);
        counts[state] += 1;
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [revenueAllTime, revenue30d] = await Promise.all([
        SubscriptionPayment.aggregate([
          { $match: { status: 'success' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        SubscriptionPayment.aggregate([
          { $match: { status: 'success', paidAt: { $gte: since } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          totalAgencies: agencies.length,
          ...counts,
          payingAgencies: counts.active,
          revenueAllTime: revenueAllTime[0]?.total || 0,
          revenue30d: revenue30d[0]?.total || 0,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async agencies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, state } = req.query as { search?: string; state?: string };

      const filter: Record<string, unknown> = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const agencies = await Agency.find(filter).sort({ createdAt: -1 }).limit(200).lean();
      const ids = agencies.map((a) => a._id);

      const [userCounts, lastPayments] = await Promise.all([
        User.aggregate([{ $match: { agencyId: { $in: ids } } }, { $group: { _id: '$agencyId', n: { $sum: 1 } } }]),
        SubscriptionPayment.aggregate([
          { $match: { agencyId: { $in: ids }, status: 'success' } },
          { $sort: { paidAt: -1 } },
          { $group: { _id: '$agencyId', amount: { $first: '$amount' }, paidAt: { $first: '$paidAt' } } },
        ]),
      ]);

      const userMap = new Map(userCounts.map((u) => [u._id.toString(), u.n]));
      const payMap = new Map(lastPayments.map((p) => [p._id.toString(), p]));

      let rows = agencies.map((a) => {
        const status = subscriptionService.accessState(a as any);
        return {
          _id: a._id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          createdAt: a.createdAt,
          plan: status.plan,
          state: status.state,
          daysLeft: status.daysLeft,
          accessUntil: status.accessUntil,
          userCount: userMap.get(a._id.toString()) || 0,
          lastPayment: payMap.get(a._id.toString()) || null,
        };
      });

      if (state) rows = rows.filter((r) => r.state === state);

      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  },

  async payments(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await SubscriptionPayment.find()
        .populate('agencyId', 'name email')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async extend(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.body?.days, 10);
      if (!Number.isFinite(days) || days < 1 || days > 730) {
        throw new AppError('Enter between 1 and 730 days', 400);
      }
      const agency = await subscriptionService.extend(req.params.id, days);
      res.json({ success: true, data: subscriptionService.accessState(agency) });
    } catch (e) {
      next(e);
    }
  },

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { plan, billingCycle, amount } = req.body as {
        plan: PlanId;
        billingCycle?: BillingCycle;
        amount?: number;
      };
      if (!plan || !PLANS[plan]) throw new AppError('Choose a valid plan', 400);

      const agency = await subscriptionService.recordManualPayment(
        req.params.id,
        req.user!._id.toString(),
        plan,
        billingCycle === 'yearly' ? 'yearly' : 'monthly',
        amount
      );
      res.json({ success: true, data: subscriptionService.accessState(agency) });
    } catch (e) {
      next(e);
    }
  },

  async setSuspended(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const agency = await subscriptionService.setSuspended(req.params.id, !!req.body?.suspended);
      res.json({ success: true, data: subscriptionService.accessState(agency) });
    } catch (e) {
      next(e);
    }
  },
};
