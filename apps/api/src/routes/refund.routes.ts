import { Router } from 'express';
import { refundController } from '../controllers/refund.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('refunds:read'), refundController.list);
router.get('/:id', authorize('refunds:read'), refundController.getById);
router.post('/', authorize('refunds:write'), refundController.create);
// Approving and paying out are deliberately gated above ordinary write access.
router.patch('/:id/approve', authorize('refunds:approve'), refundController.approve);
router.patch('/:id/reject', authorize('refunds:approve'), refundController.reject);
router.patch('/:id/complete', authorize('refunds:approve'), refundController.complete);

export default router;
