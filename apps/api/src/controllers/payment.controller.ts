import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { paymentService } from '../services/payment.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const paymentController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await paymentService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async pending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await paymentService.listPending(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await paymentService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.record(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, payment, 'Payment recorded');
    } catch (e) { next(e); }
  },

  async verify(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await paymentService.verify(req.user!.agencyId!.toString(), req.params.id, req.user!.id),
        'Payment verified'
      );
    } catch (e) { next(e); }
  },

  async reject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await paymentService.reject(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.reason),
        'Payment rejected'
      );
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await paymentService.update(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body),
        'Payment updated'
      );
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await paymentService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Payment deleted');
    } catch (e) { next(e); }
  },
};
