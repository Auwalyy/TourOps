import mongoose, { Document, Schema } from 'mongoose';
import { PlanId, BillingCycle } from '../config/plans';

/**
 * What an agency paid TourOps — distinct from the Payment collection, which is
 * what an agency's own customers pay the agency.
 */
export interface ISubscriptionPayment extends Document {
  agencyId: mongoose.Types.ObjectId;
  plan: PlanId;
  billingCycle: BillingCycle;
  /** Naira, exactly as charged. */
  amount: number;
  currency: string;
  /** Flutterwave tx_ref — our idempotency key. */
  reference: string;
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  channel?: string;
  paidAt?: Date;
  /** The period this payment bought. */
  periodStart?: Date;
  periodEnd?: Date;
  /** Set when the platform owner recorded the payment by hand instead. */
  recordedManuallyBy?: mongoose.Types.ObjectId;
  gatewayResponse?: string;
  raw?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    plan: { type: String, enum: ['starter', 'professional', 'enterprise'], required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'abandoned'], default: 'pending', index: true },
    channel: String,
    paidAt: Date,
    periodStart: Date,
    periodEnd: Date,
    recordedManuallyBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gatewayResponse: String,
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ agencyId: 1, createdAt: -1 });

export const SubscriptionPayment = mongoose.model<ISubscriptionPayment>(
  'SubscriptionPayment',
  subscriptionPaymentSchema
);
