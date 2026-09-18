import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('bookings:read'), bookingController.list);
router.get('/:id', authorize('bookings:read'), bookingController.getById);
router.post('/', authorize('bookings:write'), bookingController.create);
router.put('/:id', authorize('bookings:write'), bookingController.update);
router.patch('/:id/status', authorize('bookings:write'), bookingController.updateStatus);
router.post('/:id/documents', authorize('documents:write'), bookingController.linkDocument);
router.get('/:id/payments', authorize('payments:read'), bookingController.listPayments);
router.post('/:id/payments', authorize('payments:write'), bookingController.addPayment);
router.delete('/:id', authorize('bookings:delete'), bookingController.delete);

export default router;
