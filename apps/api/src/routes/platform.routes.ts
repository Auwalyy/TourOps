import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { platformController } from '../controllers/platform.controller';
import { AuthRequest } from '../types/express';
import { ForbiddenError } from '../utils/errors';

const router = Router();

/**
 * Platform owner only: a system_admin who belongs to no agency. An agency's
 * own system_admin must never see other agencies' data.
 */
function platformOwnerOnly(req: AuthRequest, _res: Response, next: NextFunction) {
  if (req.user?.role === 'system_admin' && !req.user.agencyId) return next();
  next(new ForbiddenError('Platform administrators only'));
}

router.use(authenticate, platformOwnerOnly);

router.get('/stats', platformController.stats);
router.get('/agencies', platformController.agencies);
router.get('/payments', platformController.payments);
router.post('/agencies/:id/extend', platformController.extend);
router.post('/agencies/:id/record-payment', platformController.recordPayment);
router.post('/agencies/:id/suspend', platformController.setSuspended);

export default router;
