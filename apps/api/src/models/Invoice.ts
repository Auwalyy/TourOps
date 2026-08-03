import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentRecord {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'card' | 'mobile_money' | 'other';
  reference?: string;
  paidAt: Date;
  recordedBy: mongoose.Types.ObjectId;
  notes?: string;
}

export interface IInvoice extends Document {
  agencyId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  currency: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  dueDate?: Date;
  payments: IPaymentRecord[];
  notes?: string;
  pdfUrl?: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'other'],
      required: true,
    },
    reference: String,
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String,
  },
  { _id: true }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    lineItems: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'],
      default: 'draft',
    },
    dueDate: Date,
    payments: { type: [paymentRecordSchema], default: [] },
    notes: String,
    pdfUrl: String,
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.index({ agencyId: 1, status: 1 });
invoiceSchema.index({ agencyId: 1, customerId: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
