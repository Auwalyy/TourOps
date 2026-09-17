import mongoose, { Document, Schema } from 'mongoose';

/**
 * A family/cohort booking together (e.g. one man paying for his wife,
 * mother and two children, or a local-government-area Umrah batch).
 * Each member keeps their own TravelFile — with its own documents, visa
 * status and per-person progress — and simply tags it with this group's id.
 * The "shared ledger" is just Payments filtered by groupId across those
 * member travel files, so per-person tracking and group-level totals both
 * fall out of the existing TravelFile/Payment models without duplicating data.
 */
export interface IBookingGroup extends Document {
  agencyId: mongoose.Types.ObjectId;
  name: string;
  primaryContactCustomerId: mongoose.Types.ObjectId;
  departureGroup?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingGroupSchema = new Schema<IBookingGroup>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    name: { type: String, required: true, trim: true },
    primaryContactCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    departureGroup: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

bookingGroupSchema.index({ agencyId: 1, createdAt: -1 });

export const BookingGroup = mongoose.model<IBookingGroup>('BookingGroup', bookingGroupSchema);
