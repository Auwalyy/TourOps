import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  agencyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'booking' | 'visa' | 'payment' | 'appointment' | 'document' | 'system';
  referenceId?: mongoose.Types.ObjectId;
  referenceModel?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['booking', 'visa', 'payment', 'appointment', 'document', 'system'],
      required: true,
    },
    referenceId: Schema.Types.ObjectId,
    referenceModel: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ agencyId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
