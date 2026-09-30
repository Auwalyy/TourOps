import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { subscriptionController } from '../controllers/subscription.controller';

const router = Router();

// Unauthenticated: Flutterwave calls this directly, authenticated by verif-hash.
router.post('/webhook', subscriptionController.webhook);

router.get('/plans', subscriptionController.plans);

router.use(authenticate);

// Any signed-in staff member may see whether the account is about to lapse;
// only the owner can spend money on it.
router.get('/', subscriptionController.status);
router.get('/history', authorizeRoles('agency_owner', 'system_admin'), subscriptionController.history);
router.post('/checkout', authorizeRoles('agency_owner', 'system_admin'), subscriptionController.checkout);
router.get('/verify/:reference', subscriptionController.verify);

export default router;
