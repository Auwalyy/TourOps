import { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';
import { Receipt, IReceipt } from '../models/Receipt';
import { BaseRepository } from './base.repository';

class ReceiptRepository extends BaseRepository<IReceipt> {
  constructor() { super(Receipt); }

  async search({ agencyId, customerId, search, page, limit }: {
    agencyId: string; customerId?: string; search?: string; page: number; limit: number;
  }) {
    const filter: FilterQuery<IReceipt> = { agencyId };
    if (customerId) filter.customerId = customerId;
    if (search) filter.receiptNumber = { $regex: search, $options: 'i' };
    return this.paginate(filter, page, limit, { createdAt: -1 }, [
      'customerId', 'invoiceId', 'issuedBy',
    ]);
  }

  async sumByAgency(agencyId: string) {
    return Receipt.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId) } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
  }
}

export const receiptRepository = new ReceiptRepository();
