import { Router } from 'express';
import { visaController } from '../controllers/visa.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', authorize('visas:read'), visaController.list);
router.get('/appointments/upcoming', authorize('visas:read'), visaController.getUpcomingAppointments);
router.get('/:id', authorize('visas:read'), visaController.getById);
router.post('/', authorize('visas:write'), visaController.create);
router.put('/:id', authorize('visas:write'), visaController.update);
router.patch('/:id/status', authorize('visas:write'), visaController.updateStatus);
router.patch('/:id/assign', authorize('visas:write'), visaController.assignOfficer);
router.patch('/:id/appointment', authorize('visas:write'), visaController.scheduleAppointment);
router.delete('/:id', authorize('visas:delete'), visaController.delete);

export default router;
