import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { bookingGroupService } from '../services/bookingGroup.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const bookingGroupController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await bookingGroupService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await bookingGroupService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const group = await bookingGroupService.create(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, group, 'Group created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await bookingGroupService.update(req.user!.agencyId!.toString(), req.params.id, req.body),
        'Group updated'
      );
    } catch (e) { next(e); }
  },

  async members(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await bookingGroupService.getMembers(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async addMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await bookingGroupService.addMember(req.user!.agencyId!.toString(), req.params.id, req.body.travelFileId),
        'Member added to group'
      );
    } catch (e) { next(e); }
  },

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await bookingGroupService.removeMember(req.user!.agencyId!.toString(), req.params.id, req.params.travelFileId),
        'Member removed from group'
      );
    } catch (e) { next(e); }
  },

  async ledger(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await bookingGroupService.getLedger(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payments = await bookingGroupService.recordGroupPayment(
        req.user!.agencyId!.toString(),
        req.params.id,
        req.user!.id,
        req.body
      );
      sendCreated(res, payments, 'Group payment recorded');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await bookingGroupService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Group deleted');
    } catch (e) { next(e); }
  },
};
