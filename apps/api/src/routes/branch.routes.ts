import { Router } from 'express';
import { branchController } from '../controllers/branch.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('branches:read'), branchController.list);
router.get('/:id', authorize('branches:read'), branchController.getById);
router.post('/', authorize('branches:write'), branchController.create);
router.put('/:id', authorize('branches:write'), branchController.update);
router.delete('/:id', authorize('branches:write'), branchController.delete);

export default router;
