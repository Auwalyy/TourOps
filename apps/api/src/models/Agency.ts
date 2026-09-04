import mongoose, { Document, Schema } from 'mongoose';

export interface IAgency extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  logo?: string;
  website?: string;
  licenseNumber?: string;
  rcNumber?: string;
  whatsappNumber?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  isActive: boolean;
  subscription: {
    plan: 'trial' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'inactive' | 'trial';
    expiresAt?: Date;
  };
  settings: {
    currency: string;
    timezone: string;
    dateFormat: string;
  };
  branding: {
    companyName: string;
    tagline: string;
    primaryColor: string;
    logoUrl: string;
    faviconUrl: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const agencySchema = new Schema<IAgency>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    country: { type: String, required: true },
    logo: String,
    website: String,
    licenseNumber: String,
    rcNumber: String,
    whatsappNumber: String,
    bankDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true },
    subscription: {
      plan: { type: String, enum: ['trial', 'starter', 'professional', 'enterprise'], default: 'trial' },
      status: { type: String, enum: ['active', 'inactive', 'trial'], default: 'trial' },
      expiresAt: Date,
    },
    settings: {
      currency: { type: String, default: 'NGN' },
      timezone: { type: String, default: 'Africa/Lagos' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
    },
    branding: {
      companyName: { type: String, default: '' },
      tagline: { type: String, default: '' },
      primaryColor: { type: String, default: '#2563eb' },
      logoUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const Agency = mongoose.model<IAgency>('Agency', agencySchema);
