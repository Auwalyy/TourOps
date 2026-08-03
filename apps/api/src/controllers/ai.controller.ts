import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { aiDocumentService } from '../services/ai/document.ai.service';
import { aiReportingService } from '../services/ai/reporting.ai.service';
import { aiRecommendationService } from '../services/ai/recommendations.ai.service';
import { sendSuccess } from '../utils/response';

export const aiController = {
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
