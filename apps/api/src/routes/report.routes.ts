import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate, authorize('reports:read'));

router.get('/revenue', reportController.getRevenueReport);
router.get('/bookings', reportController.getBookingReport);
router.get('/outstanding', reportController.getOutstandingReport);
router.get('/export/invoices', reportController.exportInvoicesCSV);
router.get('/export/bookings', reportController.exportBookingsCSV);

export default router;
