import { invoiceRepository } from '../repositories/invoice.repository';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams, generateInvoiceNumber } from '../utils/helpers';
import { generateInvoicePDF } from './pdf.service';
import { Agency } from '../models/Agency';
import { Customer } from '../models/Customer';
import { IPaymentRecord } from '../models/Invoice';
import { notificationService } from './notification.service';
import mongoose from 'mongoose';

export const invoiceService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return invoiceRepository.search({
      agencyId,
      status: query.status as string,
      customerId: query.customerId as string,
      search: query.search as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const invoice = await invoiceRepository.findOne({ _id: id, agencyId });
    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  },

  async create(agencyId: string, data: Record<string, unknown>) {
    const invoiceNumber = generateInvoiceNumber();

    // Auto-create customer if name/email provided instead of selecting existing
    let customerId = data.customerId;
    if (!customerId && data.customerFirstName) {
      const newCustomer = await Customer.create({
        agencyId,
        firstName: data.customerFirstName,
        lastName: data.customerLastName,
        email: data.customerEmail,
        status: 'active',
      });
      customerId = newCustomer._id;
    }

    const { customerMode, customerFirstName, customerLastName, customerEmail, ...invoiceData } = data as any;
    const lineItems = invoiceData.lineItems as Array<{ description: string; quantity: number; unitPrice: number }>;
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxRate = (invoiceData.taxRate as number) || 0;
    const discount = (invoiceData.discount as number) || 0;
    const tax = subtotal * (taxRate / 100);
    const totalAmount = subtotal + tax - discount;

    return invoiceRepository.create({
      ...invoiceData,
      customerId,
      agencyId,
      invoiceNumber,
      subtotal,
      tax,
      totalAmount,
      outstandingBalance: totalAmount,
      lineItems: lineItems.map((item) => ({ ...item, total: item.quantity * item.unitPrice })),
    } as any);
  },

  async recordPayment(agencyId: string, id: string, userId: string, payment: Omit<IPaymentRecord, 'recordedBy'>) {
    const invoice = await invoiceRepository.findOne({ _id: id, agencyId });
    if (!invoice) throw new NotFoundError('Invoice');

    const newAmountPaid = invoice.amountPaid + payment.amount;
    if (newAmountPaid > invoice.totalAmount) {
      throw new AppError('Payment exceeds invoice total', 400);
    }

    const outstandingBalance = invoice.totalAmount - newAmountPaid;
    const status = outstandingBalance === 0 ? 'paid' : 'partially_paid';

    const updated = await invoiceRepository.updateById(id, {
      amountPaid: newAmountPaid,
      outstandingBalance,
      status,
      $push: { payments: { ...payment, recordedBy: userId } },
    });

    if (outstandingBalance > 0) {
      await notificationService.notifyAgencyStaff(
        new mongoose.Types.ObjectId(agencyId),
        {
          title: 'Payment Received',
          message: `Payment of ${payment.amount} recorded on invoice ${invoice.invoiceNumber}`,
          type: 'payment',
          referenceId: invoice._id as mongoose.Types.ObjectId,
          referenceModel: 'Invoice',
        }
      );
    }

    return updated;
  },

  async generatePDF(agencyId: string, id: string): Promise<Buffer> {
    const [invoice, agency] = await Promise.all([
      invoiceRepository.findOne({ _id: id, agencyId }),
      Agency.findById(agencyId),
    ]);
    if (!invoice) throw new NotFoundError('Invoice');
    if (!agency) throw new NotFoundError('Agency');
    return generateInvoicePDF(invoice, agency);
  },

  async getFinancialSummary(agencyId: string) {
    return invoiceRepository.getFinancialSummary(agencyId);
  },

  async getMonthlyRevenue(agencyId: string, year: number) {
    return invoiceRepository.getMonthlyRevenue(agencyId, year);
  },

  async markOverdue() {
    return invoiceRepository.markOverdue();
  },
};
