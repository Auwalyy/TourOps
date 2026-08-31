import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { travelFileController } from '../controllers/travelFile.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('bookings:read'), travelFileController.list);
router.get('/summary', authorize('bookings:read'), travelFileController.statusSummary);
router.get('/:id', authorize('bookings:read'), travelFileController.getById);
router.post('/', authorize('bookings:write'), travelFileController.create);
router.put('/:id', authorize('bookings:write'), travelFileController.update);
router.patch('/:id/status', authorize('bookings:write'), travelFileController.updateStatus);
router.post('/:id/tasks', authorize('bookings:write'), travelFileController.addTask);
router.patch('/:id/tasks/:taskId', authorize('bookings:write'), travelFileController.updateTask);
router.post('/:id/payments', authorize('payments:write'), travelFileController.addPayment);
router.post('/:id/notes', authorize('bookings:write'), travelFileController.addNote);
router.post('/:id/documents', authorize('documents:write'), travelFileController.linkDocument);
router.post('/:id/invoices', authorize('payments:write'), travelFileController.linkInvoice);
router.delete('/:id', authorize('bookings:delete'), travelFileController.delete);

export default router;
