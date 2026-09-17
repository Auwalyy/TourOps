import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { refundService } from '../services/refund.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const refundController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await refundService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await refundService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refund = await refundService.request(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, refund, 'Refund requested');
    } catch (e) { next(e); }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await refundService.approve(req.user!.agencyId!.toString(), req.params.id, req.user!.id),
        'Refund approved'
      );
    } catch (e) { next(e); }
  },

  async reject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await refundService.reject(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.reason),
        'Refund rejected'
      );
    } catch (e) { next(e); }
  },

  async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await refundService.complete(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.reference),
        'Refund completed'
      );
    } catch (e) { next(e); }
  },
};
