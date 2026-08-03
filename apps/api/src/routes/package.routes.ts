import { Router } from 'express';
import { packageController } from '../controllers/package.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('packages:read'), packageController.list);
router.get('/:id', authorize('packages:read'), packageController.getById);
router.post('/', authorize('packages:write'), packageController.create);
router.put('/:id', authorize('packages:write'), packageController.update);
router.delete('/:id', authorize('packages:delete'), packageController.delete);

export default router;
