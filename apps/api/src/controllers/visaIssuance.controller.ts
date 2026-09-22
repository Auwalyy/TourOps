import { Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { AuthRequest } from '../types/express';
import { visaIssuanceService } from '../services/visaIssuance.service';
import { visaGroupService } from '../services/visaGroup.service';
import { cloudinary } from '../config/cloudinary';
import { createDocumentUpload } from '../utils/upload';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const issuanceUpload = createDocumentUpload().single('file');

function uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'tourops/issued-documents', resource_type: 'auto' },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(file.buffer).pipe(stream);
  });
}

export const visaIssuanceController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await visaIssuanceService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaIssuanceService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  /**
   * Accepts the record and (optionally) the visa/ticket file in one
   * multipart request, so staff add an entry in a single step.
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload: Record<string, unknown> = { ...req.body };
      if (req.file) {
        const { url, publicId } = await uploadToCloudinary(req.file);
        payload.fileUrl = url;
        payload.publicId = publicId;
        payload.fileType = req.file.mimetype;
        payload.fileSize = req.file.size;
      }
      const entry = await visaIssuanceService.create(
        req.user!.agencyId!.toString(), req.user!.id, payload
      );
      sendCreated(res, entry, 'Document recorded');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload: Record<string, unknown> = { ...req.body };
      if (req.file) {
        const { url, publicId } = await uploadToCloudinary(req.file);
        payload.fileUrl = url;
        payload.publicId = publicId;
        payload.fileType = req.file.mimetype;
        payload.fileSize = req.file.size;
      }
      sendSuccess(
        res,
        await visaIssuanceService.update(req.user!.agencyId!.toString(), req.params.id, payload),
        'Updated'
      );
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await visaIssuanceService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  },

  async batchPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await visaIssuanceService.generatePDF(
        req.user!.agencyId!.toString(), req.body.ids, req.body.title
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="visa-list.pdf"');
      res.send(buffer);
    } catch (e) { next(e); }
  },
};

export const visaGroupController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await visaGroupService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaGroupService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const group = await visaGroupService.create(req.user!.agencyId!.toString(), req.user!.id, req.body);
      sendCreated(res, group, 'Group created');
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await visaGroupService.update(req.user!.agencyId!.toString(), req.params.id, req.body), 'Group updated');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await visaGroupService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Group deleted');
    } catch (e) { next(e); }
  },

  async downloadPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const entryIds = req.query.ids ? String(req.query.ids).split(',') : undefined;
      const buffer = await visaGroupService.generatePDF(
        req.user!.agencyId!.toString(), req.params.id, entryIds
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="visa-group-list.pdf"');
      res.send(buffer);
    } catch (e) { next(e); }
  },
};
