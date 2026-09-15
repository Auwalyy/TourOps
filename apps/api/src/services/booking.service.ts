import mongoose from 'mongoose';
import { bookingRepository } from '../repositories/booking.repository';
import { travelFileRepository } from '../repositories/travelFile.repository';
import { notificationService } from './notification.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams, generateBookingNumber } from '../utils/helpers';
import { BookingStatus, BookingType } from '../models/Booking';
import { Agency } from '../models/Agency';
import { TravelFile } from '../models/TravelFile';

async function getAgencyPrefix(agencyId: string): Promise<string> {
  const agency = await Agency.findById(agencyId).select('name').lean();
  if (!agency) return 'AGY';
  return agency.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AGY';
}

async function pushTravelFileTimeline(
  travelFileId: string,
  agencyId: string,
  userId: string,
  action: string,
  description: string,
  source = 'booking',
  referenceId?: mongoose.Types.ObjectId
) {
  await TravelFile.findOneAndUpdate(
    { _id: travelFileId, agencyId },
    {
      $push: {
        timeline: {
          action,
          description,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source,
          referenceId,
        },
      },
    }
  );
}

export const bookingService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return bookingRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as BookingStatus,
      bookingType: query.bookingType as BookingType,
      travelFileId: query.travelFileId as string,
      customerId: query.customerId as string,
      startDateFrom: query.startDateFrom as string,
      startDateTo: query.startDateTo as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    await booking.populate([
      { path: 'customerId', select: 'firstName lastName fullName phone email passport' },
      { path: 'travelFileId', select: 'fileNumber travelType destination status departureDate' },
      { path: 'tourPackageId', select: 'title category pricing' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'updatedBy', select: 'firstName lastName' },
      { path: 'documents.documentId' },
    ]);
    return booking;
  },

  async getByTravelFile(agencyId: string, travelFileId: string) {
    const tf = await travelFileRepository.findOne({ _id: travelFileId, agencyId });
    if (!tf) throw new NotFoundError('Travel File');
    return bookingRepository.getByTravelFile(agencyId, travelFileId);
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>, travelFileIdOverride?: string) {
    const travelFileId = travelFileIdOverride || (data.travelFileId as string);
    if (!travelFileId) throw new AppError('travelFileId is required', 400);

    const travelFile = await travelFileRepository.findOne({ _id: travelFileId, agencyId });
    if (!travelFile) throw new NotFoundError('Travel File');

    // Validate customer belongs to travel file
    const customerId = data.customerId || travelFile.customerId.toString();
    if (customerId.toString() !== travelFile.customerId.toString()) {
      throw new AppError('Customer does not belong to this Travel File', 400);
    }

    const prefix = await getAgencyPrefix(agencyId);
    const seq = await bookingRepository.nextSequence(agencyId);
    const bookingNumber = generateBookingNumber(prefix, seq);

    const booking = await bookingRepository.create({
      ...data,
      agencyId,
      travelFileId,
      customerId,
      bookingNumber,
      createdBy: new mongoose.Types.ObjectId(userId),
      statusHistory: [
        {
          from: 'pending' as BookingStatus,
          to: (data.status as BookingStatus) || 'pending',
          changedBy: new mongoose.Types.ObjectId(userId),
          changedAt: new Date(),
        },
      ],
    } as any);

    await pushTravelFileTimeline(
      travelFileId,
      agencyId,
      userId,
      `${(data.bookingType as string || 'Booking').replace(/^\w/, (c) => c.toUpperCase())} Booking Created`,
      `Booking ${bookingNumber} — ${data.title || data.bookingType} created`,
      'booking',
      booking._id as mongoose.Types.ObjectId
    );

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: 'New Booking Created',
      message: `Booking ${bookingNumber} has been created`,
      type: 'booking',
      referenceId: booking._id as mongoose.Types.ObjectId,
      referenceModel: 'Booking',
    });

    return booking;
  },

  async update(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');

    const { status, statusHistory, bookingNumber, travelFileId, agencyId: _a, createdBy: _c, ...safeData } = data as any;

    return bookingRepository.updateById(id, {
      ...safeData,
      updatedBy: new mongoose.Types.ObjectId(userId),
    });
  },

  async updateStatus(agencyId: string, id: string, userId: string, status: BookingStatus, reason?: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');

    const updated = await bookingRepository.updateById(id, {
      status,
      updatedBy: new mongoose.Types.ObjectId(userId),
      $push: {
        statusHistory: {
          from: booking.status,
          to: status,
          reason,
          changedBy: new mongoose.Types.ObjectId(userId),
          changedAt: new Date(),
        },
      },
    });

    const label = status.replace(/_/g, ' ');
    const typeLabel = booking.bookingType.replace(/^\w/, (c) => c.toUpperCase());

    await pushTravelFileTimeline(
      booking.travelFileId.toString(),
      agencyId,
      userId,
      `${typeLabel} Booking → ${label}`,
      reason || `${booking.bookingNumber} status changed to ${label}`,
      'booking',
      booking._id as mongoose.Types.ObjectId
    );

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: 'Booking Status Updated',
      message: `${booking.bookingNumber} is now ${label}`,
      type: 'booking',
      referenceId: booking._id as mongoose.Types.ObjectId,
      referenceModel: 'Booking',
    });

    return updated;
  },

  async linkDocument(agencyId: string, id: string, userId: string, documentId: string, visibleToCustomer = false) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');

    const updated = await bookingRepository.updateById(id, {
      $addToSet: { documents: { documentId: new mongoose.Types.ObjectId(documentId), visibleToCustomer } },
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    await pushTravelFileTimeline(
      booking.travelFileId.toString(),
      agencyId,
      userId,
      'Booking Document Linked',
      `Document linked to booking ${booking.bookingNumber}`,
      'document',
      booking._id as mongoose.Types.ObjectId
    );

    return updated;
  },

  async delete(agencyId: string, id: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    if (!['draft', 'cancelled'].includes(booking.status)) {
      throw new AppError('Only draft or cancelled bookings can be deleted', 400);
    }
    return bookingRepository.deleteById(id);
  },

  // ─── Data for Travel File Health / Next Action engines ────────────────────
  async getBookingSummaryForFile(agencyId: string, travelFileId: string) {
    const bookings = await bookingRepository.getByTravelFile(agencyId, travelFileId);
    return bookings;
  },
};
