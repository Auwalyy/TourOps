import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export const dashboardController = {
  async getKPIs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getKPIs(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async getRevenueChart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const year = parseInt(String(req.query.year || new Date().getFullYear()));
      sendSuccess(res, await dashboardService.getRevenueChart(req.user!.agencyId!.toString(), year));
    } catch (e) { next(e); }
  },

  async getUpcomingAppointments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getUpcomingAppointments(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async getRecentActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await dashboardService.getRecentActivity(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },
};
