import mongoose from 'mongoose';
import { VisaIssuance } from '../models/VisaIssuance';
import { VisaGroup } from '../models/VisaGroup';
import { Agency } from '../models/Agency';
import { generateVisaBatchPDF, ManifestRow } from './pdf.service';
import { NotFoundError, AppError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

export const visaIssuanceService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    const filter: Record<string, unknown> = { agencyId };

    if (query.groupId) filter.groupId = query.groupId;
    // `ungrouped=true` gives the standalone ones issued outside any batch.
    if (query.ungrouped === 'true' || query.ungrouped === true) {
      filter.groupId = { $exists: false };
    }
    if (query.type) filter.type = query.type;
    if (query.search) {
      const rx = { $regex: query.search as string, $options: 'i' };
      filter.$or = [{ travellerName: rx }, { passportNumber: rx }, { documentNumber: rx }];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      VisaIssuance.find(filter)
        .sort({ issueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('groupId', 'groupNumber name')
        .lean(),
      VisaIssuance.countDocuments(filter),
    ]);
    return { data, total };
  },

  async getById(agencyId: string, id: string) {
    const entry = await VisaIssuance.findOne({ _id: id, agencyId }).populate('groupId', 'groupNumber name');
    if (!entry) throw new NotFoundError('Issued document');
    return entry;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    if (!data.travellerName || !String(data.travellerName).trim()) {
      throw new AppError("The traveller's name is required", 400);
    }
    if (!data.passportNumber || !String(data.passportNumber).trim()) {
      throw new AppError('A passport number is required', 400);
    }

    if (data.groupId) {
      const group = await VisaGroup.findOne({ _id: data.groupId as string, agencyId });
      if (!group) throw new NotFoundError('Visa group');
    }

    return VisaIssuance.create({
      agencyId,
      groupId: data.groupId || undefined,
      type: data.type || 'visa',
      travellerName: String(data.travellerName).trim(),
      passportNumber: String(data.passportNumber).trim(),
      documentNumber: data.documentNumber,
      purpose: data.purpose,
      issueDate: data.issueDate || new Date(),
      expiryDate: data.expiryDate,
      fileUrl: data.fileUrl,
      publicId: data.publicId,
      fileType: data.fileType,
      fileSize: data.fileSize,
      notes: data.notes,
      customerId: data.customerId || undefined,
      visaApplicationId: data.visaApplicationId || undefined,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const entry = await VisaIssuance.findOne({ _id: id, agencyId });
    if (!entry) throw new NotFoundError('Issued document');

    const fields = [
      'travellerName', 'passportNumber', 'documentNumber', 'purpose', 'type',
      'issueDate', 'expiryDate', 'notes', 'fileUrl', 'publicId', 'fileType', 'fileSize',
    ] as const;
    for (const f of fields) {
      if (data[f] !== undefined) (entry as any)[f] = data[f];
    }
    // Explicit null moves an entry out of its group without deleting it.
    if (data.groupId !== undefined) {
      (entry as any).groupId = data.groupId || undefined;
    }

    await entry.save();
    return entry;
  },

  async delete(agencyId: string, id: string) {
    const entry = await VisaIssuance.findOne({ _id: id, agencyId });
    if (!entry) throw new NotFoundError('Issued document');
    return VisaIssuance.findByIdAndDelete(id);
  },

  /** Manifest for an arbitrary selection — not necessarily one group. */
  async generatePDF(agencyId: string, ids: string[], title?: string): Promise<Buffer> {
    if (!ids?.length) throw new AppError('Select at least one entry', 400);

    const [agency, entries] = await Promise.all([
      Agency.findById(agencyId),
      VisaIssuance.find({ _id: { $in: ids }, agencyId }).lean(),
    ]);
    if (!agency) throw new NotFoundError('Agency');
    if (!entries.length) throw new NotFoundError('Issued documents');

    const byId = new Map(entries.map((e) => [e._id.toString(), e]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof entries;

    const rows: ManifestRow[] = ordered.map((e) => ({
      passportNumber: e.passportNumber,
      name: e.travellerName,
      documentNumber: e.documentNumber,
      purpose: e.purpose,
      issueDate: e.issueDate,
    }));

    const allTickets = ordered.every((e) => e.type === 'ticket');
    const mixed = !allTickets && ordered.some((e) => e.type === 'ticket');
    return generateVisaBatchPDF(agency, rows, {
      groupName: title,
      numberLabel: allTickets ? 'Ticket Number' : 'Visa Number',
      title: allTickets ? 'TICKET MANIFEST' : mixed ? 'ISSUED DOCUMENTS' : 'VISA MANIFEST',
    });
  },
};
