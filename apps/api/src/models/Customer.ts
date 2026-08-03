import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  agencyId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  nationality?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  passport?: {
    number?: string;
    issuedDate?: Date;
    expiryDate?: Date;
    issuedCountry?: string;
    issuedAt?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  tags: string[];
  notes: string;
  status: 'active' | 'inactive' | 'archived';
  source?: string;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}

const customerSchema = new Schema<ICustomer>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    dateOfBirth: Date,
    nationality: String,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    passport: {
      number: String,
      issuedDate: Date,
      expiryDate: Date,
      issuedCountry: String,
      issuedAt: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    tags: { type: [String], default: [] },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
    source: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

customerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

customerSchema.index({ agencyId: 1, email: 1 }, { unique: true });
customerSchema.index({ agencyId: 1, status: 1 });
customerSchema.index({ agencyId: 1, firstName: 'text', lastName: 'text', email: 'text' });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
