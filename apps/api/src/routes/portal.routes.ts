import { Router, Request, Response, NextFunction } from 'express';
import { TravelFile } from '../models/TravelFile';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

const router = Router();

// Public — no authenticate middleware
router.get('/track/:fileNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await TravelFile.findOne({ fileNumber: req.params.fileNumber.toUpperCase() })
      .populate('customerId', 'firstName lastName phone email nationality passport')
      .populate('assignedConsultant', 'firstName lastName phone email')
      .populate('assignedVisaOfficer', 'firstName lastName phone email')
      .populate('packageId', 'title category duration')
      .populate('documentIds', 'name category fileUrl expiryDate fileType')
      .populate('timeline.performedBy', 'firstName lastName')
      .populate('tasks.assignedTo', 'firstName lastName')
      .lean({ virtuals: true });

    if (!file) throw new NotFoundError('Travel file not found. Please check the file number.');

    sendSuccess(res, file);
  } catch (e) { next(e); }
});

export default router;
