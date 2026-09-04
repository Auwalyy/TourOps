import mongoose from 'mongoose';
import { bookingRepository } from '../repositories/booking.repository';
import { notificationService } from './notification.service';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, generateBookingReference } from '../utils/helpers';
import { BookingStatus } from '../models/Booking';
import { Customer } from '../models/Customer';
import { TravelFile } from '../models/TravelFile';

export const bookingService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return bookingRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as BookingStatus,
      customerId: query.customerId as string,
      assignedTo: query.assignedTo as string,
      bookingType: query.bookingType as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    return booking;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const referenceNumber = generateBookingReference();

    // Auto-create customer if name/email provided instead of selecting existing
    let customerId = data.customerId;
    if (!customerId && data.customerFirstName) {
      const newCustomer = await Customer.create({
        agencyId,
        firstName: data.customerFirstName,
        lastName: data.customerLastName,
        email: data.customerEmail,
        status: 'active',
      });
      customerId = newCustomer._id;
    }

    const { customerMode, customerFirstName, customerLastName, customerEmail, ...bookingData } = data as any;

    const booking = await bookingRepository.create({
      ...bookingData,
      customerId,
      agencyId,
      referenceNumber,
      statusHistory: [{ status: 'enquiry', changedBy: userId, changedAt: new Date() }],
    } as any);

    await notificationService.notifyAgencyStaff(
      new mongoose.Types.ObjectId(agencyId),
      {
        title: 'New Booking Created',
        message: `Booking ${referenceNumber} has been created`,
        type: 'booking',
        referenceId: booking._id as mongoose.Types.ObjectId,
        referenceModel: 'Booking',
      }
    );

    return booking;
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    return bookingRepository.updateById(id, data);
  },

  async updateStatus(agencyId: string, id: string, userId: string, status: BookingStatus, note?: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');

    const updated = await bookingRepository.updateById(id, {
      status,
      $push: {
        statusHistory: { status, changedBy: userId, changedAt: new Date(), note },
      },
    });

    const customer = await Customer.findById(booking.customerId).select('email firstName').lean();

    await notificationService.sendBookingNotification(
      new mongoose.Types.ObjectId(agencyId),
      [new mongoose.Types.ObjectId(userId)],
      booking.referenceNumber,
      status,
      booking._id as mongoose.Types.ObjectId,
      customer?.email,
      customer?.firstName
    );

    return updated;
  },

  async getLinkedTravelFile(agencyId: string, bookingId: string) {
    return TravelFile.findOne({ agencyId, bookingId })
      .select('fileNumber status travelType destination priority createdAt')
      .lean();
  },

  async delete(agencyId: string, id: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    return bookingRepository.deleteById(id);
  },
};
