import mongoose, { Document, Schema } from 'mongoose';

/**
 * A batch of issued visas kept together under one group number — typically a
 * booking handed over by another travel company, filled in over several days
 * as visas come through. Entries live in the VisaIssuance collection and
 * point back here, so a group can grow without being rewritten.
 */
export interface IVisaGroup extends Document {
  agencyId: mongoose.Types.ObjectId;
  groupNumber: string;
  name: string;
  /** The travel company that handed this group over, if it came from outside. */
  partnerCompany?: string;
  destination?: string;
  travelDate?: Date;
  notes?: string;
  status: 'open' | 'closed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visaGroupSchema = new Schema<IVisaGroup>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    groupNumber: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    partnerCompany: String,
    destination: String,
    travelDate: Date,
    notes: String,
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

visaGroupSchema.index({ agencyId: 1, createdAt: -1 });
visaGroupSchema.index({ agencyId: 1, groupNumber: 1 }, { unique: true });

export const VisaGroup = mongoose.model<IVisaGroup>('VisaGroup', visaGroupSchema);
