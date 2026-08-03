import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { packageService } from '../services/package.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const packageController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await packageService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await packageService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await packageService.create(req.user!.agencyId!.toString(), req.user!.id, req.body), 'Package created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await packageService.update(req.user!.agencyId!.toString(), req.params.id, req.body), 'Updated');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await packageService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
};
