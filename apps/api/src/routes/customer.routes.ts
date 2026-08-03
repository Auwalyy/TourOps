import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('customers:read'), customerController.list);
router.get('/duplicates', authorize('customers:read'), customerController.findDuplicates);
router.get('/:id', authorize('customers:read'), customerController.getById);
router.post('/', authorize('customers:write'), customerController.create);
router.put('/:id', authorize('customers:write'), customerController.update);
router.patch('/:id/archive', authorize('customers:write'), customerController.archive);
router.post('/merge', authorize('customers:write'), customerController.merge);
router.delete('/:id', authorize('customers:delete'), customerController.delete);

export default router;
