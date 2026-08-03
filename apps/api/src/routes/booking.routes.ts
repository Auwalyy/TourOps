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
router.delete('/:id', authorize('bookings:delete'), bookingController.delete);

export default router;
