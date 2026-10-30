import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { seasonService } from '../services/season.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const seasonController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await seasonService.list(req.user!.agencyId!.toString(), req.query as any));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await seasonService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await seasonService.create(req.user!.agencyId!.toString(), req.user!.id, req.body), 'Season created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await seasonService.update(req.user!.agencyId!.toString(), req.params.id, req.body), 'Season updated');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await seasonService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Season deleted');
    } catch (e) { next(e); }
  },

  async addPilgrim(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = await seasonService.addPilgrim(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body);
      sendCreated(res, file, 'Pilgrim added');
    } catch (e) { next(e); }
  },

  async attachFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await seasonService.attachFiles(req.user!.agencyId!.toString(), req.params.id, req.body.travelFileIds);
      sendSuccess(res, result, `${result.moved} file(s) moved into this season`);
    } catch (e) { next(e); }
  },

  async detachFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await seasonService.detachFile(req.user!.agencyId!.toString(), req.params.id, req.params.travelFileId),
        'Pilgrim removed from season'
      );
    } catch (e) { next(e); }
  },

  async addArrangement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await seasonService.addArrangement(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body);
      sendCreated(res, result, `Booked for ${result.createdCount} pilgrim(s)`);
    } catch (e) { next(e); }
  },
};
