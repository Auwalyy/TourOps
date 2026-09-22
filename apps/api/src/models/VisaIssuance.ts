import mongoose, { Document, Schema } from 'mongoose';

export type IssuanceType = 'visa' | 'ticket' | 'other';

/**
 * One issued document — a visa or a ticket — recorded against a traveller by
 * name and passport number, with the file itself attached.
 *
 * Deliberately NOT tied to a Customer record: most of these come from batches
 * another travel company hands over, where the traveller isn't your own
 * customer and never will be. customerId/visaApplicationId are there to link
 * back when it IS your own customer, but nothing requires them.
 */
export interface IVisaIssuance extends Document {
  agencyId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  type: IssuanceType;
  travellerName: string;
  passportNumber: string;
  /** Visa number for a visa, ticket number for a ticket. */
  documentNumber?: string;
  purpose?: string;
  issueDate: Date;
  expiryDate?: Date;
  fileUrl?: string;
  publicId?: string;
  fileType?: string;
  fileSize?: number;
  notes?: string;
  /** Optional links when this is your own customer's, not a partner's. */
  customerId?: mongoose.Types.ObjectId;
  visaApplicationId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visaIssuanceSchema = new Schema<IVisaIssuance>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'VisaGroup' },
    type: { type: String, enum: ['visa', 'ticket', 'other'], default: 'visa' },
    travellerName: { type: String, required: true, trim: true },
    passportNumber: { type: String, required: true, trim: true, uppercase: true },
    documentNumber: { type: String, trim: true },
    purpose: String,
    issueDate: { type: Date, default: Date.now },
    expiryDate: Date,
    fileUrl: String,
    publicId: String,
    fileType: String,
    fileSize: Number,
    notes: String,
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    visaApplicationId: { type: Schema.Types.ObjectId, ref: 'VisaApplication' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

visaIssuanceSchema.index({ agencyId: 1, groupId: 1 });
visaIssuanceSchema.index({ agencyId: 1, passportNumber: 1 });
visaIssuanceSchema.index({ agencyId: 1, createdAt: -1 });

export const VisaIssuance = mongoose.model<IVisaIssuance>('VisaIssuance', visaIssuanceSchema);
