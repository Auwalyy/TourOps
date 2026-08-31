import { FilterQuery } from 'mongoose';
import { DocumentFile, IDocument } from '../models/Document';
import { BaseRepository } from './base.repository';

interface DocumentFilter {
  agencyId: string;
  customerId?: string;
  bookingId?: string;
  visaApplicationId?: string;
  travelFileId?: string;
  category?: string;
  search?: string;
  page: number;
  limit: number;
}

class DocumentRepository extends BaseRepository<IDocument> {
  constructor() {
    super(DocumentFile);
  }

  async search({ agencyId, customerId, bookingId, visaApplicationId, travelFileId, category, search, page, limit }: DocumentFilter) {
    const filter: FilterQuery<IDocument> = { agencyId };
    if (customerId) filter.customerId = customerId;
    if (bookingId) filter.bookingId = bookingId;
    if (visaApplicationId) filter.visaApplicationId = visaApplicationId;
    if (travelFileId) filter.travelFileId = travelFileId;
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    return this.paginate(filter, page, limit, { createdAt: -1 }, 'uploadedBy');
  }

  async getExpiringSoon(agencyId: string, days = 30): Promise<IDocument[]> {
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return DocumentFile.find({
      agencyId,
      expiryDate: { $lte: future, $gte: new Date() },
      isExpired: false,
    })
      .populate('customerId')
      .exec();
  }

  async markExpired(): Promise<void> {
    await DocumentFile.updateMany(
      { expiryDate: { $lt: new Date() }, isExpired: false },
      { $set: { isExpired: true } }
    );
  }
}

export const documentRepository = new DocumentRepository();
