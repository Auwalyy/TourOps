import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { documentService } from '../services/document.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { cloudinary } from '../config/cloudinary';
import multer from 'multer';
import { Readable } from 'stream';

export const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single('file');

async function uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder: 'tourops/documents', resource_type: 'auto' },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(file.buffer).pipe(upload);
  });
}

export const documentController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, total } = await documentService.list(req.user!.agencyId!.toString(), req.query as any);
      sendPaginated(res, data, total, parseInt(String(req.query.page || 1)), parseInt(String(req.query.limit || 20)));
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await documentService.getById(req.user!.agencyId!.toString(), req.params.id));
    } catch (e) { next(e); }
  },

  async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const { url, publicId } = await uploadToCloudinary(req.file);
      (req.file as any).path = url;
      (req.file as any).filename = publicId;
      const doc = await documentService.upload(req.user!.agencyId!.toString(), req.user!.id, req.file, req.body);
      sendCreated(res, doc, 'Document uploaded');
    } catch (e) { next(e); }
  },

  async uploadNewVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const { url, publicId } = await uploadToCloudinary(req.file);
      (req.file as any).path = url;
      (req.file as any).filename = publicId;
      const doc = await documentService.uploadNewVersion(req.user!.agencyId!.toString(), req.params.id, req.user!.id, req.file);
      sendSuccess(res, doc, 'New version uploaded');
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await documentService.delete(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, null, 'Document deleted');
    } catch (e) { next(e); }
  },

  async getExpiringSoon(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(String(req.query.days || 30));
      sendSuccess(res, await documentService.getExpiringSoon(req.user!.agencyId!.toString(), days));
    } catch (e) { next(e); }
  },
};
