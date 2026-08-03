import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { invoiceService } from '../services/invoice.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const invoiceController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await invoiceService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await invoiceService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await invoiceService.create(req.user!.agencyId!.toString(), req.body), 'Invoice created');
    } catch (e) { next(e); }
  },

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await invoiceService.recordPayment(
        req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body
      );
      sendSuccess(res, result, 'Payment recorded');
    } catch (e) { next(e); }
  },

  async downloadPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await invoiceService.generatePDF(req.user!.agencyId!.toString(), req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
      res.send(buffer);
    } catch (e) { next(e); }
  },

  async getFinancialSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await invoiceService.getFinancialSummary(req.user!.agencyId!.toString());
      sendSuccess(res, summary[0] || {});
    } catch (e) { next(e); }
  },
};
