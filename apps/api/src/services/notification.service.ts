import mongoose from 'mongoose';
import { notificationRepository } from '../repositories/notification.repository';
import { User } from '../models/User';
import { emailService } from './email.service';

type NotificationType = 'booking' | 'visa' | 'payment' | 'appointment' | 'document' | 'system';

interface NotifyPayload {
  agencyId: mongoose.Types.ObjectId;
  userIds: mongoose.Types.ObjectId[];
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: mongoose.Types.ObjectId;
  referenceModel?: string;
}

export const notificationService = {
  async notify(payload: NotifyPayload): Promise<void> {
    await notificationRepository.createForUsers(payload.userIds, {
      agencyId: payload.agencyId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      referenceId: payload.referenceId,
      referenceModel: payload.referenceModel,
    } as any);
  },

  async notifyAgencyStaff(agencyId: mongoose.Types.ObjectId, payload: Omit<NotifyPayload, 'agencyId' | 'userIds'>): Promise<void> {
    const staff = await User.find({ agencyId, isActive: true }).select('_id').lean();
    const userIds = staff.map((u) => u._id as mongoose.Types.ObjectId);
    await this.notify({ ...payload, agencyId, userIds });
  },

  async sendBookingNotification(
    agencyId: mongoose.Types.ObjectId,
    userIds: mongoose.Types.ObjectId[],
    reference: string,
    status: string,
    bookingId: mongoose.Types.ObjectId,
    customerEmail?: string,
    customerName?: string
  ): Promise<void> {
    await this.notify({
      agencyId,
      userIds,
      title: 'Booking Updated',
      message: `Booking ${reference} status changed to ${status.replace(/_/g, ' ')}`,
      type: 'booking',
      referenceId: bookingId,
      referenceModel: 'Booking',
    });
    if (customerEmail && customerName && status === 'confirmed') {
      await emailService.sendBookingConfirmation(customerEmail, customerName, reference);
    }
  },

  async sendVisaNotification(
    agencyId: mongoose.Types.ObjectId,
    userIds: mongoose.Types.ObjectId[],
    status: string,
    country: string,
    visaId: mongoose.Types.ObjectId,
    customerEmail?: string,
    customerName?: string
  ): Promise<void> {
    await this.notify({
      agencyId,
      userIds,
      title: 'Visa Application Updated',
      message: `Visa application for ${country} updated to ${status.replace(/_/g, ' ')}`,
      type: 'visa',
      referenceId: visaId,
      referenceModel: 'VisaApplication',
    });
    if (customerEmail && customerName) {
      await emailService.sendVisaUpdate(customerEmail, customerName, status, country);
    }
  },
};
