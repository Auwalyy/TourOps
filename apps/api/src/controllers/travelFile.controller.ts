import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { travelFileService } from '../services/travelFile.service';
import { travelFileRepository } from '../repositories/travelFile.repository';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const travelFileController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await travelFileService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = await travelFileService.create(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, file, 'Travel file created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.update(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body), 'Travel file updated');
    } catch (e) { next(e); }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.updateStatus(
        req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.status, req.body.reason
      ), 'Status updated');
    } catch (e) { next(e); }
  },

  async addTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.addTask(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body), 'Task added');
    } catch (e) { next(e); }
  },

  async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.updateTask(req.user!.agencyId!.toString(), req.params.id, req.params.taskId, req.body), 'Task updated');
    } catch (e) { next(e); }
  },

  async addNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.addNote(
        req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.content, req.body.visibility
      ), 'Note added');
    } catch (e) { next(e); }
  },

  async linkDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.linkDocument(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.documentId), 'Document linked');
    } catch (e) { next(e); }
  },

  async linkInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.linkInvoice(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body.invoiceId), 'Invoice linked');
    } catch (e) { next(e); }
  },

  async addPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.addPayment(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body), 'Payment recorded');
    } catch (e) { next(e); }
  },

  async updatePhysicalFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.updatePhysicalFile(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.body), 'Physical file updated');
    } catch (e) { next(e); }
  },

  async getHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.getHealth(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async statusSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileService.statusSummary(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async attentionRequired(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await travelFileRepository.attentionRequired(req.user!.agencyId!.toString()));
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await travelFileService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Travel file deleted');
    } catch (e) { next(e); }
  },
};
