import mongoose from 'mongoose';
import { visaApplicationRepository } from '../repositories/visaApplication.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { paymentService } from './payment.service';
import { notificationService } from './notification.service';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';
import { VisaStatus } from '../models/VisaApplication';
import { Customer } from '../models/Customer';
import { v4 as uuidv4 } from 'uuid';

export const visaService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return visaApplicationRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as VisaStatus,
      customerId: query.customerId as string,
      assignedOfficer: query.assignedOfficer as string,
      destinationCountry: query.destinationCountry as string,
      paymentStatus: query.paymentStatus as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');
    return visa;
  },

  async listPayments(agencyId: string, id: string) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');
    return paymentRepository.listForVisa(agencyId, id);
  },

  /** Records a payment against the visa fee. */
  async addPayment(agencyId: string, id: string, userId: string, payment: Record<string, unknown>) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');

    await paymentService.record(agencyId, userId, {
      visaApplicationId: id,
      customerId: visa.customerId.toString(),
      amount: Number(payment.amount),
      method: payment.method as any,
      reference: payment.reference as string,
      proofUrl: payment.proofUrl as string,
      notes: (payment.note || payment.notes) as string,
      autoVerify: payment.autoVerify !== false,
    });

    return visaApplicationRepository.findOne({ _id: id, agencyId });
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const referenceNumber = `VISA-${uuidv4().substring(0, 8).toUpperCase()}`;
    return visaApplicationRepository.create({
      ...data,
      agencyId,
      referenceNumber,
      statusHistory: [{ status: 'draft', changedBy: userId, changedAt: new Date() }],
    } as any);
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');
    return visaApplicationRepository.updateById(id, data);
  },

  async updateStatus(agencyId: string, id: string, userId: string, status: VisaStatus, note?: string) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');

    const updated = await visaApplicationRepository.updateById(id, {
      status,
      $push: { statusHistory: { status, changedBy: userId, changedAt: new Date(), note } },
    });

    const customer = await Customer.findById(visa.customerId).select('email firstName').lean();

    await notificationService.sendVisaNotification(
      new mongoose.Types.ObjectId(agencyId),
      [new mongoose.Types.ObjectId(userId)],
      status,
      visa.destinationCountry,
      visa._id as mongoose.Types.ObjectId,
      customer?.email,
      customer?.firstName
    );

    return updated;
  },

  async assignOfficer(agencyId: string, id: string, officerId: string) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');
    return visaApplicationRepository.updateById(id, { assignedOfficer: officerId });
  },

  async scheduleAppointment(agencyId: string, id: string, appointment: Record<string, unknown>) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');
    return visaApplicationRepository.updateById(id, {
      appointment,
      status: 'appointment_scheduled',
    });
  },

  async getUpcomingAppointments(agencyId: string) {
    return visaApplicationRepository.getUpcomingAppointments(agencyId);
  },

  async delete(agencyId: string, id: string) {
    const visa = await visaApplicationRepository.findOne({ _id: id, agencyId });
    if (!visa) throw new NotFoundError('Visa application');
    return visaApplicationRepository.deleteById(id);
  },
};
