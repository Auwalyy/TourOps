import { Notification, INotification } from '../models/Notification';
import { BaseRepository } from './base.repository';
import mongoose from 'mongoose';

class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(Notification);
  }

  async getForUser(userId: string, page: number, limit: number) {
    return this.paginate({ userId }, page, limit, { createdAt: -1 });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  async createForUsers(
    userIds: mongoose.Types.ObjectId[],
    payload: Omit<INotification, '_id' | 'userId' | 'isRead' | 'readAt' | 'createdAt'>
  ): Promise<void> {
    const docs = userIds.map((userId) => ({ ...payload, userId, isRead: false }));
    await Notification.insertMany(docs);
  }
}

export const notificationRepository = new NotificationRepository();
