import multer from 'multer';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { aiDocumentService } from '../services/ai/document.ai.service';
import { aiReportingService } from '../services/ai/reporting.ai.service';
import { aiRecommendationService } from '../services/ai/recommendations.ai.service';
import { sendSuccess } from '../utils/response';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const passportUpload = upload.single('passport');

export const aiController = {
  async extractPassport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' }) as any;
      const base64 = req.file.buffer.toString('base64');
      const result = await aiDocumentService.extractPassport(base64, req.file.mimetype);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },

  async validateDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiDocumentService.validateDocument(req.user!.agencyId!.toString(), req.params.id);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },

  async detectMissingDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { visaType, country, uploadedCategories } = req.body;
      const result = await aiDocumentService.detectMissingDocuments(visaType, country, uploadedCategories);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },

  async getBusinessSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await aiReportingService.generateBusinessSummary(req.user!.agencyId!.toString());
      sendSuccess(res, { summary });
    } catch (e) { next(e); }
  },

  async getPackageRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiRecommendationService.getPackageRecommendations(
        req.user!.agencyId!.toString(), req.body
      );
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },

  async getSimilarPackages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiRecommendationService.getSimilarPackages(
        req.user!.agencyId!.toString(), req.params.id
      );
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },
};
