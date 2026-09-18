import mongoose, { FilterQuery } from 'mongoose';
import { Payment, IPayment } from '../models/Payment';
import { BaseRepository } from './base.repository';

interface PaymentFilter {
  agencyId: string;
  status?: string;
  travelFileId?: string;
  invoiceId?: string;
  visaApplicationId?: string;
  customerId?: string;
  groupId?: string;
  page: number;
  limit: number;
}

class PaymentRepository extends BaseRepository<IPayment> {
  constructor() {
    super(Payment);
  }

  async search({ agencyId, status, travelFileId, invoiceId, visaApplicationId, customerId, groupId, page, limit }: PaymentFilter) {
    const filter: FilterQuery<IPayment> = { agencyId };
    if (status) filter.status = status;
    if (travelFileId) filter.travelFileId = travelFileId;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (visaApplicationId) filter.visaApplicationId = visaApplicationId;
    if (customerId) filter.customerId = customerId;
    if (groupId) filter.groupId = groupId;
    return this.paginate(filter, page, limit, { paidAt: -1 }, ['customerId', 'recordedBy', 'verifiedBy', 'travelFileId']);
  }

  /** Sum of verified payments — the only figure that counts as money received. */
  async sumVerified(match: FilterQuery<IPayment>): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { ...match, status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total || 0;
  }

  async sumVerifiedForTravelFile(travelFileId: string | mongoose.Types.ObjectId): Promise<number> {
    return this.sumVerified({ travelFileId: new mongoose.Types.ObjectId(travelFileId.toString()) });
  }

  async sumVerifiedForInvoice(invoiceId: string | mongoose.Types.ObjectId): Promise<number> {
    return this.sumVerified({ invoiceId: new mongoose.Types.ObjectId(invoiceId.toString()) });
  }

  async sumVerifiedForVisa(visaApplicationId: string | mongoose.Types.ObjectId): Promise<number> {
    return this.sumVerified({ visaApplicationId: new mongoose.Types.ObjectId(visaApplicationId.toString()) });
  }

  async sumVerifiedForBooking(bookingId: string | mongoose.Types.ObjectId): Promise<number> {
    return this.sumVerified({ bookingId: new mongoose.Types.ObjectId(bookingId.toString()) });
  }

  async listForVisa(agencyId: string, visaApplicationId: string) {
    return Payment.find({ agencyId, visaApplicationId })
      .sort({ paidAt: -1 })
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .lean();
  }

  async listForBooking(agencyId: string, bookingId: string) {
    return Payment.find({ agencyId, bookingId })
      .sort({ paidAt: -1 })
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .lean();
  }

  async listForTravelFile(agencyId: string, travelFileId: string) {
    return Payment.find({ agencyId, travelFileId })
      .sort({ paidAt: -1 })
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .lean();
  }

  async listForInvoice(agencyId: string, invoiceId: string) {
    return Payment.find({ agencyId, invoiceId })
      .sort({ paidAt: -1 })
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .lean();
  }

  async listForGroup(agencyId: string, groupId: string) {
    return Payment.find({ agencyId, groupId })
      .sort({ paidAt: -1 })
      .populate('customerId', 'firstName lastName fullName')
      .populate('travelFileId', 'fileNumber')
      .lean();
  }

  async countPending(agencyId: string): Promise<number> {
    return Payment.countDocuments({ agencyId, status: 'pending' });
  }
}

export const paymentRepository = new PaymentRepository();
