import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { requireFeature } from '../middleware/requireFeature';
import { AuditLog } from '../models/AuditLog';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types/express';

const router = Router();

// Who did what, and when. Owner-only: it is a record of staff actions.
router.use(authenticate, requireFeature('refunds'), authorizeRoles('agency_owner', 'system_admin'));

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { resource, action, userId, limit } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { agencyId: req.user!.agencyId };
    if (resource) filter.resource = resource;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit || '100', 10), 500))
      .lean();

    sendSuccess(res, logs);
  } catch (e) { next(e); }
});

export default router;
