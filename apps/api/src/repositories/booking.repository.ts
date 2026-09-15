import mongoose, { FilterQuery } from 'mongoose';
import { Booking, IBooking, BookingStatus, BookingType } from '../models/Booking';
import { BaseRepository } from './base.repository';

interface BookingFilter {
  agencyId: string;
  search?: string;
  status?: BookingStatus;
  bookingType?: BookingType;
  travelFileId?: string;
  customerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page: number;
  limit: number;
}

class BookingRepository extends BaseRepository<IBooking> {
  constructor() {
    super(Booking);
  }

  async search({ agencyId, search, status, bookingType, travelFileId, customerId, startDateFrom, startDateTo, page, limit }: BookingFilter) {
    const filter: FilterQuery<IBooking> = { agencyId };
    if (status) filter.status = status;
    if (bookingType) filter.bookingType = bookingType;
    if (travelFileId) filter.travelFileId = travelFileId;
    if (customerId) filter.customerId = customerId;
    if (startDateFrom || startDateTo) {
      filter.startDate = {};
      if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
    }
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
        { 'details.bookingReference': { $regex: search, $options: 'i' } },
        { 'details.pnr': { $regex: search, $options: 'i' } },
      ];
    }
    return this.paginate(filter, page, limit, { createdAt: -1 }, [
      { path: 'customerId', select: 'firstName lastName fullName phone' },
      { path: 'travelFileId', select: 'fileNumber travelType destination status' },
    ] as any);
  }

  async getByTravelFile(agencyId: string, travelFileId: string) {
    return Booking.find({ agencyId, travelFileId })
      .sort({ createdAt: 1 })
      .populate('customerId', 'firstName lastName fullName')
      .lean();
  }

  async nextSequence(agencyId: string): Promise<number> {
    // Count all bookings for this agency atomically — safe under concurrent creates
    const count = await Booking.countDocuments({ agencyId });
    return count + 1;
  }

  async getStatusCounts(agencyId: string) {
    return Booking.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }

  async getTypeCounts(agencyId: string) {
    return Booking.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId) } },
      { $group: { _id: '$bookingType', count: { $sum: 1 } } },
    ]);
  }
}

export const bookingRepository = new BookingRepository();
