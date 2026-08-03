import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { bookingService } from '../services/booking.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const bookingController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await bookingService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await bookingService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.create(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, booking, 'Booking created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await bookingService.update(req.user!.agencyId!.toString(), req.params.id, req.body), 'Booking updated');
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await bookingService.updateStatus(
        req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.status, req.body.note
      );
      sendSuccess(res, result, 'Status updated');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await bookingService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Booking deleted');
    } catch (e) { next(e); }
  },
};
