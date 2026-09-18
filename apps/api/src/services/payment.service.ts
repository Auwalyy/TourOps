import mongoose from 'mongoose';
import { Payment, PaymentMethod } from '../models/Payment';
import { paymentRepository } from '../repositories/payment.repository';
import { TravelFile } from '../models/TravelFile';
import { Invoice } from '../models/Invoice';
import { VisaApplication } from '../models/VisaApplication';
import { notificationService } from './notification.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

interface RecordPaymentInput {
  customerId?: string;
  travelFileId?: string;
  invoiceId?: string;
  visaApplicationId?: string;
  groupId?: string;
  amount: number;
  method?: PaymentMethod;
  currency?: string;
  reference?: string;
  proofUrl?: string;
  notes?: string;
  paidAt?: Date;
  /** Staff recording a payment they've physically confirmed can skip the queue. */
  autoVerify?: boolean;
}

async function pushTravelFileTimeline(
  travelFileId: mongoose.Types.ObjectId | string,
  userId: string,
  action: string,
  description: string,
  referenceId?: mongoose.Types.ObjectId
) {
  await TravelFile.findByIdAndUpdate(travelFileId, {
    $push: {
      timeline: {
        action,
        description,
        performedBy: new mongoose.Types.ObjectId(userId),
        performedAt: new Date(),
        source: 'payment',
        referenceId,
      },
    },
  });
}

export const paymentService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return paymentRepository.search({
      agencyId,
      status: query.status as string,
      travelFileId: query.travelFileId as string,
      invoiceId: query.invoiceId as string,
      visaApplicationId: query.visaApplicationId as string,
      customerId: query.customerId as string,
      groupId: query.groupId as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const payment = await Payment.findOne({ _id: id, agencyId })
      .populate('customerId', 'firstName lastName fullName phone email')
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .populate('travelFileId', 'fileNumber destination');
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  },

  async listForTravelFile(agencyId: string, travelFileId: string) {
    return paymentRepository.listForTravelFile(agencyId, travelFileId);
  },

  async listForInvoice(agencyId: string, invoiceId: string) {
    return paymentRepository.listForInvoice(agencyId, invoiceId);
  },

  async listPending(agencyId: string) {
    return Payment.find({ agencyId, status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('customerId', 'firstName lastName fullName phone')
      .populate('travelFileId', 'fileNumber destination')
      .populate('recordedBy', 'firstName lastName')
      .lean();
  },

  /**
   * Records a money movement. Defaults to `pending` — the real Kano flow is a
   * customer paying into a bank and sending a teller photo, which a human must
   * eyeball before it counts. Staff recording a confirmed payment pass
   * autoVerify to skip the queue.
   */
  async record(agencyId: string, userId: string, input: RecordPaymentInput) {
    const amount = Number(input.amount);
    if (!amount || amount <= 0) throw new AppError('Payment amount must be greater than zero', 400);
    if (!input.travelFileId && !input.invoiceId && !input.visaApplicationId) {
      throw new AppError('A payment must be attached to a travel file, an invoice or a visa application', 400);
    }

    // Derive customer from whichever parent was supplied.
    let customerId = input.customerId;
    let travelFile = null;
    if (input.travelFileId) {
      travelFile = await TravelFile.findOne({ _id: input.travelFileId, agencyId });
      if (!travelFile) throw new NotFoundError('Travel File');
      customerId = customerId || travelFile.customerId.toString();
    }
    if (!customerId && input.invoiceId) {
      const invoice = await Invoice.findOne({ _id: input.invoiceId, agencyId });
      if (!invoice) throw new NotFoundError('Invoice');
      customerId = invoice.customerId.toString();
    }
    if (!customerId && input.visaApplicationId) {
      const visa = await VisaApplication.findOne({ _id: input.visaApplicationId, agencyId });
      if (!visa) throw new NotFoundError('Visa Application');
      customerId = visa.customerId.toString();
    }
    if (!customerId) throw new AppError('Could not determine the customer for this payment', 400);

    const verified = input.autoVerify === true;
    const payment = await Payment.create({
      agencyId,
      customerId,
      travelFileId: input.travelFileId,
      invoiceId: input.invoiceId,
      visaApplicationId: input.visaApplicationId,
      groupId: input.groupId || travelFile?.groupId,
      amount,
      currency: input.currency || 'NGN',
      method: input.method || 'cash',
      reference: input.reference,
      proofUrl: input.proofUrl,
      notes: input.notes,
      status: verified ? 'verified' : 'pending',
      recordedBy: new mongoose.Types.ObjectId(userId),
      verifiedBy: verified ? new mongoose.Types.ObjectId(userId) : undefined,
      verifiedAt: verified ? new Date() : undefined,
      paidAt: input.paidAt || new Date(),
    });

    if (verified) await this.recalculate(payment.travelFileId, payment.invoiceId, payment.visaApplicationId);

    if (input.travelFileId) {
      await pushTravelFileTimeline(
        input.travelFileId,
        userId,
        verified ? 'Payment Recorded' : 'Payment Submitted',
        verified
          ? `Payment of ${amount.toLocaleString()} recorded`
          : `Payment of ${amount.toLocaleString()} submitted — awaiting verification`,
        payment._id as mongoose.Types.ObjectId
      );
    }

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: verified ? 'Payment Recorded' : 'Payment Awaiting Verification',
      message: verified
        ? `Payment of ${amount.toLocaleString()} was recorded`
        : `Payment of ${amount.toLocaleString()} needs verification`,
      type: 'payment',
      referenceId: payment._id as mongoose.Types.ObjectId,
      referenceModel: 'Payment',
    });

    return payment;
  },

  async verify(agencyId: string, id: string, userId: string) {
    const payment = await Payment.findOne({ _id: id, agencyId });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status === 'verified') throw new AppError('Payment is already verified', 400);

    payment.status = 'verified';
    payment.verifiedBy = new mongoose.Types.ObjectId(userId);
    payment.verifiedAt = new Date();
    payment.rejectionReason = undefined;
    await payment.save();

    await this.recalculate(payment.travelFileId, payment.invoiceId, payment.visaApplicationId);

    if (payment.travelFileId) {
      await pushTravelFileTimeline(
        payment.travelFileId,
        userId,
        'Payment Verified',
        `Payment of ${payment.amount.toLocaleString()} verified`,
        payment._id as mongoose.Types.ObjectId
      );
    }

    return payment;
  },

  async reject(agencyId: string, id: string, userId: string, reason: string) {
    const payment = await Payment.findOne({ _id: id, agencyId });
    if (!payment) throw new NotFoundError('Payment');
    if (!reason?.trim()) throw new AppError('A rejection reason is required', 400);

    const wasVerified = payment.status === 'verified';
    payment.status = 'rejected';
    payment.rejectionReason = reason.trim();
    payment.verifiedBy = new mongoose.Types.ObjectId(userId);
    payment.verifiedAt = new Date();
    await payment.save();

    // A previously-verified payment being reversed must come back out of the totals.
    if (wasVerified) await this.recalculate(payment.travelFileId, payment.invoiceId, payment.visaApplicationId);

    if (payment.travelFileId) {
      await pushTravelFileTimeline(
        payment.travelFileId,
        userId,
        'Payment Rejected',
        `Payment of ${payment.amount.toLocaleString()} rejected — ${reason.trim()}`,
        payment._id as mongoose.Types.ObjectId
      );
    }

    return payment;
  },

  async update(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const payment = await Payment.findOne({ _id: id, agencyId });
    if (!payment) throw new NotFoundError('Payment');

    const { amount, method, reference, notes, paidAt, proofUrl } = data as any;
    if (amount !== undefined) payment.amount = Number(amount);
    if (method !== undefined) payment.method = method;
    if (reference !== undefined) payment.reference = reference;
    if (notes !== undefined) payment.notes = notes;
    if (proofUrl !== undefined) payment.proofUrl = proofUrl;
    if (paidAt !== undefined) payment.paidAt = new Date(paidAt);
    await payment.save();

    if (payment.status === 'verified') await this.recalculate(payment.travelFileId, payment.invoiceId, payment.visaApplicationId);
    return payment;
  },

  async delete(agencyId: string, id: string) {
    const payment = await Payment.findOne({ _id: id, agencyId });
    if (!payment) throw new NotFoundError('Payment');
    const { travelFileId, invoiceId } = payment;
    await payment.deleteOne();
    await this.recalculate(travelFileId, invoiceId);
    return payment;
  },

  /**
   * Re-derives the cached amountPaid/outstandingBalance on whichever parents
   * this payment touches. Every write path above funnels through here so the
   * cached figures can never drift from the Payment collection.
   */
  async recalculate(
    travelFileId?: mongoose.Types.ObjectId,
    invoiceId?: mongoose.Types.ObjectId,
    visaApplicationId?: mongoose.Types.ObjectId
  ) {
    if (travelFileId) {
      const total = await paymentRepository.sumVerifiedForTravelFile(travelFileId);
      await TravelFile.findByIdAndUpdate(travelFileId, { $set: { amountPaid: total } });
    }
    if (visaApplicationId) {
      const total = await paymentRepository.sumVerifiedForVisa(visaApplicationId);
      await VisaApplication.findByIdAndUpdate(visaApplicationId, { $set: { amountPaid: total } });
    }
    if (invoiceId) {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        const total = await paymentRepository.sumVerifiedForInvoice(invoiceId);
        const net = Math.max(0, total - (invoice.totalRefunded || 0));
        const outstandingBalance = Math.max(0, invoice.totalAmount - net);
        let status = invoice.status;
        if (invoice.status !== 'cancelled' && invoice.status !== 'refunded') {
          if (outstandingBalance <= 0) status = 'paid';
          else if (net > 0) status = 'partially_paid';
          else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) status = 'overdue';
          else status = invoice.status === 'draft' ? 'draft' : 'sent';
        }
        await Invoice.findByIdAndUpdate(invoiceId, {
          $set: { amountPaid: net, outstandingBalance, status },
        });
      }
    }
  },
};
