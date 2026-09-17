import { invoiceRepository } from '../repositories/invoice.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { paymentService } from './payment.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams, generateInvoiceNumber } from '../utils/helpers';
import { generateInvoicePDF, generateReceiptPDF } from './pdf.service';
import { Agency } from '../models/Agency';
import { Customer } from '../models/Customer';
import { Payment, IPayment } from '../models/Payment';
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

  /**
   * Delegates to the Payment collection — the single source of truth. The
   * invoice's cached amountPaid/outstandingBalance are re-derived from
   * verified payments rather than being incremented here.
   */
  async recordPayment(agencyId: string, id: string, userId: string, payment: Record<string, unknown>) {
    const invoice = await invoiceRepository.findOne({ _id: id, agencyId });
    if (!invoice) throw new NotFoundError('Invoice');

    const amount = Number(payment.amount);
    const alreadyReceived = await paymentRepository.sumVerifiedForInvoice(invoice._id as mongoose.Types.ObjectId);
    if (payment.autoVerify !== false && alreadyReceived + amount > invoice.totalAmount) {
      throw new AppError('Payment exceeds invoice total', 400);
    }

    await paymentService.record(agencyId, userId, {
      invoiceId: id,
      customerId: invoice.customerId.toString(),
      amount,
      method: payment.method as any,
      reference: payment.reference as string,
      proofUrl: payment.proofUrl as string,
      notes: payment.notes as string,
      paidAt: payment.paidAt ? new Date(payment.paidAt as string) : undefined,
      // Staff recording against an invoice have confirmed the money themselves.
      autoVerify: payment.autoVerify !== false,
    });

    return invoiceRepository.findOne({ _id: id, agencyId });
  },

  async listPayments(agencyId: string, id: string) {
    const invoice = await invoiceRepository.findOne({ _id: id, agencyId });
    if (!invoice) throw new NotFoundError('Invoice');
    return paymentRepository.listForInvoice(agencyId, id);
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

  async generateReceiptPDF(agencyId: string, id: string, paymentId?: string): Promise<Buffer> {
    const [invoice, agency] = await Promise.all([
      invoiceRepository.findOne({ _id: id, agencyId }),
      Agency.findById(agencyId),
    ]);
    if (!invoice) throw new NotFoundError('Invoice');
    if (!agency) throw new NotFoundError('Agency');

    const filter: Record<string, unknown> = { agencyId, invoiceId: id, status: 'verified' };
    if (paymentId) filter._id = paymentId;
    const payments = (await Payment.find(filter).sort({ paidAt: 1 })) as IPayment[];

    return generateReceiptPDF(invoice, agency, payments, paymentId);
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
