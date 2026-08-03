import { Invoice } from '../models/Invoice';
import { Booking } from '../models/Booking';
import { Customer } from '../models/Customer';
import { invoiceRepository } from '../repositories/invoice.repository';
import mongoose from 'mongoose';

export const reportService = {
  async getRevenueReport(agencyId: string, startDate: Date, endDate: Date) {
    return Invoice.aggregate([
      {
        $match: {
          agencyId: new mongoose.Types.ObjectId(agencyId),
          issuedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$issuedAt' } },
          revenue: { $sum: '$amountPaid' },
          outstanding: { $sum: '$outstandingBalance' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  },

  async getBookingReport(agencyId: string, startDate: Date, endDate: Date) {
    return Booking.aggregate([
      {
        $match: {
          agencyId: new mongoose.Types.ObjectId(agencyId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
        },
      },
    ]);
  },

  async getOutstandingReport(agencyId: string) {
    return Invoice.find({
      agencyId,
      outstandingBalance: { $gt: 0 },
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
    })
      .populate('customerId', 'firstName lastName email phone')
      .sort({ dueDate: 1 })
      .lean();
  },

  async exportInvoicesCSV(agencyId: string, startDate: Date, endDate: Date): Promise<string> {
    const invoices = await Invoice.find({
      agencyId,
      issuedAt: { $gte: startDate, $lte: endDate },
    })
      .populate('customerId', 'firstName lastName email')
      .lean();

    const header = 'Invoice Number,Customer,Email,Total,Paid,Outstanding,Status,Date\n';
    const rows = invoices.map((inv) => {
      const customer = inv.customerId as any;
      return [
        inv.invoiceNumber,
        `${customer?.firstName} ${customer?.lastName}`,
        customer?.email,
        inv.totalAmount,
        inv.amountPaid,
        inv.outstandingBalance,
        inv.status,
        new Date(inv.issuedAt).toLocaleDateString(),
      ].join(',');
    });

    return header + rows.join('\n');
  },

  async exportBookingsCSV(agencyId: string, startDate: Date, endDate: Date): Promise<string> {
    const bookings = await Booking.find({
      agencyId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('customerId', 'firstName lastName email')
      .lean();

    const header = 'Reference,Customer,Type,Status,Total,Travel Date,Created\n';
    const rows = bookings.map((b) => {
      const customer = b.customerId as any;
      return [
        b.referenceNumber,
        `${customer?.firstName} ${customer?.lastName}`,
        b.bookingType,
        b.status,
        b.totalAmount,
        b.travelDate ? new Date(b.travelDate).toLocaleDateString() : '',
        new Date(b.createdAt).toLocaleDateString(),
      ].join(',');
    });

    return header + rows.join('\n');
  },
};
