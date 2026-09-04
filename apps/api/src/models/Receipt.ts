import mongoose, { Document, Schema } from 'mongoose';

export interface IReceipt extends Document {
  agencyId: mongoose.Types.ObjectId;
  receiptNumber: string;
  customerId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  travelFileId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: 'cash' | 'bank_transfer' | 'card' | 'mobile_money' | 'other';
  reference?: string;
  description: string;
  notes?: string;
  paidAt: Date;
  issuedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    receiptNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    travelFileId: { type: Schema.Types.ObjectId, ref: 'TravelFile' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'other'],
      required: true,
    },
    reference: String,
    description: { type: String, required: true },
    notes: String,
    paidAt: { type: Date, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

receiptSchema.index({ agencyId: 1, createdAt: -1 });
receiptSchema.index({ agencyId: 1, customerId: 1 });
receiptSchema.index({ receiptNumber: 1 }, { unique: true });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema);
