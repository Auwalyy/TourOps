import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { receiptService } from '../services/receipt.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const receiptController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await receiptService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await receiptService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await receiptService.create(req.user!.agencyId!.toString(), req.user!.id, req.body), 'Receipt created');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await receiptService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Receipt deleted');
    } catch (e) { next(e); }
  },

  async downloadPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await receiptService.generatePDF(req.user!.agencyId!.toString(), req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${req.params.id}.pdf"`);
      res.send(buffer);
    } catch (e) { next(e); }
  },
};
