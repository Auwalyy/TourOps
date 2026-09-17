import mongoose from 'mongoose';
import { Refund } from '../models/Refund';
import { Invoice } from '../models/Invoice';
import { TravelFile } from '../models/TravelFile';
import { paymentRepository } from '../repositories/payment.repository';
import { paymentService } from './payment.service';
import { notificationService } from './notification.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

export const refundService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    const filter: Record<string, unknown> = { agencyId };
    if (query.status) filter.status = query.status;
    if (query.customerId) filter.customerId = query.customerId;
    if (query.invoiceId) filter.invoiceId = query.invoiceId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Refund.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'firstName lastName fullName phone')
        .populate('invoiceId', 'invoiceNumber totalAmount amountPaid')
        .populate('requestedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .lean(),
      Refund.countDocuments(filter),
    ]);
    return { data, total };
  },

  async getById(agencyId: string, id: string) {
    const refund = await Refund.findOne({ _id: id, agencyId })
      .populate('customerId', 'firstName lastName fullName phone email')
      .populate('invoiceId', 'invoiceNumber totalAmount amountPaid outstandingBalance')
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
    if (!refund) throw new NotFoundError('Refund');
    return refund;
  },

  async request(agencyId: string, userId: string, data: Record<string, unknown>) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new AppError('Refund amount must be greater than zero', 400);
    if (!data.reason || !String(data.reason).trim()) throw new AppError('A refund reason is required', 400);

    let customerId = data.customerId as string | undefined;
    let travelFileId = data.travelFileId as string | undefined;

    if (data.invoiceId) {
      const invoice = await Invoice.findOne({ _id: data.invoiceId as string, agencyId });
      if (!invoice) throw new NotFoundError('Invoice');
      customerId = customerId || invoice.customerId.toString();

      // Can't refund more than has actually been received and not already refunded.
      const received = await paymentRepository.sumVerifiedForInvoice(invoice._id as mongoose.Types.ObjectId);
      const refundable = received - (invoice.totalRefunded || 0);
      if (amount > refundable) {
        throw new AppError(`Refund exceeds refundable amount (${refundable.toLocaleString()})`, 400);
      }
    }

    if (!customerId && travelFileId) {
      const file = await TravelFile.findOne({ _id: travelFileId, agencyId });
      if (!file) throw new NotFoundError('Travel File');
      customerId = file.customerId.toString();
    }
    if (!customerId) throw new AppError('Could not determine the customer for this refund', 400);

    const refund = await Refund.create({
      agencyId,
      customerId,
      invoiceId: data.invoiceId,
      travelFileId,
      amount,
      currency: (data.currency as string) || 'NGN',
      reason: String(data.reason).trim(),
      method: (data.method as string) || 'bank_transfer',
      status: 'requested',
      requestedBy: new mongoose.Types.ObjectId(userId),
      notes: data.notes as string,
    });

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: 'Refund Requested',
      message: `A refund of ${amount.toLocaleString()} has been requested`,
      type: 'payment',
      referenceId: refund._id as mongoose.Types.ObjectId,
      referenceModel: 'Refund',
    });

    return refund;
  },

  async approve(agencyId: string, id: string, userId: string) {
    const refund = await Refund.findOne({ _id: id, agencyId });
    if (!refund) throw new NotFoundError('Refund');
    if (refund.status !== 'requested') throw new AppError(`Cannot approve a refund that is ${refund.status}`, 400);

    refund.status = 'approved';
    refund.approvedBy = new mongoose.Types.ObjectId(userId);
    refund.approvedAt = new Date();
    await refund.save();
    return refund;
  },

  async reject(agencyId: string, id: string, userId: string, reason: string) {
    const refund = await Refund.findOne({ _id: id, agencyId });
    if (!refund) throw new NotFoundError('Refund');
    if (refund.status === 'completed') throw new AppError('A completed refund cannot be rejected', 400);
    if (!reason?.trim()) throw new AppError('A rejection reason is required', 400);

    refund.status = 'rejected';
    refund.rejectionReason = reason.trim();
    refund.approvedBy = new mongoose.Types.ObjectId(userId);
    refund.approvedAt = new Date();
    await refund.save();
    return refund;
  },

  /** Money has actually left the account — now the books move. */
  async complete(agencyId: string, id: string, userId: string, reference?: string) {
    const refund = await Refund.findOne({ _id: id, agencyId });
    if (!refund) throw new NotFoundError('Refund');
    if (refund.status !== 'approved') throw new AppError('Only an approved refund can be completed', 400);

    refund.status = 'completed';
    refund.processedAt = new Date();
    if (reference) refund.reference = reference;
    await refund.save();

    if (refund.invoiceId) {
      const invoice = await Invoice.findById(refund.invoiceId);
      if (invoice) {
        const totalRefunded = (invoice.totalRefunded || 0) + refund.amount;
        const received = await paymentRepository.sumVerifiedForInvoice(refund.invoiceId);
        const net = Math.max(0, received - totalRefunded);
        await Invoice.findByIdAndUpdate(refund.invoiceId, {
          $set: {
            totalRefunded,
            amountPaid: net,
            outstandingBalance: Math.max(0, invoice.totalAmount - net),
            status: net <= 0 ? 'refunded' : invoice.status,
          },
        });
      }
    }

    if (refund.travelFileId) {
      await paymentService.recalculate(refund.travelFileId, undefined);
      await TravelFile.findByIdAndUpdate(refund.travelFileId, {
        $push: {
          timeline: {
            action: 'Refund Processed',
            description: `Refund of ${refund.amount.toLocaleString()} processed — ${refund.reason}`,
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            source: 'payment',
            referenceId: refund._id as mongoose.Types.ObjectId,
          },
        },
      });
    }

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: 'Refund Completed',
      message: `Refund of ${refund.amount.toLocaleString()} has been paid out`,
      type: 'payment',
      referenceId: refund._id as mongoose.Types.ObjectId,
      referenceModel: 'Refund',
    });

    return refund;
  },
};
