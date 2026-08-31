import mongoose, { Document, Schema } from 'mongoose';

export type TravelType =
  | 'umrah'
  | 'hajj'
  | 'study_abroad'
  | 'tourist_visa'
  | 'business'
  | 'medical';

export type TravelFileStatus =
  | 'open'
  | 'pending_payment'
  | 'awaiting_documents'
  | 'visa_processing'
  | 'ready_for_departure'
  | 'completed'
  | 'cancelled';

export interface ITimelineEntry {
  action: string;
  description: string;
  performedBy: mongoose.Types.ObjectId;
  performedAt: Date;
}

export interface ITask {
  title: string;
  assignedTo?: mongoose.Types.ObjectId;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done';
  notes?: string;
  createdAt: Date;
}

export interface INote {
  content: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IPayment {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'card' | 'other';
  reference?: string;
  note?: string;
  recordedBy: mongoose.Types.ObjectId;
  paidAt: Date;
}

export interface ITravelFile extends Document {
  agencyId: mongoose.Types.ObjectId;
  fileNumber: string;
  customerId: mongoose.Types.ObjectId;
  travelType: TravelType;
  packageId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  visaApplicationId?: mongoose.Types.ObjectId;
  destination: string;
  departureGroup?: string;
  assignedConsultant?: mongoose.Types.ObjectId;
  assignedVisaOfficer?: mongoose.Types.ObjectId;
  status: TravelFileStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeline: ITimelineEntry[];
  tasks: ITask[];
  notes: INote[];
  totalCost: number;
  amountPaid: number;
  balance: number;
  payments: IPayment[];
  invoiceIds: mongoose.Types.ObjectId[];
  documentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const timelineSchema = new Schema<ITimelineEntry>(
  {
    action: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
    notes: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const noteSchema = new Schema<INote>(
  {
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const paymentSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'bank_transfer', 'card', 'other'], default: 'cash' },
    reference: String,
    note: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const travelFileSchema = new Schema<ITravelFile>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    fileNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    travelType: {
      type: String,
      enum: ['umrah', 'hajj', 'study_abroad', 'tourist_visa', 'business', 'medical'],
      required: true,
    },
    packageId: { type: Schema.Types.ObjectId, ref: 'TourPackage' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    visaApplicationId: { type: Schema.Types.ObjectId, ref: 'VisaApplication' },
    destination: { type: String, required: true },
    departureGroup: String,
    assignedConsultant: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedVisaOfficer: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['open', 'pending_payment', 'awaiting_documents', 'visa_processing', 'ready_for_departure', 'completed', 'cancelled'],
      default: 'open',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    totalCost: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    payments: { type: [paymentSchema], default: [] },
    timeline: { type: [timelineSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true }
);

travelFileSchema.virtual('balance').get(function () {
  return this.totalCost - this.amountPaid;
});

travelFileSchema.set('toJSON', { virtuals: true });

travelFileSchema.index({ agencyId: 1, status: 1 });
travelFileSchema.index({ agencyId: 1, customerId: 1 });
travelFileSchema.index({ agencyId: 1, travelType: 1 });

export const TravelFile = mongoose.model<ITravelFile>('TravelFile', travelFileSchema);
