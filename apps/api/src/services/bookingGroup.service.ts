import mongoose from 'mongoose';
import { BookingGroup } from '../models/BookingGroup';
import { TravelFile } from '../models/TravelFile';
import { Payment } from '../models/Payment';
import { paymentRepository } from '../repositories/payment.repository';
import { paymentService } from './payment.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

interface AllocationInput {
  travelFileId: string;
  amount: number;
}

export const bookingGroupService: Record<string, (...args: any[]) => Promise<any>> = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    const filter: Record<string, unknown> = { agencyId };
    if (query.search) filter.name = { $regex: query.search as string, $options: 'i' };

    const skip = (page - 1) * limit;
    const [groups, total] = await Promise.all([
      BookingGroup.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('primaryContactCustomerId', 'firstName lastName fullName phone')
        .lean(),
      BookingGroup.countDocuments(filter),
    ]);

    // Attach member counts and rolled-up totals so the list is useful on its own.
    const data = await Promise.all(
      groups.map(async (g) => {
        const members = await TravelFile.find({ agencyId, groupId: g._id })
          .select('totalCost amountPaid')
          .lean();
        return {
          ...g,
          memberCount: members.length,
          totalCost: members.reduce((s, m) => s + (m.totalCost || 0), 0),
          amountPaid: members.reduce((s, m) => s + (m.amountPaid || 0), 0),
        };
      })
    );

    return { data, total };
  },

  async getById(agencyId: string, id: string) {
    const group = await BookingGroup.findOne({ _id: id, agencyId })
      .populate('primaryContactCustomerId', 'firstName lastName fullName phone email')
      .populate('createdBy', 'firstName lastName');
    if (!group) throw new NotFoundError('Booking Group');
    return group;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    if (!data.name || !String(data.name).trim()) throw new AppError('A group name is required', 400);
    if (!data.primaryContactCustomerId) throw new AppError('A primary contact is required', 400);

    return BookingGroup.create({
      agencyId,
      name: String(data.name).trim(),
      primaryContactCustomerId: data.primaryContactCustomerId,
      departureGroup: data.departureGroup,
      notes: data.notes,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const group = await BookingGroup.findOneAndUpdate(
      { _id: id, agencyId },
      { $set: { name: data.name, departureGroup: data.departureGroup, notes: data.notes } },
      { new: true, runValidators: true }
    );
    if (!group) throw new NotFoundError('Booking Group');
    return group;
  },

  /**
   * Members keep their own travel files — each with its own documents, visa
   * status and progress — so per-person tracking is untouched. The group is
   * purely the shared ledger + cohort tag on top.
   */
  async getMembers(agencyId: string, id: string) {
    const group = await BookingGroup.findOne({ _id: id, agencyId });
    if (!group) throw new NotFoundError('Booking Group');

    return TravelFile.find({ agencyId, groupId: id })
      .select('fileNumber customerId travelType destination status totalCost amountPaid departureDate priority')
      .populate('customerId', 'firstName lastName fullName phone passport')
      .sort({ createdAt: 1 })
      .lean();
  },

  async addMember(agencyId: string, id: string, travelFileId: string) {
    const group = await BookingGroup.findOne({ _id: id, agencyId });
    if (!group) throw new NotFoundError('Booking Group');

    const file = await TravelFile.findOneAndUpdate(
      { _id: travelFileId, agencyId },
      { $set: { groupId: group._id } },
      { new: true }
    );
    if (!file) throw new NotFoundError('Travel File');
    return file;
  },

  async removeMember(agencyId: string, id: string, travelFileId: string) {
    const file = await TravelFile.findOneAndUpdate(
      { _id: travelFileId, agencyId, groupId: id },
      { $unset: { groupId: '' } },
      { new: true }
    );
    if (!file) throw new NotFoundError('Travel File');
    return file;
  },

  /** Shared ledger: every payment made against any member of the group. */
  async getLedger(agencyId: string, id: string) {
    const group = await BookingGroup.findOne({ _id: id, agencyId });
    if (!group) throw new NotFoundError('Booking Group');

    const [members, payments] = await Promise.all([
      this.getMembers(agencyId, id),
      paymentRepository.listForGroup(agencyId, id),
    ]);

    const totalCost = members.reduce((s: number, m: any) => s + (m.totalCost || 0), 0);
    const totalPaid = members.reduce((s: number, m: any) => s + (m.amountPaid || 0), 0);
    const pendingVerification = payments
      .filter((p: any) => p.status === 'pending')
      .reduce((s: number, p: any) => s + p.amount, 0);

    return {
      group,
      members,
      payments,
      totals: {
        totalCost,
        totalPaid,
        balance: totalCost - totalPaid,
        pendingVerification,
        memberCount: members.length,
      },
    };
  },

  /**
   * One man pays for his wife, mother and two children in a single
   * transaction. Splits that one transfer across the named member files,
   * tagging every resulting payment with the group so the ledger reads as
   * one event.
   */
  async recordGroupPayment(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const group = await BookingGroup.findOne({ _id: id, agencyId });
    if (!group) throw new NotFoundError('Booking Group');

    const allocations = (data.allocations as AllocationInput[]) || [];
    if (!allocations.length) throw new AppError('At least one member allocation is required', 400);

    const totalAllocated = allocations.reduce((s, a) => s + Number(a.amount || 0), 0);
    if (totalAllocated <= 0) throw new AppError('Allocated amount must be greater than zero', 400);

    if (data.amount !== undefined && Number(data.amount) !== totalAllocated) {
      throw new AppError(
        `Allocations (${totalAllocated.toLocaleString()}) must add up to the payment amount (${Number(data.amount).toLocaleString()})`,
        400
      );
    }

    // Every allocated file must actually belong to this group.
    const memberIds = (await TravelFile.find({ agencyId, groupId: id }).select('_id').lean()).map((f) =>
      f._id.toString()
    );
    for (const a of allocations) {
      if (!memberIds.includes(a.travelFileId)) {
        throw new AppError('One or more travel files do not belong to this group', 400);
      }
    }

    const created = [];
    for (const a of allocations) {
      if (Number(a.amount) <= 0) continue;
      created.push(
        await paymentService.record(agencyId, userId, {
          travelFileId: a.travelFileId,
          groupId: id,
          amount: Number(a.amount),
          method: data.method as any,
          reference: data.reference as string,
          proofUrl: data.proofUrl as string,
          notes: (data.notes as string) || `Group payment — ${group.name}`,
          autoVerify: data.autoVerify === true,
        })
      );
    }

    return created;
  },

  async delete(agencyId: string, id: string) {
    const group = await BookingGroup.findOne({ _id: id, agencyId });
    if (!group) throw new NotFoundError('Booking Group');

    const memberCount = await TravelFile.countDocuments({ agencyId, groupId: id });
    if (memberCount > 0) {
      throw new AppError('Remove all members from this group before deleting it', 400);
    }
    const hasPayments = await Payment.countDocuments({ agencyId, groupId: id });
    if (hasPayments > 0) {
      throw new AppError('This group has payment history and cannot be deleted', 400);
    }

    return BookingGroup.findByIdAndDelete(id);
  },
};
