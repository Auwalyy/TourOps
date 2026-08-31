import mongoose from 'mongoose';
import { travelFileRepository } from '../repositories/travelFile.repository';
import { notificationService } from './notification.service';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, generateTravelFileNumber } from '../utils/helpers';
import { TravelFileStatus } from '../models/TravelFile';

export const travelFileService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return travelFileRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as string,
      travelType: query.travelType as string,
      customerId: query.customerId as string,
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
      timeline: [
        {
          action: 'Travel File Created',
          description: `Travel file ${fileNumber} created`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
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

    const updated = await travelFileRepository.updateById(id, data);

    await travelFileRepository.updateById(id, {
      $push: {
        timeline: {
          action: 'Travel File Updated',
          description: 'File details were updated',
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
        },
      },
    });

    return updated;
  },

  async updateStatus(agencyId: string, id: string, userId: string, status: TravelFileStatus, description?: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    const updated = await travelFileRepository.updateById(id, {
      status,
      $push: {
        timeline: {
          action: `Status → ${status.replace(/_/g, ' ')}`,
          description: description || `Status changed to ${status.replace(/_/g, ' ')}`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
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
        tasks: { ...task, createdAt: new Date() },
        timeline: {
          action: 'Task Added',
          description: `Task "${task.title}" added`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
        },
      },
    });
  },

  async updateTask(agencyId: string, fileId: string, taskId: string, data: Record<string, unknown>) {
    const file = await travelFileRepository.findOne({ _id: fileId, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    return travelFileRepository.updateById(
      fileId,
      { $set: Object.fromEntries(Object.entries(data).map(([k, v]) => [`tasks.$[t].${k}`, v])) } as any,
      { arrayFilters: [{ 't._id': new mongoose.Types.ObjectId(taskId) }] }
    );
  },

  async addNote(agencyId: string, id: string, userId: string, content: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    return travelFileRepository.updateById(id, {
      $push: {
        notes: { content, createdBy: new mongoose.Types.ObjectId(userId), createdAt: new Date() },
      },
    });
  },

  async linkDocument(agencyId: string, id: string, userId: string, documentId: string) {
    const file = await travelFileRepository.findOne({ _id: id, agencyId });
    if (!file) throw new NotFoundError('Travel File');

    return travelFileRepository.updateById(id, {
      $addToSet: { documentIds: new mongoose.Types.ObjectId(documentId) },
      $push: {
        timeline: {
          action: 'Document Linked',
          description: 'A document was linked to this travel file',
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
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
        payments: {
          ...payment,
          amount,
          recordedBy: new mongoose.Types.ObjectId(userId),
          paidAt: payment.paidAt || new Date(),
        },
        timeline: {
          action: 'Payment Recorded',
          description: `Payment of ${amount.toLocaleString()} recorded`,
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
        },
      },
    });
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
