import { FilterQuery } from 'mongoose';
import { Booking, IBooking, BookingStatus } from '../models/Booking';
import { BaseRepository } from './base.repository';

interface BookingFilter {
  agencyId: string;
  search?: string;
  status?: BookingStatus;
  customerId?: string;
  assignedTo?: string;
  bookingType?: string;
  page: number;
  limit: number;
}

class BookingRepository extends BaseRepository<IBooking> {
  constructor() {
    super(Booking);
  }

  async search({ agencyId, search, status, customerId, assignedTo, bookingType, page, limit }: BookingFilter) {
    const filter: FilterQuery<IBooking> = { agencyId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (bookingType) filter.bookingType = bookingType;
    if (search) filter.referenceNumber = { $regex: search, $options: 'i' };
    return this.paginate(filter, page, limit, { createdAt: -1 }, ['customerId', 'packageId', 'assignedTo']);
  }

  async getRevenueByMonth(agencyId: string, year: number) {
    return Booking.aggregate([
      {
        $match: {
          agencyId: { $toString: agencyId },
          status: { $in: ['confirmed', 'in_progress', 'completed'] },
          createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getStatusCounts(agencyId: string) {
    return Booking.aggregate([
      { $match: { agencyId: { $toString: agencyId } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }
}

export const bookingRepository = new BookingRepository();
