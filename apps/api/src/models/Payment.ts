import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'mobile_money' | 'other';

/**
 * Single source of truth for every money movement in the system. Both
 * Invoice and TravelFile cache a derived amountPaid/outstandingBalance for
 * fast reads, but this collection is what staff actually record, verify,
 * and reject against — nothing else writes payment history directly.
 */
export interface IPayment extends Document {
  agencyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  travelFileId?: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  visaApplicationId?: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference?: string;
  proofUrl?: string;
  notes?: string;
  status: PaymentStatus;
  recordedBy: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    travelFileId: { type: Schema.Types.ObjectId, ref: 'TravelFile' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    visaApplicationId: { type: Schema.Types.ObjectId, ref: 'VisaApplication' },
    groupId: { type: Schema.Types.ObjectId, ref: 'BookingGroup' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'other'],
      required: true,
    },
    reference: String,
    proofUrl: String,
    notes: String,
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    rejectionReason: String,
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentSchema.index({ agencyId: 1, status: 1 });
paymentSchema.index({ agencyId: 1, travelFileId: 1 });
paymentSchema.index({ agencyId: 1, invoiceId: 1 });
paymentSchema.index({ agencyId: 1, visaApplicationId: 1 });
paymentSchema.index({ agencyId: 1, customerId: 1 });
paymentSchema.index({ agencyId: 1, groupId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
