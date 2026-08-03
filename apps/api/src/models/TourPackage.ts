import mongoose, { Document, Schema } from 'mongoose';

export interface IItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
  accommodation?: string;
  meals?: string[];
}

export interface ITourPackage extends Document {
  agencyId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  category: 'tour' | 'hajj_umrah' | 'study_abroad' | 'visa' | 'custom';
  destinations: string[];
  duration: { days: number; nights: number };
  pricing: {
    basePrice: number;
    currency: string;
    pricePerPerson: boolean;
    discountedPrice?: number;
  };
  inclusions: string[];
  exclusions: string[];
  itinerary: IItineraryDay[];
  gallery: string[];
  coverImage?: string;
  availability: {
    startDate?: Date;
    endDate?: Date;
    maxCapacity?: number;
    currentBookings: number;
  };
  status: 'draft' | 'active' | 'inactive' | 'archived';
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const itineraryDaySchema = new Schema<IItineraryDay>(
  {
    day: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    activities: [String],
    accommodation: String,
    meals: [String],
  },
  { _id: false }
);

const tourPackageSchema = new Schema<ITourPackage>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['tour', 'hajj_umrah', 'study_abroad', 'visa', 'custom'],
      required: true,
    },
    destinations: { type: [String], required: true },
    duration: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },
    pricing: {
      basePrice: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
      pricePerPerson: { type: Boolean, default: true },
      discountedPrice: Number,
    },
    inclusions: [String],
    exclusions: [String],
    itinerary: [itineraryDaySchema],
    gallery: [String],
    coverImage: String,
    availability: {
      startDate: Date,
      endDate: Date,
      maxCapacity: Number,
      currentBookings: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive', 'archived'],
      default: 'draft',
    },
    tags: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

tourPackageSchema.index({ agencyId: 1, status: 1 });
tourPackageSchema.index({ agencyId: 1, slug: 1 }, { unique: true });
tourPackageSchema.index({ agencyId: 1, title: 'text', description: 'text' });

export const TourPackage = mongoose.model<ITourPackage>('TourPackage', tourPackageSchema);
