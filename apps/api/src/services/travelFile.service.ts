import mongoose from 'mongoose';
import { travelFileRepository } from '../repositories/travelFile.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { paymentService } from './payment.service';
import { notificationService } from './notification.service';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, generateTravelFileNumber } from '../utils/helpers';
import { TravelFile, TravelFileStatus } from '../models/TravelFile';
import { Invoice } from '../models/Invoice';
import { DocumentFile } from '../models/Document';

// ─── Next Action Engine ───────────────────────────────────────────────────────
function computeNextAction(file: any, bookings: any[]): { action: string; urgency: 'info' | 'warning' | 'critical' } {
  const now = new Date();

  // Overdue tasks
  const overdueTasks = (file.tasks || []).filter(
    (t: any) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now
  );
  if (overdueTasks.length > 0) {
    return { action: `${overdueTasks.length} overdue task(s) — action required`, urgency: 'critical' };
  }

  // Booking-aware checks
  if (bookings.length > 0) {
    const cancelledFlight = bookings.find((b) => b.bookingType === 'flight' && b.status === 'cancelled');
    if (cancelledFlight) {
      return { action: `Flight booking ${cancelledFlight.bookingNumber} has been cancelled — action required`, urgency: 'critical' };
    }
    const noConfirmedFlight = !bookings.some((b) => b.bookingType === 'flight' && ['confirmed', 'ticketed'].includes(b.status));
    const hasFlight = bookings.some((b) => b.bookingType === 'flight');
    if (hasFlight && noConfirmedFlight && file.status !== 'completed') {
      return { action: 'No flight booking has been confirmed', urgency: 'critical' };
    }
    if (file.departureDate) {
      const daysUntilDeparture = Math.floor((new Date(file.departureDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const pendingHotel = bookings.find((b) => b.bookingType === 'hotel' && b.status === 'pending');
      if (pendingHotel && daysUntilDeparture <= 5) {
        return { action: `Hotel booking is still pending and departure is in ${daysUntilDeparture} days`, urgency: 'warning' };
      }
    }
    const ticketedFlight = bookings.find((b) => b.bookingType === 'flight' && b.status === 'ticketed' && b.documents?.length > 0);
    if (ticketedFlight) {
      return { action: `Flight ticket uploaded for ${ticketedFlight.bookingNumber} — review and share with customer`, urgency: 'info' };
    }
  }

  // Outstanding payment
  if (file.totalCost > 0 && file.amountPaid < file.totalCost) {
    const balance = file.totalCost - file.amountPaid;
    return { action: `Outstanding balance: ${balance.toLocaleString()} — collect payment`, urgency: 'warning' };
  }

  // Passport expiry check
  const customer = file.customerId as any;
  if (customer?.passport?.expiryDate) {
    const expiry = new Date(customer.passport.expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) {
      return { action: 'Customer passport has expired — urgent action required', urgency: 'critical' };
    }
    if (daysUntilExpiry < 90) {
      return { action: `Passport expires in ${daysUntilExpiry} days — verify validity`, urgency: 'warning' };
    }
  }

  // Departure approaching
  if (file.departureDate) {
    const daysUntilDeparture = Math.floor((new Date(file.departureDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeparture < 0 && file.status !== 'completed') {
      return { action: 'Departure date has passed — mark file as completed or update dates', urgency: 'critical' };
    }
    if (daysUntilDeparture <= 7 && file.status !== 'ready_for_departure' && file.status !== 'completed') {
      return { action: `Departure in ${daysUntilDeparture} days — ensure file is ready`, urgency: 'critical' };
    }
    if (daysUntilDeparture <= 30) {
      return { action: `Departure in ${daysUntilDeparture} days — verify all preparations`, urgency: 'warning' };
    }
  }

  const statusActions: Record<string, { action: string; urgency: 'info' | 'warning' | 'critical' }> = {
    draft: { action: 'File is in draft — open file to begin processing', urgency: 'info' },
    open: { action: 'File opened — collect customer documents and initial payment', urgency: 'info' },
    pending_payment: { action: 'Awaiting payment — follow up with customer', urgency: 'warning' },
    awaiting_documents: { action: 'Documents pending — request missing documents from customer', urgency: 'warning' },
    visa_processing: { action: 'Visa in processing — monitor application status', urgency: 'info' },
    ready_for_departure: { action: 'Ready to depart — confirm all travel arrangements', urgency: 'info' },
    completed: { action: 'Travel file completed', urgency: 'info' },
    cancelled: { action: 'File cancelled', urgency: 'info' },
    archived: { action: 'File archived', urgency: 'info' },
  };

  return statusActions[file.status] || { action: 'Review file status', urgency: 'info' };
}

// ─── Health Score Engine ──────────────────────────────────────────────────────
function computeHealth(file: any, invoices: any[], documents: any[], bookings: any[]): {
  score: 'green' | 'yellow' | 'red';
  issues: string[];
} {
  const issues: string[] = [];
  const now = new Date();

  // Overdue tasks
  const overdueTasks = (file.tasks || []).filter(
    (t: any) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now
  );
  if (overdueTasks.length > 0) issues.push(`${overdueTasks.length} overdue task(s)`);

  // Outstanding balance
  if (file.totalCost > 0 && file.amountPaid < file.totalCost) {
    issues.push(`Outstanding balance: ${(file.totalCost - file.amountPaid).toLocaleString()}`);
  }

  // Overdue invoices
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  if (overdueInvoices.length > 0) issues.push(`${overdueInvoices.length} overdue invoice(s)`);

  // Rejected documents
  const rejectedDocs = documents.filter((d) => d.status === 'rejected');
  if (rejectedDocs.length > 0) issues.push(`${rejectedDocs.length} rejected document(s)`);

  // Expired documents
  const expiredDocs = documents.filter((d) => d.isExpired || d.status === 'expired');
  if (expiredDocs.length > 0) issues.push(`${expiredDocs.length} expired document(s)`);

  // Passport expiry
  const customer = file.customerId as any;
  if (customer?.passport?.expiryDate) {
    const daysUntilExpiry = Math.floor((new Date(customer.passport.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) issues.push('Customer passport expired');
    else if (daysUntilExpiry < 90) issues.push(`Passport expires in ${daysUntilExpiry} days`);
  }

  // Departure approaching
  if (file.departureDate) {
    const daysUntilDeparture = Math.floor((new Date(file.departureDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeparture >= 0 && daysUntilDeparture <= 7 && file.status !== 'completed') {
      issues.push(`Departure in ${daysUntilDeparture} days`);
    }
  }

  // Booking health checks
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
  if (cancelledBookings.length > 0) issues.push(`${cancelledBookings.length} cancelled booking(s)`);
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  if (pendingBookings.length > 0 && file.departureDate) {
    const days = Math.floor((new Date(file.departureDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) issues.push(`${pendingBookings.length} unconfirmed booking(s) close to departure`);
  }

  if (issues.length === 0) return { score: 'green', issues: [] };
  if (issues.some((i) => i.includes('expired') || i.includes('overdue') || i.includes('Departure in'))) {
    return { score: 'red', issues };
  }
  return { score: 'yellow', issues };
}

// ─── Progress Calculator ──────────────────────────────────────────────────────
function computeProgress(file: any, invoices: any[], documents: any[]) {
  const totalTasks = file.tasks?.length || 0;
  const completedTasks = file.tasks?.filter((t: any) => t.status === 'completed').length || 0;

  const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + (i.amountPaid || 0), 0);

  const totalDocs = documents.length;
  const approvedDocs = documents.filter((d: any) => d.status === 'approved').length;

  const paymentPct = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const docPct = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

  const statusProgress: Record<string, number> = {
    draft: 5, open: 15, pending_payment: 25, awaiting_documents: 40,
    visa_processing: 60, ready_for_departure: 85, completed: 100, cancelled: 0, archived: 100,
  };
  const statusPct = statusProgress[file.status] || 0;

  const overall = Math.round((statusPct * 0.4) + (paymentPct * 0.3) + (docPct * 0.2) + (taskPct * 0.1));

  return {
    overall: Math.min(100, overall),
    payment: paymentPct,
    documents: docPct,
    tasks: taskPct,
    status: statusPct,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const travelFileService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return travelFileRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as string,
      travelType: query.travelType as string,
      customerId: query.customerId as string,
      priority: query.priority as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const file = await travelFileRepository.findFullById(agencyId, id);
    if (!file) throw new NotFoundError('Travel File');
    return file;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const fileNumber = generateTravelFileNumber();
    const file = await travelFileRepository.create({
      ...data,
      agencyId,
      fileNumber,
      statusHistory: [],
      timeline: [
        {
          action: 'Travel File Created',
          description: `Travel file ${fileNumber} created`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'staff',
        },
      ],
    } as any);

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: 'New Travel File Created',
      message: `Travel file ${fileNumber} has been created`,
      type: 'booking',
      referenceId: file._id as mongoose.Types.ObjectId,
      referenceModel: 'TravelFile',
    });

    return file;
  },

  async update(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const updated = await travelFileRepository.updateById(id, {
      ...data,
      $push: {
        timeline: {
          action: 'Travel File Updated',
          description: 'File details were updated',
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'staff',
        },
      },
    });

    return updated;
  },

  async updateStatus(agencyId: string, id: string, userId: string, status: TravelFileStatus, reason?: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const updated = await travelFileRepository.updateById(id, {
      status,
      $push: {
        statusHistory: {
          previousStatus: file.status,
          newStatus: status,
          changedBy: new mongoose.Types.ObjectId(userId),
          changedAt: new Date(),
          reason,
        },
        timeline: {
          action: `Status → ${status.replace(/_/g, ' ')}`,
          description: reason || `Status changed to ${status.replace(/_/g, ' ')}`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'staff',
        },
      },
    });

    await notificationService.notifyAgencyStaff(new mongoose.Types.ObjectId(agencyId), {
      title: 'Travel File Status Updated',
      message: `Travel file ${file.fileNumber} is now ${status.replace(/_/g, ' ')}`,
      type: 'booking',
      referenceId: file._id as mongoose.Types.ObjectId,
      referenceModel: 'TravelFile',
    });

    return updated;
  },

  async addTask(agencyId: string, id: string, userId: string, task: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    return travelFileRepository.updateById(id, {
      $push: {
        tasks: { ...task, createdBy: new mongoose.Types.ObjectId(userId), createdAt: new Date() },
        timeline: {
          action: 'Task Added',
          description: `Task "${task.title}" added`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'staff',
        },
      },
    });
  },

  async updateTask(agencyId: string, fileId: string, taskId: string, data: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: fileId, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const setFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      setFields[`tasks.$[t].${k}`] = v;
    }
    if (data.status === 'completed') {
      setFields['tasks.$[t].completedAt'] = new Date();
    }

    return travelFileRepository.updateById(
      fileId,
      { $set: setFields } as any,
      { arrayFilters: [{ 't._id': new mongoose.Types.ObjectId(taskId) }] }
    );
  },

  async addNote(agencyId: string, id: string, userId: string, content: string, visibility: 'internal' | 'shared' = 'internal') {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    return travelFileRepository.updateById(id, {
      $push: {
        notes: {
          content,
          createdBy: new mongoose.Types.ObjectId(userId),
          visibility,
          createdAt: new Date(),
        },
      },
    });
  },

  async linkDocument(agencyId: string, id: string, userId: string, documentId: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    // Also update the document to reference this travel file
    await DocumentFile.findByIdAndUpdate(documentId, { travelFileId: id });

    return travelFileRepository.updateById(id, {
      $addToSet: { documentIds: new mongoose.Types.ObjectId(documentId) },
      $push: {
        timeline: {
          action: 'Document Linked',
          description: 'A document was linked to this travel file',
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'document',
          referenceId: new mongoose.Types.ObjectId(documentId),
        },
      },
    });
  },

  async linkInvoice(agencyId: string, id: string, userId: string, invoiceId: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    return travelFileRepository.updateById(id, {
      $addToSet: { invoiceIds: new mongoose.Types.ObjectId(invoiceId) },
      $push: {
        timeline: {
          action: 'Invoice Linked',
          description: 'An invoice was linked to this travel file',
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'payment',
          referenceId: new mongoose.Types.ObjectId(invoiceId),
        },
      },
    });
  },

  /**
   * Delegates to the Payment collection — the single source of truth. The
   * file's cached amountPaid is re-derived from verified payments there.
   */
  async addPayment(agencyId: string, id: string, userId: string, payment: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    await paymentService.record(agencyId, userId, {
      travelFileId: id,
      customerId: file.customerId.toString(),
      amount: Number(payment.amount),
      method: payment.method as any,
      reference: payment.reference as string,
      proofUrl: payment.proofUrl as string,
      notes: (payment.note || payment.notes) as string,
      // Staff recording a payment at the desk have confirmed it themselves;
      // anything arriving unverified goes to the verification queue instead.
      autoVerify: payment.autoVerify !== false,
    });

    return travelFileRepository.findOne({ _id: id, agencyId });
  },

  async listPayments(agencyId: string, id: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');
    return paymentRepository.listForTravelFile(agencyId, id);
  },

  // ─── Installment schedule ───────────────────────────────────────────────────
  async setPaymentSchedule(agencyId: string, id: string, userId: string, schedule: Array<Record<string, unknown>>) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const entries = (schedule || [])
      .filter((s) => s.dueDate && Number(s.amount) > 0)
      .map((s) => ({
        dueDate: new Date(s.dueDate as string),
        amount: Number(s.amount),
        note: s.note as string,
      }));

    return travelFileRepository.updateById(id, {
      $set: { paymentSchedule: entries },
      $push: {
        timeline: {
          action: 'Payment Plan Updated',
          description: `${entries.length} installment(s) scheduled`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'payment',
        },
      },
    } as any);
  },

  /** Files with an installment past its due date and still not fully paid. */
  async getOverdueInstallments(agencyId: string) {
    const files = await TravelFile.find({
      agencyId,
      status: { $nin: ['completed', 'cancelled', 'archived'] },
      'paymentSchedule.dueDate': { $lt: new Date() },
    })
      .select('fileNumber customerId totalCost amountPaid paymentSchedule destination status')
      .populate('customerId', 'firstName lastName fullName phone')
      .lean();

    return files
      .map((f: any) => {
        const overdue = (f.paymentSchedule || []).filter((s: any) => new Date(s.dueDate) < new Date());
        const scheduledOverdue = overdue.reduce((sum: number, s: any) => sum + s.amount, 0);
        // Only genuinely behind if what they've paid doesn't cover what was due by now.
        const shortfall = scheduledOverdue - (f.amountPaid || 0);
        return { ...f, overdueInstallments: overdue, scheduledOverdue, shortfall };
      })
      .filter((f: any) => f.shortfall > 0)
      .sort((a: any, b: any) => b.shortfall - a.shortfall);
  },

  async updatePhysicalFile(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const setFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      setFields[`physicalFile.${k}`] = v;
    }

    // Auto-set passport received/returned dates and by
    if (data.originalPassportReceived === true && !file.physicalFile?.passportReceivedDate) {
      setFields['physicalFile.passportReceivedDate'] = new Date();
      setFields['physicalFile.passportReceivedBy'] = new mongoose.Types.ObjectId(userId);
    }
    if (data.passportReturnedDate) {
      setFields['physicalFile.passportReturnedBy'] = new mongoose.Types.ObjectId(userId);
    }

    const updated = await travelFileRepository.updateById(id, {
      $set: setFields,
      $push: {
        timeline: {
          action: 'Physical File Updated',
          description: 'Physical file tracking information updated',
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'staff',
        },
      },
    });

    return updated;
  },

  async getHealth(agencyId: string, id: string) {
    const file = await travelFileRepository.findFullById(agencyId, id);
    if (!file) throw new NotFoundError('Travel File');

    const [invoices, documents, bookings] = await Promise.all([
      Invoice.find({ _id: { $in: file.invoiceIds } }).lean(),
      DocumentFile.find({ _id: { $in: file.documentIds } }).lean(),
      bookingRepository.getByTravelFile(agencyId, id),
    ]);

    return {
      health: computeHealth(file, invoices, documents, bookings),
      nextAction: computeNextAction(file, bookings),
      progress: computeProgress(file, invoices, documents),
    };
  },

  async statusSummary(agencyId: string) {
    return travelFileRepository.statusSummary(agencyId);
  },

  async delete(agencyId: string, id: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');
    return travelFileRepository.deleteById(id);
  },
};
