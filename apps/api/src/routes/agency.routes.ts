import { Router } from 'express';
import { Agency } from '../models/Agency';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { sendSuccess } from '../utils/response';

const router = Router();

// Public — used by frontend before login to load branding
router.get('/branding', async (req, res, next) => {
  try {
    const agencyId = req.query.agencyId as string;
    const filter = agencyId ? { _id: agencyId } : {};
    const agency = await Agency.findOne(filter).select('name branding logo').lean();
    sendSuccess(res, agency ?? {});
  } catch (err) { next(err); }
});

// Protected — agency_owner updates their own branding
router.put('/branding', authenticate, authorize('agency_owner', 'system_admin'), async (req: any, res, next) => {
  try {
    const agency = await Agency.findByIdAndUpdate(
      req.user.agencyId,
      { $set: { branding: req.body } },
      { new: true, runValidators: true }
    ).select('name branding logo');
    sendSuccess(res, agency, 'Branding updated');
  } catch (err) { next(err); }
});

export default router;
