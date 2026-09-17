import { Router } from 'express';
import { bookingGroupController } from '../controllers/bookingGroup.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('bookings:read'), bookingGroupController.list);
router.get('/:id', authorize('bookings:read'), bookingGroupController.getById);
router.get('/:id/members', authorize('bookings:read'), bookingGroupController.members);
router.get('/:id/ledger', authorize('bookings:read'), bookingGroupController.ledger);
router.post('/', authorize('bookings:write'), bookingGroupController.create);
router.put('/:id', authorize('bookings:write'), bookingGroupController.update);
router.post('/:id/members', authorize('bookings:write'), bookingGroupController.addMember);
router.delete('/:id/members/:travelFileId', authorize('bookings:write'), bookingGroupController.removeMember);
router.post('/:id/payments', authorize('payments:write'), bookingGroupController.recordPayment);
router.delete('/:id', authorize('bookings:delete'), bookingGroupController.delete);

export default router;
