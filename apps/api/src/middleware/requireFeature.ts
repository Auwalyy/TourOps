import { Response, NextFunction } from 'express';
import { Agency } from '../models/Agency';
import { subscriptionService } from '../services/subscription.service';
import { FeatureKey, PLANS, PlanId } from '../config/plans';
import { AuthRequest } from '../types/express';
import { AppError } from '../utils/errors';

/** The cheapest plan that includes a feature — named in the upgrade message. */
function cheapestPlanWith(feature: FeatureKey): string {
  const order: PlanId[] = ['starter', 'professional', 'enterprise'];
  const found = order.find((id) => PLANS[id].entitlements[feature]);
  return found ? PLANS[found].name : 'a higher plan';
}

/**
 * Gates a route behind a plan feature, so every line on the pricing page is
 * something the system actually enforces rather than a promise.
 *
 * The platform owner is never gated.
 */
export function requireFeature(feature: FeatureKey) {
  return async function (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next();
      if (user.role === 'system_admin' && !user.agencyId) return next();
      if (!user.agencyId) return next();

      const agency = await Agency.findById(user.agencyId);
      if (!agency) return next();

      if (subscriptionService.entitlements(agency)[feature]) return next();

      const err = new AppError(
        `This is part of the ${cheapestPlanWith(feature)} plan. Upgrade to switch it on.`,
        403
      );
      (err as any).details = { upgradeRequired: true, feature };
      next(err);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Refuses to add a staff member past the plan's seat limit. Read as a guard
 * on creation only — an agency that downgrades keeps the people it has.
 */
export async function enforceSeatLimit(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user?.agencyId) return next();

    const agency = await Agency.findById(user.agencyId);
    if (!agency) return next();

    const { maxUsers } = subscriptionService.entitlements(agency);

    const { User } = await import('../models/User');
    const current = await User.countDocuments({ agencyId: user.agencyId, isActive: true });

    if (current >= maxUsers) {
      const err = new AppError(
        `Your plan allows ${maxUsers} staff account${maxUsers === 1 ? '' : 's'}. Upgrade to add more.`,
        403
      );
      (err as any).details = { upgradeRequired: true, feature: 'maxUsers', maxUsers, current };
      return next(err);
    }

    next();
  } catch (error) {
    next(error);
  }
}
