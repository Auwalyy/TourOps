import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
  agencyId: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    name: { type: String, required: true, trim: true },
    address: String,
    phone: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ agencyId: 1, isActive: 1 });

export const Branch = mongoose.model<IBranch>('Branch', branchSchema);
