import { FilterQuery } from 'mongoose';
import { VisaApplication, IVisaApplication, VisaStatus } from '../models/VisaApplication';
import { BaseRepository } from './base.repository';

interface VisaFilter {
  agencyId: string;
  search?: string;
  status?: VisaStatus;
  customerId?: string;
  assignedOfficer?: string;
  destinationCountry?: string;
  paymentStatus?: string;
  page: number;
  limit: number;
}

class VisaApplicationRepository extends BaseRepository<IVisaApplication> {
  constructor() {
    super(VisaApplication);
  }

  async search({ agencyId, search, status, customerId, assignedOfficer, destinationCountry, paymentStatus, page, limit }: VisaFilter) {
    const filter: FilterQuery<IVisaApplication> = { agencyId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (assignedOfficer) filter.assignedOfficer = assignedOfficer;
    if (destinationCountry) filter.destinationCountry = { $regex: destinationCountry, $options: 'i' };
    if (search) filter.referenceNumber = { $regex: search, $options: 'i' };

    // Paid/unpaid is derived from the fee vs. what's actually been received, so
    // it's expressed as a comparison between the two fields rather than stored.
    if (paymentStatus === 'unpaid') {
      filter.fees = { $gt: 0 };
      filter.$or = [{ amountPaid: { $lte: 0 } }, { amountPaid: { $exists: false } }];
    } else if (paymentStatus === 'paid') {
      filter.fees = { $gt: 0 };
      filter.$expr = { $gte: [{ $ifNull: ['$amountPaid', 0] }, '$fees'] };
    } else if (paymentStatus === 'partially_paid') {
      filter.fees = { $gt: 0 };
      filter.$expr = {
        $and: [
          { $gt: [{ $ifNull: ['$amountPaid', 0] }, 0] },
          { $lt: [{ $ifNull: ['$amountPaid', 0] }, '$fees'] },
        ],
      };
    } else if (paymentStatus === 'outstanding') {
      // Anything still owing money — the list a finance officer actually chases.
      filter.fees = { $gt: 0 };
      filter.$expr = { $lt: [{ $ifNull: ['$amountPaid', 0] }, '$fees'] };
    }

    return this.paginate(filter, page, limit, { createdAt: -1 }, ['customerId', 'assignedOfficer']);
  }

  async getUpcomingAppointments(agencyId: string, days = 7): Promise<IVisaApplication[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return VisaApplication.find({
      agencyId,
      'appointment.date': { $gte: now, $lte: future },
      status: 'appointment_scheduled',
    })
      .populate('customerId assignedOfficer')
      .sort({ 'appointment.date': 1 })
      .exec();
  }

  async getStatusCounts(agencyId: string) {
    return VisaApplication.aggregate([
      { $match: { agencyId: { $toString: agencyId } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }
}

export const visaApplicationRepository = new VisaApplicationRepository();
