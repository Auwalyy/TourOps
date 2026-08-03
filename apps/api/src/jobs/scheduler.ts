import { invoiceService } from '../services/invoice.service';
import { documentRepository } from '../repositories/document.repository';
import { visaApplicationRepository } from '../repositories/visaApplication.repository';
import { User } from '../models/User';
import { emailService } from '../services/email.service';
import { Customer } from '../models/Customer';
import { logger } from '../utils/logger';

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

  logger.info('Background jobs started');
}
