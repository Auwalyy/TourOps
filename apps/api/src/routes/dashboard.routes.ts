import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/kpis', dashboardController.getKPIs);
router.get('/revenue-chart', dashboardController.getRevenueChart);
router.get('/upcoming-appointments', dashboardController.getUpcomingAppointments);
router.get('/recent-activity', dashboardController.getRecentActivity);

export default router;
