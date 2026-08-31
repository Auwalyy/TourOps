import { Router, Request, Response, NextFunction } from 'express';
import { TravelFile } from '../models/TravelFile';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

const router = Router();

// Public — no authenticate middleware
router.get('/track/:fileNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await TravelFile.findOne({ fileNumber: req.params.fileNumber.toUpperCase() })
      .populate('customerId', 'firstName lastName phone email nationality passport dateOfBirth')
      .populate('assignedConsultant', 'firstName lastName phone email')
      .populate('assignedVisaOfficer', 'firstName lastName phone email')
      .populate('packageId', 'title category duration')
      .populate('documentIds', 'name originalName category fileUrl expiryDate fileType status')
      .populate('timeline.performedBy', 'firstName lastName')
      .lean({ virtuals: true });

    if (!file) throw new NotFoundError('Travel file not found. Please check the file number.');

    // SECURITY: strip internal notes — customers must never see internal staff notes
    const safeFile = {
      ...file,
      notes: (file.notes || []).filter((n: any) => n.visibility === 'shared'),
      // strip internal tasks details — only expose title, status, priority, dueDate
      tasks: (file.tasks || []).map((t: any) => ({
        _id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
      })),
      // never expose statusHistory internals
      statusHistory: undefined,
    };

    sendSuccess(res, safeFile);
  } catch (e) { next(e); }
});

export default router;
