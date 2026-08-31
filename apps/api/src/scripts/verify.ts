import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { User } from '../models/User';

async function run() {
  await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 10000 });
  const user = await User.findOne({ email: 'owner@tourops.com' }).select('+password');
  if (!user) { console.log('USER NOT FOUND IN DB'); process.exit(1); }
  console.log('email:', user.email);
  console.log('isActive:', user.isActive);
  console.log('hasPassword:', !!user.password);
  console.log('passwordHash:', user.password?.substring(0, 20) + '...');
  const ok = await user.comparePassword('Password@123');
  console.log('Password@123 matches:', ok);
  await mongoose.disconnect();
}

run().catch(console.error);
