import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payments:read'), paymentController.list);
router.get('/pending', authorize('payments:read'), paymentController.pending);
router.get('/:id', authorize('payments:read'), paymentController.getById);
router.post('/', authorize('payments:write'), paymentController.create);
router.patch('/:id', authorize('payments:write'), paymentController.update);
router.patch('/:id/verify', authorize('payments:write'), paymentController.verify);
router.patch('/:id/reject', authorize('payments:write'), paymentController.reject);
router.delete('/:id', authorize('payments:delete'), paymentController.delete);

export default router;
