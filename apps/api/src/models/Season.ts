import mongoose, { Document, Schema } from 'mongoose';

export type SeasonType = 'umrah' | 'hajj';
export type SeasonStatus = 'planning' | 'open' | 'closed' | 'departed' | 'completed' | 'archived';

/**
 * A pilgrimage departure the agency sells as one product — "November Umrah
 * 2026", "Hajj 2027". It is the folder staff open to see every pilgrim
 * travelling on it.
 *
 * Each pilgrim is still an ordinary TravelFile tagged with seasonId, so their
 * bookings (ticket, hotel, transport, visa), documents and payments live in
 * one place and every other screen keeps working. The season only holds the
 * shared defaults new pilgrims inherit, and the roll-up across them.
 */
export interface ISeason extends Document {
  agencyId: mongoose.Types.ObjectId;
  type: SeasonType;
  name: string;
  /** 1–12; with year, what the season is filed under. */
  month: number;
  year: number;
  departureDate?: Date;
  returnDate?: Date;
  destination: string;
  packageId?: mongoose.Types.ObjectId;
  /** Default total cost for a new pilgrim — editable per file afterwards. */
  pricePerPerson: number;
  /** Seats on offer; 0 means not capped. */
  capacity: number;
  // Shared arrangements, shown on the folder so staff see the plan at a glance.
  airline?: string;
  makkahHotel?: string;
  madinahHotel?: string;
  status: SeasonStatus;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const seasonSchema = new Schema<ISeason>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    type: { type: String, enum: ['umrah', 'hajj'], required: true },
    name: { type: String, required: true, trim: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000, max: 2100 },
    departureDate: Date,
    returnDate: Date,
    destination: { type: String, default: 'Saudi Arabia', trim: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'TourPackage' },
    pricePerPerson: { type: Number, default: 0, min: 0 },
    capacity: { type: Number, default: 0, min: 0 },
    airline: { type: String, trim: true },
    makkahHotel: { type: String, trim: true },
    madinahHotel: { type: String, trim: true },
    status: {
      type: String,
      enum: ['planning', 'open', 'closed', 'departed', 'completed', 'archived'],
      default: 'open',
    },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

seasonSchema.index({ agencyId: 1, type: 1, year: -1, month: -1 });

export const Season = mongoose.model<ISeason>('Season', seasonSchema);
