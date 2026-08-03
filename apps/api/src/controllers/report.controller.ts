import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { reportService } from '../services/report.service';
import { sendSuccess } from '../utils/response';

function parseDateRange(query: Record<string, unknown>) {
  const startDate = query.startDate ? new Date(String(query.startDate)) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = query.endDate ? new Date(String(query.endDate)) : new Date();
  return { startDate, endDate };
}

export const reportController = {
  async getRevenueReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parseDateRange(req.query as any);
      sendSuccess(res, await reportService.getRevenueReport(req.user!.agencyId!.toString(), startDate, endDate));
    } catch (e) { next(e); }
  },

  async getBookingReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parseDateRange(req.query as any);
      sendSuccess(res, await reportService.getBookingReport(req.user!.agencyId!.toString(), startDate, endDate));
    } catch (e) { next(e); }
  },

  async getOutstandingReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await reportService.getOutstandingReport(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async exportInvoicesCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parseDateRange(req.query as any);
      const csv = await reportService.exportInvoicesCSV(req.user!.agencyId!.toString(), startDate, endDate);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
      res.send(csv);
    } catch (e) { next(e); }
  },

  async exportBookingsCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parseDateRange(req.query as any);
      const csv = await reportService.exportBookingsCSV(req.user!.agencyId!.toString(), startDate, endDate);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
      res.send(csv);
    } catch (e) { next(e); }
  },
};
