import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Agency } from '../models/Agency';
import { subscriptionService } from '../services/subscription.service';
import { JwtPayload } from '../types/express';
import { SubscriptionRequiredError } from '../utils/errors';

/**
 * Paths that must keep working even when an agency is locked out — otherwise
 * they could never sign in to pay. Matched against the path after /api/v1.
 */
const ALWAYS_ALLOWED = [
  /^\/auth(\/|$)/,
  /^\/subscription(\/|$)/,
  /^\/platform(\/|$)/,
  /^\/portal(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/agency\/(profile|branding)$/,
];

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Enforces the trial and the subscription.
 *
 * - trialing / active → everything works
 * - grace → reads still work, writes are refused, so their data is visible
 *   but frozen — the point at which agencies actually renew
 * - locked / suspended → everything refused except the allow-list above
 *
 * This runs before the per-route `authenticate`, so it reads the JWT itself
 * rather than relying on `req.user`. An unreadable token is simply passed
 * through for `authenticate` to reject with a proper 401.
 *
 * The platform owner — a system_admin belonging to no agency — is never gated.
 */
export async function enforceSubscription(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const path = req.path.replace(/^\/api\/v1/, '');
    if (ALWAYS_ALLOWED.some((re) => re.test(path))) return next();

    const token = extractToken(req);
    if (!token) return next();

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    } catch {
      return next();
    }

    if (payload.role === 'system_admin' && !payload.agencyId) return next();
    if (!payload.agencyId) return next();

    const agency = await Agency.findById(payload.agencyId);
    if (!agency) return next();

    // An agency created before billing existed has no dates at all. Give it a
    // trial on first sight rather than locking it out of its own data.
    await subscriptionService.ensureTrial(agency);

    const status = subscriptionService.accessState(agency);
    if (status.state === 'trialing' || status.state === 'active') return next();
    if (status.state === 'grace' && READ_METHODS.has(req.method)) return next();

    const message =
      status.state === 'suspended'
        ? 'This account has been suspended. Please contact TourOps support.'
        : status.state === 'grace'
        ? 'Your subscription has expired. You can still view your data, but changes are locked until you renew.'
        : 'Your subscription has expired. Renew to continue using TourOps.';

    // The client reads these details to choose between the warning banner,
    // the read-only state and the full lock screen.
    next(
      new SubscriptionRequiredError(message, {
        state: status.state,
        daysLeft: status.daysLeft,
        accessUntil: status.accessUntil,
        graceEndsAt: status.graceEndsAt,
      })
    );
  } catch (error) {
    next(error);
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.substring(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}
