import { Router, Request, Response, NextFunction } from 'express';
import { TravelFile } from '../models/TravelFile';
import { TourPackage } from '../models/TourPackage';
import { Agency } from '../models/Agency';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import cloudinary from '../config/cloudinary';
import multer from 'multer';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (err, result) => {
      if (err || !result) return reject(err);
      resolve(result.secure_url);
    });
    Readable.from(buffer).pipe(stream);
  });
}

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

// Public — deals/packages for a specific agency (shareable link)
router.get('/deals/:agencyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agencyId } = req.params;
    const agency = await Agency.findById(agencyId).select('name branding logo').lean();
    if (!agency) throw new NotFoundError('Agency not found');

    const deals = await TourPackage.find({ agencyId, status: 'active' })
      .select('title description category destinations duration pricing coverImage gallery isFeatured eventDate tags availability whatsappNumber')
      .sort({ isFeatured: -1, createdAt: -1 })
      .lean();

    sendSuccess(res, { agency, deals });
  } catch (e) { next(e); }
});

// Public — customer uploads payment receipt for a travel file
router.post('/track/:fileNumber/receipt', upload.single('receipt'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await TravelFile.findOne({ fileNumber: req.params.fileNumber.toUpperCase() });
    if (!file) throw new NotFoundError('Travel file not found');
    if (!req.file) throw new Error('No file uploaded');

    const url = await uploadToCloudinary(req.file.buffer, 'payment-receipts');
    const amount = parseFloat(req.body.amount) || 0;
    const note = req.body.note || '';

    (file as any).payments = (file as any).payments || [];
    (file as any).payments.push({
      amount,
      method: 'bank_transfer',
      paidAt: new Date(),
      reference: url,
      note: note || 'Receipt uploaded by customer',
    });

    file.timeline.push({
      action: 'Payment Receipt Uploaded',
      description: `Customer uploaded a payment receipt${amount ? ` for ${amount}` : ''}`,
      performedBy: (file as any).customerId,
      performedAt: new Date(),
      source: 'customer',
    } as any);

    await (file as any).save();
    sendSuccess(res, { receiptUrl: url }, 'Receipt uploaded successfully');
  } catch (e) { next(e); }
});

// Public — customer sends a note on their travel file
router.post('/track/:fileNumber/note', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await TravelFile.findOne({ fileNumber: req.params.fileNumber.toUpperCase() });
    if (!file) throw new NotFoundError('Travel file not found');

    const { content } = req.body;
    if (!content?.trim()) throw new Error('Note content is required');

    file.notes.push({
      content: `[Customer] ${content.trim()}`,
      createdBy: (file as any).customerId,
      visibility: 'shared',
      createdAt: new Date(),
    } as any);

    file.timeline.push({
      action: 'Customer Note Added',
      description: content.trim().slice(0, 100),
      performedBy: (file as any).customerId,
      performedAt: new Date(),
      source: 'customer',
    } as any);

    await (file as any).save();
    sendSuccess(res, {}, 'Note sent successfully');
  } catch (e) { next(e); }
});

export default router;
