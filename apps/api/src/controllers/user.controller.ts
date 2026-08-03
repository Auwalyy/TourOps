import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { userService } from '../services/user.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const userController = {
  async listStaff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await userService.listStaff(req.user!.agencyId!.toString(), req.query as any);
      sendSuccess(res, { data, total });
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await userService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async invite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await userService.invite(req.user!.agencyId!.toString(), req.body), 'User invited');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await userService.update(req.user!.agencyId!.toString(), req.params.id, req.body), 'Updated');
    } catch (e) { next(e); }
  },

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.deactivate(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'User deactivated');
    } catch (e) { next(e); }
  },

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await userService.updateProfile(req.user!.id, req.body), 'Profile updated');
    } catch (e) { next(e); }
  },
};
