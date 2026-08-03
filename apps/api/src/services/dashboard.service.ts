import { Booking } from '../models/Booking';
import { VisaApplication } from '../models/VisaApplication';
import { Customer } from '../models/Customer';
import { Invoice } from '../models/Invoice';
import { visaApplicationRepository } from '../repositories/visaApplication.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { invoiceRepository } from '../repositories/invoice.repository';
import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export const dashboardService = {
  async getKPIs(agencyId: string) {
    const agencyObjId = new mongoose.Types.ObjectId(agencyId);

    const [
      totalCustomers,
      activeBookings,
      pendingVisas,
      financialSummary,
      bookingStatusCounts,
      visaStatusCounts,
    ] = await Promise.all([
      Customer.countDocuments({ agencyId, status: 'active' }),
      Booking.countDocuments({ agencyId, status: { $in: ['confirmed', 'in_progress'] } }),
      VisaApplication.countDocuments({ agencyId, status: { $in: ['documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review'] } }),
      invoiceRepository.getFinancialSummary(agencyId),
      bookingRepository.getStatusCounts(agencyId),
      visaApplicationRepository.getStatusCounts(agencyId),
    ]);

    const financial = financialSummary[0] || { totalRevenue: 0, totalOutstanding: 0, totalInvoiced: 0 };

    return {
      totalCustomers,
      activeBookings,
      pendingVisas,
      totalRevenue: financial.totalRevenue,
      totalOutstanding: financial.totalOutstanding,
      bookingStatusCounts,
      visaStatusCounts,
    };
  },

  async getRevenueChart(agencyId: string, year: number) {
    return invoiceRepository.getMonthlyRevenue(agencyId, year);
  },

  async getUpcomingAppointments(agencyId: string) {
    return visaApplicationRepository.getUpcomingAppointments(agencyId, 7);
  },

  async getRecentActivity(agencyId: string) {
    return AuditLog.find({ agencyId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'firstName lastName avatar')
      .lean();
  },
};
