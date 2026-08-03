import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({ from: config.smtp.from, ...options });
  } catch (error) {
    logger.error('Email send failed:', error);
    // Non-blocking — log but don't throw
  }
}

export const emailService = {
  sendPasswordReset: (to: string, resetUrl: string) =>
    sendEmail({
      to,
      subject: 'Reset Your TourOps Password',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a56db">Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1a56db;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a>
          <p style="color:#6b7280;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
        </div>`,
    }),

  sendWelcome: (to: string, name: string, agencyName: string) =>
    sendEmail({
      to,
      subject: `Welcome to ${agencyName} on TourOps`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a56db">Welcome, ${name}!</h2>
          <p>Your account has been created on <strong>${agencyName}</strong>'s TourOps workspace.</p>
          <p>Log in at <a href="${config.clientUrl}">${config.clientUrl}</a> to get started.</p>
        </div>`,
    }),

  sendBookingConfirmation: (to: string, name: string, reference: string) =>
    sendEmail({
      to,
      subject: `Booking Confirmed — ${reference}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a56db">Booking Confirmed</h2>
          <p>Hi ${name}, your booking <strong>${reference}</strong> has been confirmed.</p>
          <p>Log in to your portal to view details and track progress.</p>
        </div>`,
    }),

  sendVisaUpdate: (to: string, name: string, status: string, country: string) =>
    sendEmail({
      to,
      subject: `Visa Application Update — ${country}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a56db">Visa Application Update</h2>
          <p>Hi ${name}, your visa application for <strong>${country}</strong> has been updated to: <strong>${status.replace(/_/g, ' ')}</strong>.</p>
        </div>`,
    }),

  sendPaymentReminder: (to: string, name: string, invoiceNumber: string, amount: number, currency: string, dueDate: string) =>
    sendEmail({
      to,
      subject: `Payment Reminder — ${invoiceNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a56db">Payment Reminder</h2>
          <p>Hi ${name}, invoice <strong>${invoiceNumber}</strong> for <strong>${currency} ${amount.toLocaleString()}</strong> is due on <strong>${dueDate}</strong>.</p>
        </div>`,
    }),

  sendAppointmentReminder: (to: string, name: string, date: string, location: string) =>
    sendEmail({
      to,
      subject: 'Upcoming Visa Appointment Reminder',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a56db">Appointment Reminder</h2>
          <p>Hi ${name}, you have a visa appointment on <strong>${date}</strong> at <strong>${location}</strong>.</p>
        </div>`,
    }),
};
