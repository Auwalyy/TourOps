import { Router } from 'express';
import { receiptController } from '../controllers/receipt.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payments:read'), receiptController.list);
router.get('/:id', authorize('payments:read'), receiptController.getById);
router.get('/:id/pdf', authorize('payments:read'), receiptController.downloadPDF);
router.post('/', authorize('payments:write'), receiptController.create);
router.delete('/:id', authorize('payments:delete'), receiptController.delete);

export default router;
