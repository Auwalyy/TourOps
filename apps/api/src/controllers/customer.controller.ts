import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { customerService } from '../services/customer.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const customerController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await customerService.list(req.user!.agencyId!.toString(), req.query as any);
      const page = parseInt(String(req.query.page || 1));
      const limit = parseInt(String(req.query.limit || 20));
      sendPaginated(res, data, total, page, limit);
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.getById(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, customer);
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.create(req.user!.agencyId!.toString(), req.body);
      sendCreated(res, customer, 'Customer created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.update(req.user!.agencyId!.toString(), req.params.id, req.body);
      sendSuccess(res, customer, 'Customer updated');
    } catch (e) { next(e); }
  },

  async archive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await customerService.archive(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Customer archived');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await customerService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Customer deleted');
    } catch (e) { next(e); }
  },

  async findDuplicates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, phone } = req.query as { email: string; phone: string };
      const duplicates = await customerService.findDuplicates(req.user!.agencyId!.toString(), email, phone);
      sendSuccess(res, duplicates);
    } catch (e) { next(e); }
  },

  async merge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await customerService.merge(req.user!.agencyId!.toString(), req.body.primaryId, req.body.secondaryId);
      sendSuccess(res, result, 'Customers merged');
    } catch (e) { next(e); }
  },
};
