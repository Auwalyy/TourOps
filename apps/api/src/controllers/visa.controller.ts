import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { visaService } from '../services/visa.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const visaController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await visaService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const visa = await visaService.create(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, visa, 'Visa application created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaService.update(req.user!.agencyId!.toString(), req.params.id, req.body), 'Updated');
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await visaService.updateStatus(
        req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.status, req.body.note
      );
      sendSuccess(res, result, 'Status updated');
    } catch (e) { next(e); }
  },

  async assignOfficer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaService.assignOfficer(req.user!.agencyId!.toString(), req.params.id, req.body.officerId), 'Officer assigned');
    } catch (e) { next(e); }
  },

  async scheduleAppointment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaService.scheduleAppointment(req.user!.agencyId!.toString(), req.params.id, req.body), 'Appointment scheduled');
    } catch (e) { next(e); }
  },

  async getUpcomingAppointments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaService.getUpcomingAppointments(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await visaService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
};
