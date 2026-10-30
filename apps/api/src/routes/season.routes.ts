import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { seasonController } from '../controllers/season.controller';

/** Umrah & Hajj seasons — month-by-month folders of pilgrim travel files. */
const router = Router();
router.use(authenticate);

router.get('/', authorize('bookings:read'), seasonController.list);
router.get('/:id', authorize('bookings:read'), seasonController.getById);
router.post('/', authorize('bookings:write'), seasonController.create);
router.put('/:id', authorize('bookings:write'), seasonController.update);
router.delete('/:id', authorize('bookings:delete'), seasonController.delete);
router.post('/:id/pilgrims', authorize('bookings:write'), seasonController.addPilgrim);
router.post('/:id/pilgrims/attach', authorize('bookings:write'), seasonController.attachFiles);
router.delete('/:id/pilgrims/:travelFileId', authorize('bookings:write'), seasonController.detachFile);
router.post('/:id/arrangements', authorize('bookings:write'), seasonController.addArrangement);

export default router;
