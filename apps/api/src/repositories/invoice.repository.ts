import { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';
import { Invoice, IInvoice } from '../models/Invoice';
import { BaseRepository } from './base.repository';

interface InvoiceFilter {
  agencyId: string;
  status?: string;
  customerId?: string;
  search?: string;
  page: number;
  limit: number;
}

class InvoiceRepository extends BaseRepository<IInvoice> {
  constructor() {
    super(Invoice);
  }

  async search({ agencyId, status, customerId, search, page, limit }: InvoiceFilter) {
    const filter: FilterQuery<IInvoice> = { agencyId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };
    return this.paginate(filter, page, limit, { createdAt: -1 }, ['customerId', 'bookingId']);
  }

  async getFinancialSummary(agencyId: string) {
    return Invoice.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId) } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: '$outstandingBalance' },
          totalInvoiced: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async getMonthlyRevenue(agencyId: string, year: number) {
    return Invoice.aggregate([
      {
        $match: {
          agencyId: new mongoose.Types.ObjectId(agencyId),
          issuedAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
        },
      },
      {
        $group: {
          _id: { $month: '$issuedAt' },
          revenue: { $sum: '$amountPaid' },
          outstanding: { $sum: '$outstandingBalance' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async markOverdue(): Promise<void> {
    await Invoice.updateMany(
      { dueDate: { $lt: new Date() }, status: { $in: ['sent', 'partially_paid'] } },
      { $set: { status: 'overdue' } }
    );
  }
}

export const invoiceRepository = new InvoiceRepository();
