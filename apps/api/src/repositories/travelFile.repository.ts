import mongoose from 'mongoose';
import { TravelFile, ITravelFile } from '../models/TravelFile';
import { BaseRepository } from './base.repository';

class TravelFileRepository extends BaseRepository<ITravelFile> {
  constructor() {
    super(TravelFile);
  }

  async search(params: {
    agencyId: string;
    search?: string;
    status?: string;
    travelType?: string;
    customerId?: string;
    page: number;
    limit: number;
  }) {
    const filter: mongoose.FilterQuery<ITravelFile> = {
      agencyId: params.agencyId,
    };
    if (params.status) filter.status = params.status;
    if (params.travelType) filter.travelType = params.travelType;
    if (params.customerId) filter.customerId = params.customerId;
    if (params.search) {
      filter.$or = [
        { fileNumber: { $regex: params.search, $options: 'i' } },
        { destination: { $regex: params.search, $options: 'i' } },
        { departureGroup: { $regex: params.search, $options: 'i' } },
      ];
    }
    return this.paginate(filter, params.page, params.limit, { createdAt: -1 }, [
      'customerId',
      'assignedConsultant',
      'assignedVisaOfficer',
      'packageId',
    ]);
  }

  async findFullById(agencyId: string, id: string) {
    return TravelFile.findOne({ _id: id, agencyId })
      .populate('customerId')
      .populate('assignedConsultant', 'firstName lastName email role')
      .populate('assignedVisaOfficer', 'firstName lastName email role')
      .populate('packageId', 'title category pricing')
      .populate('bookingId')
      .populate('visaApplicationId')
      .populate('invoiceIds')
      .populate('documentIds')
      .populate('timeline.performedBy', 'firstName lastName')
      .populate('tasks.assignedTo', 'firstName lastName')
      .populate('notes.createdBy', 'firstName lastName')
      .exec();
  }

  async statusSummary(agencyId: string) {
    return TravelFile.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }
}

export const travelFileRepository = new TravelFileRepository();
