import mongoose from 'mongoose';
import { travelFileRepository } from '../repositories/travelFile.repository';
import { notificationService } from './notification.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams, generateTravelFileNumber } from '../utils/helpers';
import { TravelFileStatus } from '../models/TravelFile';
import { Invoice } from '../models/Invoice';
import { DocumentFile } from '../models/Document';

// ─── Next Action Engine ───────────────────────────────────────────────────────
// Pure business rules — no AI dependency
function computeNextAction(file: any): { action: string; urgency: 'info' | 'warning' | 'critical' } {
  const now = new Date();

  // Overdue tasks
  const overdueTasks = (file.tasks || []).filter(
    (t: any) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now
  );
  if (overdueTasks.length > 0) {
    return { action: `${overdueTasks.length} overdue task(s) — action required`, urgency: 'critical' };
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

  // Status-based next actions
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
function computeHealth(file: any, invoices: any[], documents: any[]): {
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

  async addPayment(agencyId: string, id: string, userId: string, payment: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const amount = Number(payment.amount);
    return travelFileRepository.updateById(id, {
      $inc: { amountPaid: amount },
      $push: {
        timeline: {
          action: 'Payment Recorded',
          description: `Payment of ${amount.toLocaleString()} recorded`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          source: 'payment',
        },
      },
    });
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

    const [invoices, documents] = await Promise.all([
      Invoice.find({ _id: { $in: file.invoiceIds } }).lean(),
      DocumentFile.find({ _id: { $in: file.documentIds } }).lean(),
    ]);

    return {
      health: computeHealth(file, invoices, documents),
      nextAction: computeNextAction(file),
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
