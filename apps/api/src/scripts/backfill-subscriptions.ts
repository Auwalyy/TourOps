/**
 * Gives every agency that pre-dates the billing system a subscription window.
 *
 * Access is derived from dates, so an agency with none of them set reads as
 * "locked". Without this, turning billing on would lock out every existing
 * account on the first deploy. Idempotent: agencies that already have a trial
 * or a paid period are left alone.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Agency } from '../models/Agency';

const TRIAL_DAYS = parseInt(process.env.BACKFILL_TRIAL_DAYS || process.env.TRIAL_DAYS || '30', 10);

async function main() {
  await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 15000 });

  const orphans = await Agency.find({
    'subscription.trialEndsAt': { $exists: false },
    'subscription.currentPeriodEnd': { $exists: false },
    'subscription.extendedUntil': { $exists: false },
  });

  if (!orphans.length) {
    console.log('Subscriptions: nothing to backfill');
    await mongoose.disconnect();
    return;
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  for (const agency of orphans) {
    agency.subscription = {
      ...(agency.subscription as any),
      plan: agency.subscription?.plan || 'trial',
      status: 'trialing',
      trialEndsAt,
    } as any;
    await agency.save();
    console.log(`  ${agency.name}: trial until ${trialEndsAt.toISOString().slice(0, 10)}`);
  }

  console.log(`Subscriptions: backfilled ${orphans.length} agency/agencies`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('Subscription backfill failed:', e);
  process.exit(1);
});
