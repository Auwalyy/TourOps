import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('users:read'), userController.listStaff);
router.get('/:id', authorize('users:read'), userController.getById);
router.post('/invite', authorize('users:write'), userController.invite);
router.put('/profile', userController.updateProfile);
router.put('/:id', authorize('users:write'), userController.update);
router.patch('/:id/deactivate', authorize('users:delete'), userController.deactivate);

export default router;
