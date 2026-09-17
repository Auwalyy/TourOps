/**
 * Reconciles MongoDB's actual indexes with what the Mongoose schemas declare.
 *
 * Mongoose creates missing indexes automatically but never removes stale ones,
 * so a renamed or dropped field leaves its old index behind. When that index is
 * unique, every document written without the field collides on `null` — which
 * silently breaks creating more than one booking, document or payment.
 *
 * Safe to run on every deploy: it only drops indexes no schema declares.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

import { Agency } from '../models/Agency';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { TourPackage } from '../models/TourPackage';
import { TravelFile } from '../models/TravelFile';
import { Booking } from '../models/Booking';
import { VisaApplication } from '../models/VisaApplication';
import { Invoice } from '../models/Invoice';
import { Receipt } from '../models/Receipt';
import { DocumentFile } from '../models/Document';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { Payment } from '../models/Payment';
import { Refund } from '../models/Refund';
import { BookingGroup } from '../models/BookingGroup';
import { Branch } from '../models/Branch';

const MODELS = [
  Agency, User, Customer, TourPackage, TravelFile, Booking, VisaApplication,
  Invoice, Receipt, DocumentFile, Notification, AuditLog, Payment, Refund,
  BookingGroup, Branch,
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB — syncing indexes');

  for (const model of MODELS) {
    try {
      const dropped = await model.syncIndexes();
      if (dropped?.length) {
        console.log(`  ${model.collection.name}: dropped stale index(es) ${dropped.join(', ')}`);
      } else {
        console.log(`  ${model.collection.name}: up to date`);
      }
    } catch (err: any) {
      // Never let index maintenance take down a deploy.
      console.error(`  ${model.collection.name}: sync failed — ${err.message}`);
    }
  }

  console.log('Index sync complete.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
