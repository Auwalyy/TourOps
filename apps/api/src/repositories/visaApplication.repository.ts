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
  page: number;
  limit: number;
}

class VisaApplicationRepository extends BaseRepository<IVisaApplication> {
  constructor() {
    super(VisaApplication);
  }

  async search({ agencyId, search, status, customerId, assignedOfficer, destinationCountry, page, limit }: VisaFilter) {
    const filter: FilterQuery<IVisaApplication> = { agencyId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (assignedOfficer) filter.assignedOfficer = assignedOfficer;
    if (destinationCountry) filter.destinationCountry = { $regex: destinationCountry, $options: 'i' };
    if (search) filter.referenceNumber = { $regex: search, $options: 'i' };
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
