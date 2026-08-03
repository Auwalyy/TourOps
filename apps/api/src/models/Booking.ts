import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus =
  | 'enquiry'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface IBookingStatusHistory {
  status: BookingStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  note?: string;
}

export interface IBooking extends Document {
  agencyId: mongoose.Types.ObjectId;
  referenceNumber: string;
  customerId: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  bookingType: 'package' | 'visa' | 'custom';
  status: BookingStatus;
  statusHistory: IBookingStatusHistory[];
  travelDate?: Date;
  returnDate?: Date;
  numberOfTravelers: number;
  travelers: Array<{
    firstName: string;
    lastName: string;
    passportNumber?: string;
  }>;
  quotation?: {
    amount: number;
    currency: string;
    validUntil?: Date;
    notes?: string;
  };
  totalAmount: number;
  currency: string;
  notes: string;
  documents: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const bookingStatusHistorySchema = new Schema<IBookingStatusHistory>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
);

const bookingSchema = new Schema<IBooking>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    referenceNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'TourPackage' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    bookingType: { type: String, enum: ['package', 'visa', 'custom'], required: true },
    status: {
      type: String,
      enum: ['enquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
      default: 'enquiry',
    },
    statusHistory: { type: [bookingStatusHistorySchema], default: [] },
    travelDate: Date,
    returnDate: Date,
    numberOfTravelers: { type: Number, default: 1 },
    travelers: [
      {
        firstName: String,
        lastName: String,
        passportNumber: String,
      },
    ],
    quotation: {
      amount: Number,
      currency: String,
      validUntil: Date,
      notes: String,
    },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: { type: String, default: '' },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true }
);

bookingSchema.index({ agencyId: 1, status: 1 });
bookingSchema.index({ agencyId: 1, customerId: 1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
