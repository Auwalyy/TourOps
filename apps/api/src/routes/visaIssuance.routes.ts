import { Router } from 'express';
import {
  visaIssuanceController,
  visaGroupController,
  issuanceUpload,
} from '../controllers/visaIssuance.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

// ─── Groups ──────────────────────────────────────────────────────────────────
router.get('/groups', authorize('visas:read'), visaGroupController.list);
router.post('/groups', authorize('visas:write'), visaGroupController.create);
router.get('/groups/:id', authorize('visas:read'), visaGroupController.getById);
router.get('/groups/:id/pdf', authorize('visas:read'), visaGroupController.downloadPDF);
router.put('/groups/:id', authorize('visas:write'), visaGroupController.update);
router.delete('/groups/:id', authorize('visas:delete'), visaGroupController.delete);

// ─── Individual issued documents ────────────────────────────────────────────
router.get('/', authorize('visas:read'), visaIssuanceController.list);
router.post('/pdf', authorize('visas:read'), visaIssuanceController.batchPDF);
router.post('/', authorize('visas:write'), issuanceUpload, visaIssuanceController.create);
router.get('/:id', authorize('visas:read'), visaIssuanceController.getById);
router.put('/:id', authorize('visas:write'), issuanceUpload, visaIssuanceController.update);
router.delete('/:id', authorize('visas:delete'), visaIssuanceController.delete);

export default router;
