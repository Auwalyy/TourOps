import mongoose from 'mongoose';
import { bookingRepository } from '../repositories/booking.repository';
import { travelFileRepository } from '../repositories/travelFile.repository';
import { notificationService } from './notification.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams, generateBookingNumber } from '../utils/helpers';
import { BookingStatus, BookingType } from '../models/Booking';
import { Agency } from '../models/Agency';
import { TravelFile } from '../models/TravelFile';
import { packageService } from './package.service';
import { paymentService } from './payment.service';
import { paymentRepository } from '../repositories/payment.repository';

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

  /**
   * A booking can either belong to a travel file (the customer already has
   * one open) or stand alone against just a customer — a walk-in flight or
   * visa charge that doesn't need a whole file opened for it.
   */
  async create(agencyId: string, userId: string, data: Record<string, unknown>, travelFileIdOverride?: string) {
    const travelFileId = travelFileIdOverride || (data.travelFileId as string) || undefined;
    let customerId = data.customerId as string | undefined;

    if (travelFileId) {
      const travelFile = await travelFileRepository.findOne({ _id: travelFileId, agencyId });
      if (!travelFile) throw new NotFoundError('Travel File');
      customerId = customerId || travelFile.customerId.toString();
      if (customerId.toString() !== travelFile.customerId.toString()) {
        throw new AppError('Customer does not belong to this Travel File', 400);
      }
    }
    if (!customerId) throw new AppError('Select a customer, or a travel file, for this booking', 400);

    // Claim a seat before creating anything — a full package must refuse the
    // booking outright rather than overselling.
    const tourPackageId = (data.tourPackageId as string) || undefined;
    if (tourPackageId) {
      await packageService.claimSeat(agencyId, tourPackageId);
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

    if (travelFileId) {
      await pushTravelFileTimeline(
        travelFileId,
        agencyId,
        userId,
        `${(data.bookingType as string || 'Booking').replace(/^\w/, (c) => c.toUpperCase())} Booking Created`,
        `Booking ${bookingNumber} — ${data.title || data.bookingType} created`,
        'booking',
        booking._id as mongoose.Types.ObjectId
      );
    }

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

    // Cancelling frees the seat back into the package's capacity; un-cancelling
    // has to claim one again (and can legitimately fail if it sold out meanwhile).
    if (booking.tourPackageId) {
      const wasCancelled = booking.status === 'cancelled';
      const nowCancelled = status === 'cancelled';
      if (!wasCancelled && nowCancelled) {
        await packageService.releaseSeat(agencyId, booking.tourPackageId.toString());
      } else if (wasCancelled && !nowCancelled) {
        await packageService.claimSeat(agencyId, booking.tourPackageId.toString());
      }
    }

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

    if (booking.travelFileId) {
      await pushTravelFileTimeline(
        booking.travelFileId.toString(),
        agencyId,
        userId,
        `${typeLabel} Booking → ${label}`,
        reason || `${booking.bookingNumber} status changed to ${label}`,
        'booking',
        booking._id as mongoose.Types.ObjectId
      );
    }

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

    if (booking.travelFileId) {
      await pushTravelFileTimeline(
        booking.travelFileId.toString(),
        agencyId,
        userId,
        'Booking Document Linked',
        `Document linked to booking ${booking.bookingNumber}`,
        'document',
        booking._id as mongoose.Types.ObjectId
      );
    }

    return updated;
  },

  async delete(agencyId: string, id: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    if (!['draft', 'cancelled'].includes(booking.status)) {
      throw new AppError('Only draft or cancelled bookings can be deleted', 400);
    }
    // A cancelled booking already released its seat when it was cancelled.
    if (booking.tourPackageId && booking.status !== 'cancelled') {
      await packageService.releaseSeat(agencyId, booking.tourPackageId.toString());
    }
    return bookingRepository.deleteById(id);
  },

  // ─── Data for Travel File Health / Next Action engines ────────────────────
  async getBookingSummaryForFile(agencyId: string, travelFileId: string) {
    const bookings = await bookingRepository.getByTravelFile(agencyId, travelFileId);
    return bookings;
  },

  // ─── Payments (simple paid/unpaid, especially for standalone bookings) ────
  async addPayment(agencyId: string, id: string, userId: string, payment: Record<string, unknown>) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');

    await paymentService.record(agencyId, userId, {
      bookingId: id,
      customerId: booking.customerId.toString(),
      amount: Number(payment.amount),
      method: payment.method as any,
      reference: payment.reference as string,
      notes: (payment.note || payment.notes) as string,
      // Staff recording it directly have confirmed it themselves.
      autoVerify: payment.autoVerify !== false,
    });

    return bookingRepository.findOne({ _id: id, agencyId });
  },

  async listPayments(agencyId: string, id: string) {
    const booking = await bookingRepository.findOne({ _id: id, agencyId });
    if (!booking) throw new NotFoundError('Booking');
    return paymentRepository.listForBooking(agencyId, id);
  },
};
