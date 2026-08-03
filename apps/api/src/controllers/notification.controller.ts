import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { notificationRepository } from '../repositories/notification.repository';
import { sendSuccess, sendPaginated } from '../utils/response';

export const notificationController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page || 1));
      const limit = parseInt(String(req.query.limit || 20));
      const { data, total } = await notificationRepository.getForUser(req.user!.id, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (e) { next(e); }
  },

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationRepository.getUnreadCount(req.user!.id);
      sendSuccess(res, { count });
    } catch (e) { next(e); }
  },

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationRepository.updateById(req.params.id, { isRead: true, readAt: new Date() });
      sendSuccess(res, null, 'Marked as read');
    } catch (e) { next(e); }
  },

  async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationRepository.markAllRead(req.user!.id);
      sendSuccess(res, null, 'All marked as read');
    } catch (e) { next(e); }
  },
};
