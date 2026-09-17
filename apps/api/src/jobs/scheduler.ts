import { invoiceService } from '../services/invoice.service';
import { documentRepository } from '../repositories/document.repository';
import { visaApplicationRepository } from '../repositories/visaApplication.repository';
import { User } from '../models/User';
import { emailService } from '../services/email.service';
import { Customer } from '../models/Customer';
import { TravelFile } from '../models/TravelFile';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

// Simple interval-based scheduler (replace with node-cron in production)
export function startJobs(): void {
  // Mark overdue invoices — every hour
  setInterval(async () => {
    try {
      await invoiceService.markOverdue();
      logger.info('Job: overdue invoices marked');
    } catch (e) {
      logger.error('Job: overdue invoices failed', e);
    }
  }, 60 * 60 * 1000);

  // Mark expired documents — every 6 hours
  setInterval(async () => {
    try {
      await documentRepository.markExpired();
      logger.info('Job: expired documents marked');
    } catch (e) {
      logger.error('Job: expired documents failed', e);
    }
  }, 6 * 60 * 60 * 1000);

  // Appointment reminders — every 12 hours
  setInterval(async () => {
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const visas = await visaApplicationRepository.find({
        'appointment.date': { $gte: tomorrow, $lte: dayAfter },
        status: 'appointment_scheduled',
      });

      for (const visa of visas) {
        const customer = await Customer.findById(visa.customerId).select('email firstName').lean();
        if (customer?.email && visa.appointment?.date && visa.appointment?.location) {
          await emailService.sendAppointmentReminder(
            customer.email,
            customer.firstName,
            new Date(visa.appointment.date).toLocaleDateString(),
            visa.appointment.location
          );
        }
      }
      logger.info(`Job: sent ${visas.length} appointment reminders`);
    } catch (e) {
      logger.error('Job: appointment reminders failed', e);
    }
  }, 12 * 60 * 60 * 1000);

  // Installment reminders — every 12 hours. Catches instalments falling due in
  // the next 3 days as well as any already overdue, and only nags once a day.
  setInterval(async () => {
    try {
      const horizon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const remindedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const files = await TravelFile.find({
        status: { $nin: ['completed', 'cancelled', 'archived'] },
        'paymentSchedule.dueDate': { $lte: horizon },
      })
        .populate('customerId', 'firstName email')
        .lean();

      let sent = 0;
      for (const file of files as any[]) {
        const due = (file.paymentSchedule || []).filter(
          (s: any) =>
            new Date(s.dueDate) <= horizon &&
            (!s.remindedAt || new Date(s.remindedAt) < remindedCutoff)
        );
        if (!due.length) continue;

        const outstanding = (file.totalCost || 0) - (file.amountPaid || 0);
        if (outstanding <= 0) continue;

        const soonest = due.sort(
          (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )[0];
        const isOverdue = new Date(soonest.dueDate) < new Date();

        await notificationService.notifyAgencyStaff(file.agencyId, {
          title: isOverdue ? 'Installment Overdue' : 'Installment Due Soon',
          message: `${file.fileNumber}: ${soonest.amount.toLocaleString()} ${
            isOverdue ? 'was due' : 'due'
          } ${new Date(soonest.dueDate).toLocaleDateString()} — outstanding ${outstanding.toLocaleString()}`,
          type: 'payment',
          referenceId: file._id,
          referenceModel: 'TravelFile',
        });

        await TravelFile.updateOne(
          { _id: file._id },
          { $set: { 'paymentSchedule.$[s].remindedAt': new Date() } },
          { arrayFilters: [{ 's._id': { $in: due.map((d: any) => d._id) } }] }
        );
        sent += 1;
      }
      logger.info(`Job: sent ${sent} installment reminders`);
    } catch (e) {
      logger.error('Job: installment reminders failed', e);
    }
  }, 12 * 60 * 60 * 1000);

  logger.info('Background jobs started');
}
