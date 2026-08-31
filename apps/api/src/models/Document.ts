import mongoose, { Document, Schema } from 'mongoose';

export type DocumentStatus =
  | 'required'
  | 'missing'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'not_applicable';

export interface IDocument extends Document {
  agencyId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  visaApplicationId?: mongoose.Types.ObjectId;
  travelFileId?: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  status: DocumentStatus;
  name: string;
  originalName: string;
  category: 'passport' | 'visa' | 'ticket' | 'hotel' | 'insurance' | 'financial' | 'photo' | 'other';
  fileUrl: string;
  publicId: string;
  fileType: string;
  fileSize: number;
  expiryDate?: Date;
  isExpired: boolean;
  version: number;
  previousVersions: Array<{
    fileUrl: string;
    publicId: string;
    uploadedAt: Date;
    version: number;
  }>;
  tags: string[];
  notes?: string;
  aiValidation?: {
    isValid?: boolean;
    issues?: string[];
    suggestions?: string[];
    processedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    visaApplicationId: { type: Schema.Types.ObjectId, ref: 'VisaApplication' },
    travelFileId: { type: Schema.Types.ObjectId, ref: 'TravelFile' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNote: String,
    status: {
      type: String,
      enum: ['required', 'missing', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'not_applicable'],
      default: 'submitted',
    },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    category: {
      type: String,
      enum: ['passport', 'visa', 'ticket', 'hotel', 'insurance', 'financial', 'photo', 'other'],
      default: 'other',
    },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    expiryDate: Date,
    isExpired: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        fileUrl: String,
        publicId: String,
        uploadedAt: Date,
        version: Number,
      },
    ],
    tags: [String],
    notes: String,
    aiValidation: {
      isValid: Boolean,
      issues: [String],
      suggestions: [String],
      processedAt: Date,
    },
  },
  { timestamps: true }
);

documentSchema.index({ agencyId: 1, customerId: 1 });
documentSchema.index({ agencyId: 1, travelFileId: 1 });
documentSchema.index({ agencyId: 1, category: 1 });
documentSchema.index({ expiryDate: 1, isExpired: 1 });

export const DocumentFile = mongoose.model<IDocument>('Document', documentSchema);
