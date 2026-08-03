import mongoose, { Document, Schema } from 'mongoose';

export type VisaStatus =
  | 'draft'
  | 'documents_pending'
  | 'documents_submitted'
  | 'appointment_scheduled'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface IVisaStatusHistory {
  status: VisaStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  note?: string;
}

export interface IVisaApplication extends Document {
  agencyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  assignedOfficer?: mongoose.Types.ObjectId;
  visaType: string;
  destinationCountry: string;
  purposeOfTravel: string;
  applicationDate: Date;
  travelDate?: Date;
  returnDate?: Date;
  status: VisaStatus;
  statusHistory: IVisaStatusHistory[];
  appointment?: {
    date?: Date;
    time?: string;
    location?: string;
    confirmationNumber?: string;
  };
  embassy?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  documents: mongoose.Types.ObjectId[];
  notes: string;
  dueDate?: Date;
  fees?: number;
  referenceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const visaStatusHistorySchema = new Schema<IVisaStatusHistory>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
);

const visaApplicationSchema = new Schema<IVisaApplication>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedOfficer: { type: Schema.Types.ObjectId, ref: 'User' },
    visaType: { type: String, required: true },
    destinationCountry: { type: String, required: true },
    purposeOfTravel: { type: String, required: true },
    applicationDate: { type: Date, default: Date.now },
    travelDate: Date,
    returnDate: Date,
    status: {
      type: String,
      enum: ['draft', 'documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review', 'approved', 'rejected', 'cancelled'],
      default: 'draft',
    },
    statusHistory: { type: [visaStatusHistorySchema], default: [] },
    appointment: {
      date: Date,
      time: String,
      location: String,
      confirmationNumber: String,
    },
    embassy: {
      name: String,
      address: String,
      phone: String,
      email: String,
    },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    notes: { type: String, default: '' },
    dueDate: Date,
    fees: Number,
    referenceNumber: String,
  },
  { timestamps: true }
);

visaApplicationSchema.index({ agencyId: 1, status: 1 });
visaApplicationSchema.index({ agencyId: 1, customerId: 1 });
visaApplicationSchema.index({ agencyId: 1, assignedOfficer: 1 });

export const VisaApplication = mongoose.model<IVisaApplication>('VisaApplication', visaApplicationSchema);
