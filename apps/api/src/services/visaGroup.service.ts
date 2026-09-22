import mongoose from 'mongoose';
import { VisaGroup } from '../models/VisaGroup';
import { VisaIssuance } from '../models/VisaIssuance';
import { Agency } from '../models/Agency';
import { generateVisaBatchPDF, ManifestRow } from './pdf.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

/** GRP-2026-0007 — sequential per agency, readable on a printed manifest. */
async function nextGroupNumber(agencyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await VisaGroup.countDocuments({ agencyId });
  return `GRP-${year}-${String(count + 1).padStart(4, '0')}`;
}

export const visaGroupService: Record<string, (...args: any[]) => Promise<any>> = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    const filter: Record<string, unknown> = { agencyId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const rx = { $regex: query.search as string, $options: 'i' };
      filter.$or = [{ groupNumber: rx }, { name: rx }, { partnerCompany: rx }];
    }

    const skip = (page - 1) * limit;
    const [groups, total] = await Promise.all([
      VisaGroup.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      VisaGroup.countDocuments(filter),
    ]);

    // Entry counts make the list useful without opening each group.
    const counts = await VisaIssuance.aggregate([
      { $match: { agencyId: new mongoose.Types.ObjectId(agencyId), groupId: { $in: groups.map((g) => g._id) } } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return {
      data: groups.map((g) => ({ ...g, entryCount: countMap.get(g._id.toString()) || 0 })),
      total,
    };
  },

  async getById(agencyId: string, id: string) {
    const group = await VisaGroup.findOne({ _id: id, agencyId }).lean();
    if (!group) throw new NotFoundError('Visa group');
    const entries = await VisaIssuance.find({ agencyId, groupId: id })
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();
    return { ...group, entries };
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    if (!data.name || !String(data.name).trim()) throw new AppError('A group name is required', 400);

    const groupNumber = (data.groupNumber as string)?.trim() || (await nextGroupNumber(agencyId));
    const exists = await VisaGroup.findOne({ agencyId, groupNumber });
    if (exists) throw new AppError(`Group number ${groupNumber} is already in use`, 409);

    return VisaGroup.create({
      agencyId,
      groupNumber,
      name: String(data.name).trim(),
      partnerCompany: data.partnerCompany,
      destination: data.destination,
      travelDate: data.travelDate,
      notes: data.notes,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const group = await VisaGroup.findOneAndUpdate(
      { _id: id, agencyId },
      {
        $set: {
          name: data.name,
          partnerCompany: data.partnerCompany,
          destination: data.destination,
          travelDate: data.travelDate,
          notes: data.notes,
          status: data.status,
        },
      },
      { new: true, runValidators: true }
    );
    if (!group) throw new NotFoundError('Visa group');
    return group;
  },

  async delete(agencyId: string, id: string) {
    const group = await VisaGroup.findOne({ _id: id, agencyId });
    if (!group) throw new NotFoundError('Visa group');

    const entries = await VisaIssuance.countDocuments({ agencyId, groupId: id });
    if (entries > 0) {
      throw new AppError(`This group has ${entries} entr${entries === 1 ? 'y' : 'ies'} — remove them before deleting it`, 400);
    }
    return VisaGroup.findByIdAndDelete(id);
  },

  /** The whole group as a printable manifest. */
  async generatePDF(agencyId: string, id: string, entryIds?: string[]): Promise<Buffer> {
    const [agency, group] = await Promise.all([
      Agency.findById(agencyId),
      VisaGroup.findOne({ _id: id, agencyId }).lean(),
    ]);
    if (!agency) throw new NotFoundError('Agency');
    if (!group) throw new NotFoundError('Visa group');

    const filter: Record<string, unknown> = { agencyId, groupId: id };
    if (entryIds?.length) filter._id = { $in: entryIds };

    const entries = await VisaIssuance.find(filter).sort({ issueDate: 1, createdAt: 1 }).lean();
    if (!entries.length) throw new AppError('This group has no entries to print yet', 400);

    const rows: ManifestRow[] = entries.map((e) => ({
      passportNumber: e.passportNumber,
      name: e.travellerName,
      documentNumber: e.documentNumber,
      purpose: e.purpose,
      issueDate: e.issueDate,
    }));

    const allTickets = entries.every((e) => e.type === 'ticket');
    return generateVisaBatchPDF(agency, rows, {
      groupNumber: group.groupNumber,
      groupName: group.name,
      partnerCompany: group.partnerCompany,
      numberLabel: allTickets ? 'Ticket Number' : 'Visa Number',
    });
  },
};
