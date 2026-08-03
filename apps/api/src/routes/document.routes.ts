import { Router } from 'express';
import { documentController, uploadMiddleware } from '../controllers/document.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('documents:read'), documentController.list);
router.get('/expiring', authorize('documents:read'), documentController.getExpiringSoon);
router.get('/:id', authorize('documents:read'), documentController.getById);
router.post('/', authorize('documents:write'), uploadMiddleware, documentController.upload);
router.post('/:id/version', authorize('documents:write'), uploadMiddleware, documentController.uploadNewVersion);
router.delete('/:id', authorize('documents:write'), documentController.delete);

export default router;
