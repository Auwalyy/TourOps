import { Router } from 'express';
import { aiController, passportUpload, passportBatchUpload } from '../controllers/ai.controller';
import { authenticate } from '../middleware/authenticate';
import { requireFeature } from '../middleware/requireFeature';

const router = Router();
router.use(authenticate, requireFeature('ai'));

router.post('/passport/extract', passportUpload, aiController.extractPassport);
router.post('/passports/extract-batch', passportBatchUpload, aiController.extractPassportBatch);
router.post('/documents/:id/validate', aiController.validateDocument);
router.post('/documents/missing', aiController.detectMissingDocuments);
router.get('/reports/summary', aiController.getBusinessSummary);
router.post('/recommendations/packages', aiController.getPackageRecommendations);
router.get('/recommendations/similar/:id', aiController.getSimilarPackages);

export default router;
