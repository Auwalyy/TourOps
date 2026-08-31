import mongoose, { Document, Schema } from 'mongoose';

export type TravelType =
  | 'umrah'
  | 'hajj'
  | 'study_abroad'
  | 'tourist_visa'
  | 'business'
  | 'medical'
  | 'other';

export type TravelFileStatus =
  | 'draft'
  | 'open'
  | 'pending_payment'
  | 'awaiting_documents'
  | 'visa_processing'
  | 'ready_for_departure'
  | 'completed'
  | 'cancelled'
  | 'archived';

export interface IStatusHistoryEntry {
  previousStatus: TravelFileStatus;
  newStatus: TravelFileStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

export interface ITimelineEntry {
  action: string;
  description: string;
  performedBy: mongoose.Types.ObjectId;
  performedAt: Date;
  source?: string; // 'payment' | 'document' | 'visa' | 'booking' | 'system' | 'staff'
  referenceId?: mongoose.Types.ObjectId;
}

export interface ITask {
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface INote {
  content: string;
  createdBy: mongoose.Types.ObjectId;
  visibility: 'internal' | 'shared'; // internal = staff only, shared = can show customer
  createdAt: Date;
}

export interface IPhysicalFile {
  physicalFileNumber?: string;
  cabinetLocation?: string;
  shelfLocation?: string;
  status: 'at_branch' | 'with_visa_officer' | 'sent_for_processing' | 'with_embassy' | 'returned' | 'archived';
  originalPassportReceived: boolean;
  passportReceivedDate?: Date;
  passportReceivedBy?: mongoose.Types.ObjectId;
  passportReturnedDate?: Date;
  passportReturnedBy?: mongoose.Types.ObjectId;
  staffResponsible?: mongoose.Types.ObjectId;
  notes?: string;
}

export interface ITravelFile extends Document {
  agencyId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  fileNumber: string;
  customerId: mongoose.Types.ObjectId;
  travelType: TravelType;
  packageId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  visaApplicationId?: mongoose.Types.ObjectId;
  destination: string;
  departureDate?: Date;
  returnDate?: Date;
  departureGroup?: string;
  assignedConsultant?: mongoose.Types.ObjectId;
  assignedVisaOfficer?: mongoose.Types.ObjectId;
  status: TravelFileStatus;
  statusHistory: IStatusHistoryEntry[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeline: ITimelineEntry[];
  tasks: ITask[];
  notes: INote[];
  physicalFile: IPhysicalFile;
  totalCost: number;
  amountPaid: number;
  invoiceIds: mongoose.Types.ObjectId[];
  documentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    reason: String,
  },
  { _id: true }
);

const timelineSchema = new Schema<ITimelineEntry>(
  {
    action: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    source: { type: String, default: 'staff' },
    referenceId: { type: Schema.Types.ObjectId },
  },
  { _id: true }
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: Date,
    completedAt: Date,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['todo', 'in_progress', 'completed', 'cancelled'], default: 'todo' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const noteSchema = new Schema<INote>(
  {
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visibility: { type: String, enum: ['internal', 'shared'], default: 'internal' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const physicalFileSchema = new Schema<IPhysicalFile>(
  {
    physicalFileNumber: String,
    cabinetLocation: String,
    shelfLocation: String,
    status: {
      type: String,
      enum: ['at_branch', 'with_visa_officer', 'sent_for_processing', 'with_embassy', 'returned', 'archived'],
      default: 'at_branch',
    },
    originalPassportReceived: { type: Boolean, default: false },
    passportReceivedDate: Date,
    passportReceivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    passportReturnedDate: Date,
    passportReturnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    staffResponsible: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { _id: false }
);

const travelFileSchema = new Schema<ITravelFile>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    fileNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    travelType: {
      type: String,
      enum: ['umrah', 'hajj', 'study_abroad', 'tourist_visa', 'business', 'medical', 'other'],
      required: true,
    },
    packageId: { type: Schema.Types.ObjectId, ref: 'TourPackage' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    visaApplicationId: { type: Schema.Types.ObjectId, ref: 'VisaApplication' },
    destination: { type: String, required: true },
    departureDate: Date,
    returnDate: Date,
    departureGroup: String,
    assignedConsultant: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedVisaOfficer: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'open', 'pending_payment', 'awaiting_documents', 'visa_processing', 'ready_for_departure', 'completed', 'cancelled', 'archived'],
      default: 'open',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    totalCost: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    timeline: { type: [timelineSchema], default: [] },
    tasks: { type: [taskSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    physicalFile: { type: physicalFileSchema, default: () => ({ status: 'at_branch', originalPassportReceived: false }) },
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

travelFileSchema.virtual('balance').get(function () {
  return this.totalCost - this.amountPaid;
});

travelFileSchema.index({ agencyId: 1, status: 1 });
travelFileSchema.index({ agencyId: 1, customerId: 1 });
travelFileSchema.index({ agencyId: 1, travelType: 1 });
travelFileSchema.index({ agencyId: 1, priority: 1 });
travelFileSchema.index({ agencyId: 1, departureDate: 1 });

export const TravelFile = mongoose.model<ITravelFile>('TravelFile', travelFileSchema);
