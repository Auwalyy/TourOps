import mongoose, { Document, Schema } from 'mongoose';

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
  /** Cached from verified Payment documents — Payment is the source of truth. */
  amountPaid: number;
  outstandingBalance: number;
  totalRefunded: number;
  currency: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  dueDate?: Date;
  notes?: string;
  pdfUrl?: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
    totalRefunded: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'],
      default: 'draft',
    },
    dueDate: Date,
    notes: String,
    pdfUrl: String,
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.index({ agencyId: 1, status: 1 });
invoiceSchema.index({ agencyId: 1, customerId: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
