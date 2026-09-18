import mongoose, { Document, Schema } from 'mongoose';

export type BookingType =
  | 'flight'
  | 'ticket'
  | 'visa'
  | 'hotel'
  | 'transport'
  | 'tour'
  | 'activity'
  | 'package'
  | 'other';

export type BookingStatus = 'draft' | 'pending' | 'reserved' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';

export interface IBookingStatusHistory {
  from: BookingStatus;
  to: BookingStatus;
  reason?: string;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
}

export interface IBookingDocument {
  documentId: mongoose.Types.ObjectId;
  visibleToCustomer: boolean;
}

export interface IBookingDetails {
  // Flight
  airline?: string;
  flightNumber?: string;
  departureLocation?: string;
  arrivalLocation?: string;
  departureDateTime?: Date;
  arrivalDateTime?: Date;
  returnDepartureDateTime?: Date;
  returnArrivalDateTime?: Date;
  ticketNumber?: string;
  pnr?: string;
  baggageAllowance?: string;
  seatNumber?: string;
  // Hotel
  hotelName?: string;
  hotelAddress?: string;
  city?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  roomType?: string;
  numberOfRooms?: number;
  numberOfNights?: number;
  guestCount?: number;
  // Transport
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDateTime?: Date;
  // Visa
  visaType?: string;
  destinationCountry?: string;
  numberOfApplicants?: number;
  entryType?: string; // single / multiple
  processingType?: string; // standard / express
  // Tour / Activity
  tourName?: string;
  location?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  numberOfParticipants?: number;
  // Shared
  providerName?: string;
  passengerCount?: number;
  bookingReference?: string;
  notes?: string;
}

export interface IBooking extends Document {
  agencyId: mongoose.Types.ObjectId;
  bookingNumber: string;
  /** Optional — a booking can stand alone against just a customer, with no travel file. */
  travelFileId?: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  bookingType: BookingType;
  title: string;
  status: BookingStatus;
  statusHistory: IBookingStatusHistory[];
  provider?: string;
  startDate?: Date;
  endDate?: Date;
  cost: number;
  /** Cached from verified Payment documents — Payment is the source of truth. */
  amountPaid: number;
  currency: string;
  tourPackageId?: mongoose.Types.ObjectId;
  /**
   * For `visa` bookings: the application this charge is for. The booking holds
   * what the customer is billed; the application holds the workflow. Linking
   * them keeps one number per charge instead of a fee in two places.
   */
  visaApplicationId?: mongoose.Types.ObjectId;
  details: IBookingDetails;
  documents: IBookingDocument[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IBookingStatusHistory>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingDocumentSchema = new Schema<IBookingDocument>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    visibleToCustomer: { type: Boolean, default: false },
  },
  { _id: false }
);

const detailsSchema = new Schema<IBookingDetails>(
  {
    airline: String, flightNumber: String,
    departureLocation: String, arrivalLocation: String,
    departureDateTime: Date, arrivalDateTime: Date,
    returnDepartureDateTime: Date, returnArrivalDateTime: Date,
    ticketNumber: String, pnr: String,
    baggageAllowance: String, seatNumber: String,
    hotelName: String, hotelAddress: String, city: String,
    checkInDate: Date, checkOutDate: Date,
    roomType: String, numberOfRooms: Number, numberOfNights: Number, guestCount: Number,
    vehicleType: String, driverName: String, driverPhone: String,
    pickupLocation: String, dropoffLocation: String, pickupDateTime: Date,
    visaType: String, destinationCountry: String, numberOfApplicants: Number,
    entryType: String, processingType: String,
    tourName: String, location: String,
    startDateTime: Date, endDateTime: Date, numberOfParticipants: Number,
    providerName: String, passengerCount: Number,
    bookingReference: String, notes: String,
  },
  { _id: false }
);

const bookingSchema = new Schema<IBooking>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    bookingNumber: { type: String, required: true, unique: true },
    travelFileId: { type: Schema.Types.ObjectId, ref: 'TravelFile' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    bookingType: {
      type: String,
      enum: ['flight', 'ticket', 'visa', 'hotel', 'transport', 'tour', 'activity', 'package', 'other'],
      required: true,
    },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'reserved', 'confirmed', 'ticketed', 'cancelled', 'completed'],
      default: 'pending',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    provider: String,
    startDate: Date,
    endDate: Date,
    cost: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'NGN' },
    tourPackageId: { type: Schema.Types.ObjectId, ref: 'TourPackage' },
    visaApplicationId: { type: Schema.Types.ObjectId, ref: 'VisaApplication' },
    details: { type: detailsSchema, default: () => ({}) },
    documents: { type: [bookingDocumentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bookingSchema.index({ agencyId: 1, status: 1 });
bookingSchema.index({ agencyId: 1, travelFileId: 1 });
bookingSchema.index({ agencyId: 1, customerId: 1 });
bookingSchema.index({ agencyId: 1, bookingType: 1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
