import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4']);

import { Agency } from '../models/Agency';
import { User } from '../models/User';

const AGENCY = {
  name: 'TourOps Demo Agency',
  email: 'agency@tourops.com',
  phone: '+2348000000000',
  address: '1 Demo Street, Lagos',
  country: 'Nigeria',
  subscription: { plan: 'professional' as const, status: 'active' as const },
  settings: { currency: 'NGN', timezone: 'Africa/Lagos', dateFormat: 'DD/MM/YYYY' },
};

const PASSWORD = 'Password@123';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  // Upsert agency
  let agency = await Agency.findOne({ email: AGENCY.email });
  if (!agency) {
    agency = await Agency.create(AGENCY);
    console.log('Agency created:', agency.name);
  } else {
    console.log('Agency already exists:', agency.name);
  }

  const agencyId = agency._id as mongoose.Types.ObjectId;

  const users = [
    { firstName: 'System',  lastName: 'Admin',      email: 'admin@tourops.com',       role: 'system_admin'       as const, agencyId: undefined },
    { firstName: 'Agency',  lastName: 'Owner',      email: 'owner@tourops.com',       role: 'agency_owner'       as const, agencyId },
    { firstName: 'Travel',  lastName: 'Consultant', email: 'consultant@tourops.com',  role: 'travel_consultant'  as const, agencyId },
    { firstName: 'Visa',    lastName: 'Officer',    email: 'visa@tourops.com',        role: 'visa_officer'       as const, agencyId },
    { firstName: 'Finance', lastName: 'Officer',    email: 'finance@tourops.com',     role: 'finance_officer'    as const, agencyId },
    { firstName: 'Support', lastName: 'Agent',      email: 'support@tourops.com',     role: 'customer_support'   as const, agencyId },
    { firstName: 'Demo',    lastName: 'Customer',   email: 'customer@tourops.com',    role: 'customer'           as const, agencyId },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      // Force reset password through the model so bcrypt hook fires
      exists.password = PASSWORD;
      await exists.save();
      console.log(`  reset   [${u.role}] ${u.email}`);
    } else {
      const user = new User({ ...u, password: PASSWORD, isActive: true, isEmailVerified: true });
      await user.save();
      console.log(`  created [${u.role}] ${u.email}`);
    }
  }

  console.log('\nSeed complete. Password for all users:', PASSWORD);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
