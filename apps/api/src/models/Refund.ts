import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod } from './Payment';

export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface IRefund extends Document {
  agencyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  travelFileId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  reason: string;
  method: PaymentMethod;
  status: RefundStatus;
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  reference?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    travelFileId: { type: Schema.Types.ObjectId, ref: 'TravelFile' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    reason: { type: String, required: true },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'completed'],
      default: 'requested',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    processedAt: Date,
    reference: String,
    rejectionReason: String,
    notes: String,
  },
  { timestamps: true }
);

refundSchema.index({ agencyId: 1, status: 1 });
refundSchema.index({ agencyId: 1, invoiceId: 1 });
refundSchema.index({ agencyId: 1, customerId: 1 });

export const Refund = mongoose.model<IRefund>('Refund', refundSchema);
