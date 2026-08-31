import { documentRepository } from '../repositories/document.repository';
import { cloudinary } from '../config/cloudinary';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

export const documentService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return documentRepository.search({
      agencyId,
      customerId: query.customerId as string,
      bookingId: query.bookingId as string,
      visaApplicationId: query.visaApplicationId as string,
      travelFileId: query.travelFileId as string,
      category: query.category as string,
      search: query.search as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const doc = await documentRepository.findOne({ _id: id, agencyId });
    if (!doc) throw new NotFoundError('Document');
    return doc;
  },

  async upload(agencyId: string, userId: string, file: Express.Multer.File, metadata: Record<string, unknown>) {
    const doc = await documentRepository.create({
      agencyId,
      uploadedBy: userId,
      name: metadata.name || file.originalname,
      originalName: file.originalname,
      category: metadata.category || 'other',
      fileUrl: (file as any).path,
      publicId: (file as any).filename,
      fileType: file.mimetype,
      fileSize: file.size,
      customerId: metadata.customerId,
      bookingId: metadata.bookingId,
      visaApplicationId: metadata.visaApplicationId,
      travelFileId: metadata.travelFileId,
      expiryDate: metadata.expiryDate,
      tags: metadata.tags ? String(metadata.tags).split(',') : [],
      notes: metadata.notes,
    } as any);

    // Auto-link to travel file documentIds array
    if (metadata.travelFileId) {
      const { TravelFile } = await import('../models/TravelFile');
      await TravelFile.findByIdAndUpdate(metadata.travelFileId, {
        $addToSet: { documentIds: doc._id },
      });
    }

    return doc;
  },

  async uploadNewVersion(agencyId: string, id: string, userId: string, file: Express.Multer.File) {
    const doc = await documentRepository.findOne({ _id: id, agencyId });
    if (!doc) throw new NotFoundError('Document');

    return documentRepository.updateById(id, {
      fileUrl: (file as any).path,
      publicId: (file as any).filename,
      fileType: file.mimetype,
      fileSize: file.size,
      version: doc.version + 1,
      $push: {
        previousVersions: {
          fileUrl: doc.fileUrl,
          publicId: doc.publicId,
          uploadedAt: doc.updatedAt,
          version: doc.version,
        },
      },
    });
  },

  async delete(agencyId: string, id: string) {
    const doc = await documentRepository.findOne({ _id: id, agencyId });
    if (!doc) throw new NotFoundError('Document');
    await cloudinary.uploader.destroy(doc.publicId);
    return documentRepository.deleteById(id);
  },

  async getExpiringSoon(agencyId: string, days?: number) {
    return documentRepository.getExpiringSoon(agencyId, days);
  },
};
