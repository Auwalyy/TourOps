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
    priority?: string;
    page: number;
    limit: number;
  }) {
    const filter: mongoose.FilterQuery<ITravelFile> = { agencyId: params.agencyId };
    if (params.status) filter.status = params.status;
    if (params.travelType) filter.travelType = params.travelType;
    if (params.customerId) filter.customerId = params.customerId;
    if (params.priority) filter.priority = params.priority;
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
      .populate('packageId', 'title category pricing destinations duration')
      .populate('bookingId')
      .populate('visaApplicationId')
      .populate('invoiceIds')
      .populate('documentIds')
      .populate('timeline.performedBy', 'firstName lastName')
      .populate('tasks.assignedTo', 'firstName lastName')
      .populate('tasks.createdBy', 'firstName lastName')
      .populate('notes.createdBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('physicalFile.passportReceivedBy', 'firstName lastName')
      .populate('physicalFile.passportReturnedBy', 'firstName lastName')
      .populate('physicalFile.staffResponsible', 'firstName lastName')
      .exec();
  }

  async findByCustomer(agencyId: string, customerId: string) {
    return TravelFile.find({ agencyId, customerId })
      .sort({ createdAt: -1 })
      .populate('packageId', 'title')
      .lean();
  }

  async statusSummary(agencyId: string) {
    return TravelFile.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }

  async attentionRequired(agencyId: string) {
    const now = new Date();
    return TravelFile.find({
      agencyId,
      status: { $nin: ['completed', 'cancelled', 'archived'] },
      $or: [
        { priority: { $in: ['high', 'urgent'] } },
        { 'tasks.dueDate': { $lt: now }, 'tasks.status': { $nin: ['completed', 'cancelled'] } },
        { departureDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
      ],
    })
      .sort({ priority: -1, departureDate: 1 })
      .limit(20)
      .populate('customerId', 'firstName lastName phone')
      .lean();
  }
}

export const travelFileRepository = new TravelFileRepository();
