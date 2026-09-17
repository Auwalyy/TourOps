import mongoose from 'mongoose';
import { tourPackageRepository } from '../repositories/tourPackage.repository';
import { TourPackage } from '../models/TourPackage';
import { Booking } from '../models/Booking';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

/** Booking states that consume a seat but aren't yet firm sales. */
const HELD_STATUSES = ['draft', 'pending', 'reserved'];
/** Booking states that represent a firm, sold seat. */
const SOLD_STATUSES = ['confirmed', 'ticketed', 'completed'];

export const packageService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return tourPackageRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as string,
      category: query.category as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');
    return pkg;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const slug = await tourPackageRepository.generateSlug(agencyId, data.title as string);
    return tourPackageRepository.create({ ...data, agencyId, slug, createdBy: userId } as any);
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');
    if (data.title && data.title !== pkg.title) {
      (data as any).slug = await tourPackageRepository.generateSlug(agencyId, data.title as string);
    }
    return tourPackageRepository.updateById(id, data);
  },

  async delete(agencyId: string, id: string) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');
    return tourPackageRepository.deleteById(id);
  },

  /**
   * Sold / held / remaining breakdown, derived from actual bookings rather
   * than trusting the counter alone. This is what an agency shows a
   * licence-nervous owner to prove they aren't selling seats they don't hold.
   */
  async getAvailability(agencyId: string, id: string) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');

    const counts = await Booking.aggregate([
      {
        $match: {
          agencyId: new mongoose.Types.ObjectId(agencyId),
          tourPackageId: new mongoose.Types.ObjectId(id),
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus: Record<string, number> = {};
    for (const c of counts) byStatus[c._id] = c.count;

    const sold = SOLD_STATUSES.reduce((s, st) => s + (byStatus[st] || 0), 0);
    const held = HELD_STATUSES.reduce((s, st) => s + (byStatus[st] || 0), 0);
    const cancelled = byStatus.cancelled || 0;
    const maxCapacity = pkg.availability?.maxCapacity ?? null;

    return {
      maxCapacity,
      sold,
      held,
      cancelled,
      taken: sold + held,
      remaining: maxCapacity === null ? null : Math.max(0, maxCapacity - (sold + held)),
      isFull: maxCapacity !== null && sold + held >= maxCapacity,
      byStatus,
    };
  },

  /**
   * Atomically claims one seat. The capacity check and the increment happen in
   * a single conditional update, so two staff confirming the last seat at the
   * same time cannot both succeed — the documented failure mode is an agency
   * collecting from 300 pilgrims while holding 100 seats.
   */
  async claimSeat(agencyId: string, packageId: string) {
    const pkg = await TourPackage.findOne({ _id: packageId, agencyId }).select('availability title');
    if (!pkg) throw new NotFoundError('Package');

    // No cap configured means unlimited — just count it.
    if (pkg.availability?.maxCapacity == null) {
      await TourPackage.updateOne({ _id: packageId }, { $inc: { 'availability.currentBookings': 1 } });
      return;
    }

    const claimed = await TourPackage.findOneAndUpdate(
      {
        _id: packageId,
        agencyId,
        $expr: { $lt: ['$availability.currentBookings', '$availability.maxCapacity'] },
      },
      { $inc: { 'availability.currentBookings': 1 } },
      { new: true }
    );

    if (!claimed) {
      throw new AppError(
        `"${pkg.title}" is fully booked (${pkg.availability.maxCapacity} seats). Increase the capacity before adding more bookings.`,
        409
      );
    }
  },

  /** Releases a seat when a booking is cancelled or deleted. */
  async releaseSeat(agencyId: string, packageId: string) {
    await TourPackage.updateOne(
      { _id: packageId, agencyId, 'availability.currentBookings': { $gt: 0 } },
      { $inc: { 'availability.currentBookings': -1 } }
    );
  },
};
