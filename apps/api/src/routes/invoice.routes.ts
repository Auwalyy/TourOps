import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payments:read'), invoiceController.list);
router.get('/summary', authorize('payments:read'), invoiceController.getFinancialSummary);
router.get('/:id', authorize('payments:read'), invoiceController.getById);
router.get('/:id/pdf', authorize('payments:read'), invoiceController.downloadPDF);
router.post('/', authorize('payments:write'), invoiceController.create);
router.post('/:id/payments', authorize('payments:write'), invoiceController.recordPayment);

export default router;
