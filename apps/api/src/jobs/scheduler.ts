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

/**
 * Runs a job shortly after boot and then on an interval.
 *
 * `setInterval` alone means a job with a 12-hour period never runs on a host
 * that restarts more often than that — which is exactly what happens on a
 * free tier that sleeps when idle. The short initial delay lets the database
 * connect first, and staggering keeps several jobs from firing at once.
 */
function schedule(name: string, everyMs: number, run: () => Promise<void>): void {
  let running = false;

  const tick = async () => {
    // Skip rather than overlap — a slow run must not stack up behind itself.
    if (running) return;
    running = true;
    try {
      await run();
    } catch (e) {
      logger.error(`Job: ${name} failed`, e);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 30 * 1000 + Math.floor(Math.random() * 30 * 1000));
  setInterval(tick, everyMs);
}

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

  // Trip reminders — 5 days and 3 days before departure, once each.
  // Runs every 6 hours; the sent-markers mean a restart cannot double-send.
  schedule('trip reminders', 6 * 60 * 60 * 1000, async () => {
    const sent = await sendDepartureReminders();
    logger.info(`Job: sent ${sent} departure reminders`);
  });

  // Pending task reminders — tasks falling due within 3 days, or overdue.
  schedule('task reminders', 6 * 60 * 60 * 1000, async () => {
    const sent = await sendTaskReminders();
    logger.info(`Job: sent ${sent} task reminders`);
  });

  logger.info('Background jobs started');
}

/** Days before departure that warrant a reminder. */
const DEPARTURE_REMINDER_DAYS = [5, 3];
const DAY = 24 * 60 * 60 * 1000;

/**
 * Tells staff a trip is coming up, at five days out and again at three.
 *
 * Each window is recorded in `departureRemindersSent`, so a server restart,
 * a duplicate run or an overlapping window cannot send the same reminder
 * twice — which matters more than usual here, because this runs on a free
 * tier that restarts often.
 */
async function sendDepartureReminders(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + (Math.max(...DEPARTURE_REMINDER_DAYS) + 1) * DAY);

  const files = await TravelFile.find({
    status: { $nin: ['completed', 'cancelled', 'archived'] },
    departureDate: { $gte: now, $lte: horizon },
  })
    .populate('customerId', 'firstName lastName fullName')
    .lean();

  let sent = 0;

  for (const file of files as any[]) {
    const daysOut = Math.ceil((new Date(file.departureDate).getTime() - now.getTime()) / DAY);

    // The largest unsent window this trip now falls inside.
    const already: number[] = file.departureRemindersSent || [];
    const due = DEPARTURE_REMINDER_DAYS.filter((d) => daysOut <= d && !already.includes(d));
    if (!due.length) continue;
    const customer = file.customerId;
    const who =
      customer?.fullName ||
      `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
      file.fileNumber;

    const outstanding = (file.totalCost || 0) - (file.amountPaid || 0);

    await notificationService.notifyAgencyStaff(file.agencyId, {
      title: daysOut <= 1 ? 'Departure tomorrow' : `Departure in ${daysOut} days`,
      message:
        `${who} (${file.fileNumber}) departs ${new Date(file.departureDate).toLocaleDateString()}` +
        (outstanding > 0 ? ` — still owing ${outstanding.toLocaleString()}` : ''),
      type: 'booking',
      referenceId: file._id,
      referenceModel: 'TravelFile',
    });

    // Mark every window that has now passed, not just the one that fired, so
    // a trip found late does not fire both reminders in a row.
    await TravelFile.updateOne(
      { _id: file._id },
      { $addToSet: { departureRemindersSent: { $each: due } } }
    );
    sent += 1;
  }

  return sent;
}

/** Nags about unfinished tasks that are due within three days, once a day. */
async function sendTaskReminders(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * DAY);
  const nagCutoff = new Date(now.getTime() - DAY);

  const files = await TravelFile.find({
    status: { $nin: ['completed', 'cancelled', 'archived'] },
    'tasks.dueDate': { $lte: horizon },
  }).lean();

  let sent = 0;

  for (const file of files as any[]) {
    const due = (file.tasks || []).filter(
      (t: any) =>
        t.dueDate &&
        new Date(t.dueDate) <= horizon &&
        t.status !== 'completed' &&
        t.status !== 'cancelled' &&
        (!t.remindedAt || new Date(t.remindedAt) < nagCutoff)
    );
    if (!due.length) continue;

    const soonest = due.sort(
      (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];
    const overdue = new Date(soonest.dueDate) < now;

    await notificationService.notifyAgencyStaff(file.agencyId, {
      title: overdue ? 'Task overdue' : 'Task due soon',
      message:
        `${file.fileNumber}: "${soonest.title}" ${overdue ? 'was due' : 'is due'} ` +
        `${new Date(soonest.dueDate).toLocaleDateString()}` +
        (due.length > 1 ? ` (and ${due.length - 1} more)` : ''),
      type: 'task',
      referenceId: file._id,
      referenceModel: 'TravelFile',
    });

    await TravelFile.updateOne(
      { _id: file._id },
      { $set: { 'tasks.$[t].remindedAt': now } },
      { arrayFilters: [{ 't._id': { $in: due.map((d: any) => d._id) } }] }
    );
    sent += 1;
  }

  return sent;
}
