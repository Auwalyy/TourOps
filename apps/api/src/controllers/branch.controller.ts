import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { branchService } from '../services/branch.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const branchController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await branchService.list(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await branchService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await branchService.create(req.user!.agencyId!.toString(), req.body), 'Branch created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await branchService.update(req.user!.agencyId!.toString(), req.params.id, req.body),
        'Branch updated'
      );
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await branchService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Branch deleted');
    } catch (e) { next(e); }
  },
};
