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
    /**
     * A cached label for listing and filtering. The authoritative answer to
     * "can this agency still use the app?" is derived from the dates below by
     * subscriptionService.accessState() — never from this string alone.
     */
    status: 'trialing' | 'active' | 'grace' | 'locked' | 'cancelled' | 'trial' | 'inactive';
    billingCycle?: 'monthly' | 'yearly';
    /** End of the free trial. */
    trialEndsAt?: Date;
    /** Paid through this date. */
    currentPeriodEnd?: Date;
    lastPaymentAt?: Date;
    /** Set by the platform owner to hand out extra time manually. */
    extendedUntil?: Date;
    /** Legacy field kept so older documents keep validating. */
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
      status: {
        type: String,
        enum: ['trialing', 'active', 'grace', 'locked', 'cancelled', 'trial', 'inactive'],
        default: 'trialing',
      },
      billingCycle: { type: String, enum: ['monthly', 'yearly'] },
      trialEndsAt: Date,
      currentPeriodEnd: Date,
      lastPaymentAt: Date,
      extendedUntil: Date,
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
      primaryColor: { type: String, default: '#0d6e52' },
      logoUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const Agency = mongoose.model<IAgency>('Agency', agencySchema);
