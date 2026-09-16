/**
 * Populates an existing agency with ~45 days of realistic operational data
 * across every module: customers, packages, travel files (tasks/notes/
 * timeline/payments), bookings, visa applications, invoices, receipts,
 * documents, notifications and audit logs.
 *
 * Usage: npm run seed:demo
 * Targets the oldest Agency in the database (i.e. whichever account you
 * registered/seeded first) and WIPES its existing operational data first,
 * so it's safe to re-run. Agency and User accounts are left untouched.
 */
import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4']);

import { Agency } from '../models/Agency';
import { User, IUser } from '../models/User';
import { Customer } from '../models/Customer';
import { TourPackage } from '../models/TourPackage';
import { TravelFile, TravelFileStatus, ITravelFilePayment } from '../models/TravelFile';
import { Booking, BookingStatus, BookingType } from '../models/Booking';
import { VisaApplication, VisaStatus } from '../models/VisaApplication';
import { Invoice } from '../models/Invoice';
import { Receipt } from '../models/Receipt';
import { DocumentFile } from '../models/Document';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

const ObjectId = mongoose.Types.ObjectId;

// ─── Random helpers ─────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randWeighted<T>(pairs: Array<[T, number]>): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [val, w] of pairs) {
    if ((r -= w) <= 0) return val;
  }
  return pairs[0][0];
}
function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}
const NOW = new Date();
const SPAN_DAYS = 45;
/** A Date `daysAgoMax`..0 days in the past, at a plausible office hour. */
function pastDate(daysAgoMax: number, daysAgoMin = 0): Date {
  const days = randInt(daysAgoMin, daysAgoMax);
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(randInt(8, 18), randInt(0, 59), randInt(0, 59), 0);
  return d;
}
/** A Date some days in the future (for departure dates, due dates, appointments). */
function futureDate(daysMin: number, daysMax: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + randInt(daysMin, daysMax));
  return d;
}
function sortAsc(dates: Date[]): Date[] {
  return [...dates].sort((a, b) => a.getTime() - b.getTime());
}

// ─── Name / data pools (Northern Nigeria / Kano-flavoured) ─────────────────
const MALE_FIRST = ['Ibrahim', 'Abdullahi', 'Musa', 'Sani', 'Yusuf', 'Bello', 'Aliyu', 'Umar', 'Suleiman', 'Nura', 'Garba', 'Auwal', 'Ismail', 'Kabiru', 'Lawal', 'Hassan', 'Isah', 'Sadiq', 'Tijjani', 'Aminu'];
const FEMALE_FIRST = ['Aisha', 'Fatima', 'Zainab', 'Hauwa', 'Amina', 'Maryam', 'Khadija', 'Halima', 'Rukayya', 'Safiya', 'Bilkisu', 'Hadiza', 'Farida', 'Jamila', 'Ummi', 'Rahma', 'Zulaiha', "Asma'u", 'Nafisa', 'Hafsat'];
const LAST_NAMES = ['Bello', 'Sani', 'Yusuf', 'Aliyu', 'Garba', 'Umar', 'Suleiman', 'Ibrahim', 'Musa', 'Lawal', 'Abubakar', 'Muhammad', 'Adamu', 'Danjuma', 'Shehu', 'Isyaku', 'Rabiu', 'Tanko', 'Kabir', 'Ahmad'];
const CITIES = ['Kano', 'Kaduna', 'Katsina', 'Sokoto', 'Zaria', 'Jigawa', 'Bauchi', 'Abuja', 'Lagos', 'Gombe'];
const NATIONALITIES: Array<[string, number]> = [['Nigerian', 85], ['Nigerien', 5], ['Chadian', 4], ['Ghanaian', 3], ['Cameroonian', 3]];
const AIRLINES = ['Saudia', 'Qatar Airways', 'Turkish Airlines', 'Emirates', 'Ethiopian Airlines', 'Air Peace', 'EgyptAir'];
const HOTELS = ['Hilton Makkah Convention', 'Anjum Hotel Makkah', 'Elaf Al Mashaer', 'Dar Al Eiman Royal', 'Pullman Zamzam Madina', 'Frontel Al Aqiq'];
const AGENCY_PACKAGES = [
  { title: '14-Day Premium Umrah Package', category: 'hajj_umrah' as const, destinations: ['Makkah', 'Madinah'], days: 14, nights: 13, price: 1850000 },
  { title: 'Economy Umrah — 10 Nights', category: 'hajj_umrah' as const, destinations: ['Makkah', 'Madinah'], days: 10, nights: 10, price: 1150000 },
  { title: 'Hajj 2026 — Full Package', category: 'hajj_umrah' as const, destinations: ['Makkah', 'Madinah', 'Mina'], days: 21, nights: 20, price: 4200000 },
  { title: 'UK Study Visa Consultation & Processing', category: 'study_abroad' as const, destinations: ['United Kingdom'], days: 1, nights: 0, price: 350000 },
  { title: 'Canada Study Permit Package', category: 'study_abroad' as const, destinations: ['Canada'], days: 1, nights: 0, price: 420000 },
  { title: 'Dubai Shopping Festival Tour — 5 Days', category: 'tour' as const, destinations: ['Dubai', 'Abu Dhabi'], days: 5, nights: 4, price: 980000 },
  { title: 'Turkey Explorer — Istanbul & Cappadocia', category: 'tour' as const, destinations: ['Istanbul', 'Cappadocia'], days: 7, nights: 6, price: 1250000 },
  { title: 'Egypt Heritage Tour — Cairo & Luxor', category: 'tour' as const, destinations: ['Cairo', 'Luxor'], days: 6, nights: 5, price: 1100000 },
  { title: 'UAE Business Visa Fast-Track', category: 'visa' as const, destinations: ['United Arab Emirates'], days: 1, nights: 0, price: 280000 },
  { title: 'UK Tourist Visa Assistance', category: 'visa' as const, destinations: ['United Kingdom'], days: 1, nights: 0, price: 300000 },
  { title: 'Malaysia Study & Stopover Package', category: 'study_abroad' as const, destinations: ['Malaysia'], days: 3, nights: 2, price: 650000 },
  { title: 'Custom Corporate Umrah Group Package', category: 'custom' as const, destinations: ['Makkah', 'Madinah'], days: 12, nights: 11, price: 2100000 },
];
const TRAVEL_TYPE_DESTS: Record<string, string[]> = {
  umrah: ['Saudi Arabia (Makkah & Madinah)'],
  hajj: ['Saudi Arabia (Makkah, Madinah & Mina)'],
  study_abroad: ['United Kingdom', 'Canada', 'Malaysia', 'United States'],
  tourist_visa: ['United Arab Emirates', 'Turkey', 'Egypt'],
  business: ['United Arab Emirates', 'China', 'South Africa'],
  medical: ['India', 'Turkey'],
  other: ['Nigeria (Domestic)'],
};
// Sample assets from Cloudinary's public demo cloud — real, working URLs.
const SAMPLE_IMAGES = [
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/couple.jpg',
  'https://res.cloudinary.com/demo/image/upload/lady.jpg',
];
const SAMPLE_PDF = 'https://res.cloudinary.com/demo/image/upload/docs/sample.pdf';

let emailCounter = 0;
function makeEmail(first: string, last: string): string {
  emailCounter += 1;
  const domain = rand(['gmail.com', 'yahoo.com', 'outlook.com']);
  return `${first.toLowerCase()}.${last.toLowerCase()}${emailCounter}@${domain}`;
}
function makePhone(): string {
  return `+234${rand(['70', '80', '81', '90', '91'])}${randInt(10000000, 99999999)}`;
}
function makePassportNumber(): string {
  return `A${randInt(10000000, 99999999)}`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');

  const agency = await Agency.findOne().sort({ createdAt: 1 });
  if (!agency) {
    console.error('No agency found. Register an account first, or run `npm run seed`.');
    process.exit(1);
  }
  const agencyId = agency._id as mongoose.Types.ObjectId;
  console.log(`Seeding demo data for agency: ${agency.name} (${agencyId})`);

  const users = await User.find({ agencyId, isActive: true });
  const owner = users.find((u) => u.role === 'agency_owner') || users[0];
  if (!owner) {
    console.error('No staff users found for this agency. Run `npm run seed` first, or invite staff.');
    process.exit(1);
  }
  const consultant = users.find((u) => u.role === 'travel_consultant') || owner;
  const officer = users.find((u) => u.role === 'visa_officer') || owner;
  const finance = users.find((u) => u.role === 'finance_officer') || owner;
  const support = users.find((u) => u.role === 'customer_support') || owner;
  const staffPool: IUser[] = [owner, consultant, officer, finance, support];
  const customerFacingStaffPool: IUser[] = [owner, consultant, officer, finance, support].filter(
    (u, i, self) => self.indexOf(u) === i
  );

  const prefix = agency.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AGY';

  // Safe to run on every deploy/restart: only seeds an empty agency. Pass
  // --force (or SEED_FORCE=true) to explicitly wipe and regenerate anyway.
  const force = process.argv.includes('--force') || process.env.SEED_FORCE === 'true';
  const existingCount = await TravelFile.countDocuments({ agencyId });
  if (existingCount > 0 && !force) {
    console.log(`Agency already has ${existingCount} travel file(s) — demo data looks present, skipping.`);
    console.log('Pass --force (or set SEED_FORCE=true) to wipe and regenerate anyway.');
    await mongoose.disconnect();
    return;
  }

  console.log('Clearing existing operational data for this agency...');
  await Promise.all([
    Customer.deleteMany({ agencyId }),
    TourPackage.deleteMany({ agencyId }),
    TravelFile.deleteMany({ agencyId }),
    Booking.deleteMany({ agencyId }),
    VisaApplication.deleteMany({ agencyId }),
    Invoice.deleteMany({ agencyId }),
    Receipt.deleteMany({ agencyId }),
    DocumentFile.deleteMany({ agencyId }),
    Notification.deleteMany({ agencyId }),
    AuditLog.deleteMany({ agencyId }),
  ]);

  // ── 1. Customers ──────────────────────────────────────────────────────────
  const CUSTOMER_COUNT = 45;
  const customers = Array.from({ length: CUSTOMER_COUNT }).map(() => {
    const isMale = Math.random() > 0.45;
    const firstName = isMale ? rand(MALE_FIRST) : rand(FEMALE_FIRST);
    const lastName = rand(LAST_NAMES);
    const createdAt = pastDate(SPAN_DAYS, 0);
    const hasPassport = Math.random() > 0.15;
    return {
      _id: new ObjectId(),
      agencyId,
      firstName,
      lastName,
      email: makeEmail(firstName, lastName),
      phone: makePhone(),
      dateOfBirth: pastDate(365 * randInt(20, 55), 365 * 20),
      nationality: randWeighted(NATIONALITIES),
      gender: isMale ? 'male' : 'female',
      address: {
        street: `${randInt(1, 200)} ${rand(['Zoo Road', 'Ibrahim Taiwo Road', 'Murtala Mohammed Way', 'Bompai Road', 'Zaria Road'])}`,
        city: rand(CITIES),
        state: rand(['Kano', 'Kaduna', 'Katsina', 'Jigawa', 'FCT']),
        country: 'Nigeria',
      },
      passport: hasPassport ? {
        number: makePassportNumber(),
        issuedDate: pastDate(365 * 4, 365),
        expiryDate: futureDate(30, 365 * 6),
        issuedCountry: 'Nigeria',
        issuedAt: rand(CITIES),
      } : undefined,
      emergencyContact: {
        name: `${rand(MALE_FIRST.concat(FEMALE_FIRST))} ${rand(LAST_NAMES)}`,
        phone: makePhone(),
        relationship: rand(['Spouse', 'Sibling', 'Parent', 'Child', 'Friend']),
      },
      tags: rand([[], ['VIP'], ['Repeat Customer'], ['Referral'], ['Corporate']]),
      notes: '',
      status: randWeighted<'active' | 'inactive'>([['active', 92], ['inactive', 8]]),
      source: rand(['Walk-in', 'Referral', 'Facebook', 'WhatsApp', 'Instagram']),
      assignedTo: rand(customerFacingStaffPool)._id,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await Customer.insertMany(customers as any, { timestamps: false } as any);
  console.log(`Created ${customers.length} customers`);

  // ── 2. Tour Packages ──────────────────────────────────────────────────────
  const packages = AGENCY_PACKAGES.map((p, i) => {
    const createdAt = pastDate(SPAN_DAYS, 20);
    const featured = i < 3;
    const hasDiscount = Math.random() > 0.6;
    return {
      _id: new ObjectId(),
      agencyId,
      title: p.title,
      slug: `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${i}`,
      description: `Fully guided ${p.title.toLowerCase()} handled end-to-end — visa processing, flights, accommodation and local transport all included. Trusted by hundreds of families across Kano and beyond.`,
      category: p.category,
      destinations: p.destinations,
      duration: { days: p.days, nights: p.nights },
      pricing: {
        basePrice: p.price,
        currency: 'NGN',
        pricePerPerson: true,
        discountedPrice: hasDiscount ? Math.round(p.price * 0.9) : undefined,
      },
      inclusions: ['Visa processing', 'Return flights', 'Accommodation', 'Airport transfers', 'Guided tour'],
      exclusions: ['Personal expenses', 'Travel insurance', 'Excess baggage'],
      itinerary: [],
      gallery: [rand(SAMPLE_IMAGES), rand(SAMPLE_IMAGES)],
      coverImage: rand(SAMPLE_IMAGES),
      availability: {
        startDate: futureDate(10, 60),
        endDate: futureDate(60, 120),
        maxCapacity: randInt(20, 60),
        currentBookings: randInt(2, 18),
      },
      status: 'active' as const,
      tags: p.category === 'hajj_umrah' ? ['Umrah', 'Group Discount'] : [p.category],
      isFeatured: featured,
      eventDate: p.category === 'hajj_umrah' ? futureDate(20, 90) : undefined,
      whatsappNumber: agency.whatsappNumber || agency.phone,
      createdBy: owner._id,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await TourPackage.insertMany(packages as any, { timestamps: false } as any);
  console.log(`Created ${packages.length} tour packages`);

  // ── 3. Travel Files (+ tasks/notes/timeline/statusHistory/payments) ────────
  const TF_STATUS_FLOW: TravelFileStatus[] = ['draft', 'open', 'pending_payment', 'awaiting_documents', 'visa_processing', 'ready_for_departure', 'completed'];
  const TRAVEL_FILE_COUNT = 48;
  const travelFiles: any[] = [];
  for (let i = 0; i < TRAVEL_FILE_COUNT; i++) {
    const customer = rand(customers);
    const travelType = randWeighted<string>([
      ['umrah', 30], ['hajj', 8], ['study_abroad', 20], ['tourist_visa', 20], ['business', 15], ['medical', 4], ['other', 3],
    ]);
    const ageInDays = randInt(1, SPAN_DAYS);
    const createdAt = pastDate(ageInDays, ageInDays);
    // Older files have progressed further through the workflow.
    const maxStageByAge = ageInDays > 30 ? 6 : ageInDays > 18 ? 5 : ageInDays > 8 ? 3 : 1;
    const isCancelled = Math.random() < 0.06;
    const finalStageIdx = isCancelled ? randInt(0, maxStageByAge) : Math.min(maxStageByAge, randInt(0, maxStageByAge));
    const status: TravelFileStatus = isCancelled ? 'cancelled' : TF_STATUS_FLOW[finalStageIdx];

    // Walk the status history from draft up to the final status.
    const statusHistory: any[] = [];
    const stageDates = sortAsc(Array.from({ length: finalStageIdx + 1 }).map(() => pastDate(ageInDays, 0)));
    for (let s = 0; s < finalStageIdx; s++) {
      statusHistory.push({
        _id: new ObjectId(),
        previousStatus: TF_STATUS_FLOW[s],
        newStatus: TF_STATUS_FLOW[s + 1],
        changedBy: rand(staffPool)._id,
        changedAt: stageDates[s + 1],
        reason: undefined,
      });
    }
    if (isCancelled) {
      statusHistory.push({
        _id: new ObjectId(),
        previousStatus: TF_STATUS_FLOW[finalStageIdx],
        newStatus: 'cancelled',
        changedBy: rand(staffPool)._id,
        changedAt: pastDate(Math.max(0, ageInDays - finalStageIdx), 0),
        reason: rand(['Customer changed travel plans', 'Visa rejected', 'Unable to raise full payment', 'Duplicate file']),
      });
    }

    // Timeline: creation + a few organic events.
    const timeline: any[] = [{
      _id: new ObjectId(),
      action: 'Travel File Created',
      description: `Travel file created for ${customer.firstName} ${customer.lastName}`,
      performedBy: rand(staffPool)._id,
      performedAt: createdAt,
      source: 'staff',
    }];
    for (const sh of statusHistory) {
      timeline.push({
        _id: new ObjectId(),
        action: 'Status Updated',
        description: `Status changed from ${sh.previousStatus.replace(/_/g, ' ')} to ${sh.newStatus.replace(/_/g, ' ')}`,
        performedBy: sh.changedBy,
        performedAt: sh.changedAt,
        source: 'staff',
      });
    }

    // Tasks
    const taskCount = randInt(1, 4);
    const tasks: any[] = Array.from({ length: taskCount }).map(() => {
      const taskCreatedAt = pastDate(ageInDays, 0);
      const isDone = status === 'completed' || Math.random() > 0.4;
      return {
        _id: new ObjectId(),
        title: rand(['Collect passport copy', 'Confirm flight booking', 'Follow up on visa appointment', 'Send invoice to customer', 'Verify bank transfer', 'Book hotel accommodation', 'Remind customer of balance due', 'Schedule embassy appointment']),
        description: undefined,
        assignedTo: rand(staffPool)._id,
        createdBy: rand(staffPool)._id,
        dueDate: futureDate(-5, 15),
        completedAt: isDone ? pastDate(Math.max(0, ageInDays - 1), 0) : undefined,
        priority: rand(['low', 'medium', 'high']),
        status: isDone ? 'completed' : rand(['todo', 'in_progress']),
        createdAt: taskCreatedAt,
      };
    });

    // Notes
    const noteCount = randInt(0, 3);
    const notes: any[] = Array.from({ length: noteCount }).map(() => ({
      _id: new ObjectId(),
      content: rand([
        'Customer prefers WhatsApp for updates.',
        'Requested a window seat if possible.',
        'Passport was slightly damaged — advised to renew before travel.',
        'Paid a deposit in cash at the office.',
        'Traveling with an infant — needs a bassinet seat.',
        'Very responsive customer, easy to reach.',
        'Has traveled with us before for Umrah in a previous group.',
      ]),
      createdBy: rand(staffPool)._id,
      visibility: Math.random() > 0.7 ? 'shared' : 'internal',
      createdAt: pastDate(ageInDays, 0),
    }));

    // Financials — payments array, drives totalCost/amountPaid.
    const packageMatch = packages.find((p) =>
      (travelType === 'umrah' || travelType === 'hajj') ? p.category === 'hajj_umrah' :
      travelType === 'study_abroad' ? p.category === 'study_abroad' :
      p.category === 'tour' || p.category === 'visa'
    );
    const totalCost = packageMatch ? packageMatch.pricing.basePrice : randInt(300000, 2000000);
    const paidRatio = status === 'completed' ? 1 : status === 'cancelled' ? randWeighted([[0, 40], [0.5, 40], [1, 20]]) : randWeighted([[0, 20], [0.3, 25], [0.5, 25], [0.8, 20], [1, 10]]);
    const payments: ITravelFilePayment[] = [];
    let amountPaid = 0;
    if (paidRatio > 0) {
      const targetPaid = Math.round(totalCost * paidRatio);
      const installments = targetPaid > 500000 ? randInt(1, 3) : 1;
      let remaining = targetPaid;
      for (let p = 0; p < installments; p++) {
        const amount = p === installments - 1 ? remaining : Math.round(remaining / (installments - p) * (0.4 + Math.random() * 0.6));
        remaining -= amount;
        if (amount <= 0) continue;
        payments.push({
          amount,
          method: rand(['cash', 'bank_transfer', 'card', 'mobile_money']),
          reference: Math.random() > 0.4 ? `PMT-${randInt(100000, 999999)}` : undefined,
          note: p === 0 ? 'Initial deposit' : 'Installment payment',
          paidAt: pastDate(ageInDays, 0),
        });
      }
      amountPaid = payments.reduce((s, p) => s + p.amount, 0);
    }

    const destination = rand(TRAVEL_TYPE_DESTS[travelType] || TRAVEL_TYPE_DESTS.other);
    const priority = randWeighted<'low' | 'normal' | 'high' | 'urgent'>([['low', 15], ['normal', 55], ['high', 22], ['urgent', 8]]);

    travelFiles.push({
      _id: new ObjectId(),
      agencyId,
      fileNumber: `TF-${createdAt.getFullYear()}${pad(createdAt.getMonth() + 1, 2)}-${pad(100000 + i, 6)}`,
      customerId: customer._id,
      travelType,
      packageId: packageMatch?._id,
      destination,
      departureDate: ['ready_for_departure', 'completed'].includes(status) ? futureDate(-ageInDays + 10, 20) : futureDate(5, 60),
      returnDate: futureDate(20, 90),
      departureGroup: (travelType === 'umrah' || travelType === 'hajj') ? `${rand(['Group A', 'Group B', 'Group C'])} — ${rand(['Jan', 'Feb', 'Mar', 'Apr'])} 2026` : undefined,
      assignedConsultant: consultant._id,
      assignedVisaOfficer: ['visa_processing', 'awaiting_documents', 'ready_for_departure', 'completed'].includes(status) ? officer._id : undefined,
      status,
      statusHistory,
      priority,
      timeline,
      tasks,
      notes,
      physicalFile: {
        physicalFileNumber: `PF-${pad(1000 + i, 4)}`,
        cabinetLocation: `Cabinet ${rand(['A', 'B', 'C'])}`,
        shelfLocation: `Shelf ${randInt(1, 10)}`,
        status: rand(['at_branch', 'with_visa_officer', 'sent_for_processing', 'with_embassy', 'returned']),
        originalPassportReceived: Math.random() > 0.3,
        passportReceivedDate: Math.random() > 0.3 ? pastDate(ageInDays, 0) : undefined,
        passportReceivedBy: consultant._id,
      },
      totalCost,
      amountPaid,
      payments,
      invoiceIds: [],
      documentIds: [],
      createdAt,
      updatedAt: [...statusHistory].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0]?.changedAt || createdAt,
    });
  }
  await TravelFile.insertMany(travelFiles as any, { timestamps: false } as any);
  console.log(`Created ${travelFiles.length} travel files`);

  // ── 4. Bookings ──────────────────────────────────────────────────────────
  let bookingSeq = 0;
  const bookings: any[] = [];
  for (const tf of travelFiles) {
    if (Math.random() < 0.15) continue; // some files have no bookings yet
    const count = randInt(1, 3);
    const types: BookingType[] = tf.travelType === 'umrah' || tf.travelType === 'hajj'
      ? ['flight', 'hotel', 'transport']
      : ['flight'];
    for (let b = 0; b < count; b++) {
      bookingSeq += 1;
      const bookingType = types[b] || rand(['flight', 'hotel', 'transport', 'other'] as BookingType[]);
      const createdAt = new Date(tf.createdAt.getTime() + randInt(0, 3) * 86400000);
      const status: BookingStatus = randWeighted([
        ['draft', 5], ['pending', 10], ['reserved', 15], ['confirmed', 40], ['ticketed', 20], ['cancelled', 5], ['completed', 5],
      ]);
      let details: any = {};
      let title = '';
      let cost = 0;
      if (bookingType === 'flight') {
        title = `Flight — Kano to ${tf.destination.split(' ')[0]}`;
        details = {
          airline: rand(AIRLINES),
          departureLocation: 'Kano (KAN)',
          arrivalLocation: rand(['Jeddah (JED)', 'Madinah (MED)', 'Dubai (DXB)', 'Istanbul (IST)', 'London (LHR)']),
          departureDateTime: tf.departureDate,
          arrivalDateTime: tf.departureDate,
          ticketNumber: status === 'ticketed' || status === 'completed' ? `${randInt(100, 999)}-${randInt(1000000000, 2000000000)}` : undefined,
        };
        cost = randInt(450000, 1200000);
      } else if (bookingType === 'hotel') {
        title = `Hotel — ${rand(HOTELS)}`;
        details = {
          hotelName: rand(HOTELS),
          city: rand(['Makkah', 'Madinah']),
          checkInDate: tf.departureDate,
          checkOutDate: tf.returnDate,
          roomType: rand(['Double', 'Triple', 'Quad', 'Sharing']),
          numberOfRooms: randInt(1, 4),
          numberOfNights: randInt(5, 14),
          guestCount: randInt(1, 6),
        };
        cost = randInt(300000, 900000);
      } else if (bookingType === 'transport') {
        title = 'Airport Transfer & Ziyarah Transport';
        details = {
          vehicleType: rand(['Bus', 'Van', 'Car']),
          passengerCount: randInt(1, 6),
          pickupLocation: 'Jeddah Airport',
          dropoffLocation: 'Makkah Hotel',
        };
        cost = randInt(30000, 120000);
      } else {
        title = 'Travel Insurance & Miscellaneous';
        cost = randInt(20000, 80000);
      }

      const statusHistory = [{
        from: 'draft' as BookingStatus,
        to: status,
        changedBy: rand(staffPool)._id,
        changedAt: createdAt,
      }];

      bookings.push({
        _id: new ObjectId(),
        agencyId,
        bookingNumber: `${prefix}-BKG-${String(createdAt.getFullYear()).slice(-2)}-${pad(bookingSeq, 6)}`,
        travelFileId: tf._id,
        customerId: tf.customerId,
        bookingType,
        title,
        status,
        statusHistory,
        provider: bookingType === 'flight' ? details.airline : bookingType === 'hotel' ? details.hotelName : undefined,
        startDate: tf.departureDate,
        endDate: tf.returnDate,
        cost,
        currency: 'NGN',
        details,
        documents: [],
        createdBy: rand(staffPool)._id,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  await Booking.insertMany(bookings as any, { timestamps: false } as any);
  console.log(`Created ${bookings.length} bookings`);

  // ── 5. Visa Applications ─────────────────────────────────────────────────
  const visaEligibleFiles = travelFiles.filter((tf) => ['study_abroad', 'tourist_visa', 'business', 'medical', 'umrah', 'hajj'].includes(tf.travelType));
  const visas: any[] = [];
  const VISA_STATUS_FLOW: VisaStatus[] = ['draft', 'documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review', 'approved'];
  for (const tf of visaEligibleFiles) {
    if (Math.random() < 0.25) continue;
    const ageInDays = Math.round((NOW.getTime() - tf.createdAt.getTime()) / 86400000);
    const isRejected = Math.random() < 0.08;
    const maxStage = ageInDays > 25 ? 5 : ageInDays > 12 ? 3 : 1;
    const finalIdx = randInt(0, maxStage);
    const status: VisaStatus = isRejected ? 'rejected' : VISA_STATUS_FLOW[finalIdx];
    const applicationDate = pastDate(ageInDays, 0);
    const statusHistory: Array<{ status: VisaStatus; changedBy: mongoose.Types.ObjectId; changedAt: Date; note?: string }> = [{
      status: 'draft',
      changedBy: officer._id,
      changedAt: applicationDate,
      note: 'Application opened',
    }];
    for (let s = 1; s <= finalIdx; s++) {
      statusHistory.push({
        status: VISA_STATUS_FLOW[s],
        changedBy: officer._id,
        changedAt: pastDate(Math.max(0, ageInDays - s * 2), 0),
        note: undefined,
      });
    }
    if (isRejected) {
      statusHistory.push({ status: 'rejected', changedBy: officer._id, changedAt: pastDate(Math.max(0, ageInDays - 1), 0), note: 'Missing supporting bank statement' });
    }

    visas.push({
      _id: new ObjectId(),
      agencyId,
      customerId: tf.customerId,
      assignedOfficer: officer._id,
      visaType: tf.travelType === 'study_abroad' ? 'Student Visa' : tf.travelType === 'business' ? 'Business Visa' : tf.travelType === 'medical' ? 'Medical Visa' : 'Tourist / Umrah Visa',
      destinationCountry: (TRAVEL_TYPE_DESTS[tf.travelType] || ['Saudi Arabia'])[0].split(' (')[0],
      purposeOfTravel: tf.travelType === 'study_abroad' ? 'Study' : tf.travelType === 'business' ? 'Business meeting' : tf.travelType === 'medical' ? 'Medical treatment' : 'Umrah pilgrimage',
      applicationDate,
      travelDate: tf.departureDate,
      returnDate: tf.returnDate,
      status,
      statusHistory,
      appointment: status === 'appointment_scheduled' || status === 'under_review' || status === 'approved' ? {
        date: futureDate(-10, 15),
        time: `${randInt(9, 15)}:00`,
        location: `${(TRAVEL_TYPE_DESTS[tf.travelType] || ['Saudi Arabia'])[0].split(' (')[0]} Embassy, Abuja`,
        confirmationNumber: `APT-${randInt(10000, 99999)}`,
      } : undefined,
      embassy: { name: `Embassy of ${(TRAVEL_TYPE_DESTS[tf.travelType] || ['Saudi Arabia'])[0].split(' (')[0]}`, address: 'Diplomatic Zone, Abuja' },
      documents: [],
      notes: '',
      dueDate: futureDate(3, 30),
      fees: randInt(50000, 250000),
      referenceNumber: `VISA-${randInt(10000000, 99999999).toString(16).toUpperCase()}`,
      createdAt: applicationDate,
      updatedAt: [...statusHistory].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0].changedAt,
    });
  }
  await VisaApplication.insertMany(visas as any, { timestamps: false } as any);
  console.log(`Created ${visas.length} visa applications`);

  // ── 6. Invoices ──────────────────────────────────────────────────────────
  let invoiceSeq = 0;
  const invoices: any[] = [];
  const invoiceIdsByTravelFile = new Map<string, mongoose.Types.ObjectId[]>();
  for (const tf of travelFiles) {
    if (tf.totalCost <= 0 || Math.random() < 0.1) continue;
    invoiceSeq += 1;
    const issuedAt = new Date(tf.createdAt.getTime() + randInt(0, 2) * 86400000);
    const subtotal = tf.totalCost;
    const taxRate = 0;
    const tax = 0;
    const discount = Math.random() > 0.85 ? Math.round(subtotal * 0.05) : 0;
    const totalAmount = subtotal - discount;
    const amountPaid = Math.min(tf.amountPaid, totalAmount);
    const outstandingBalance = totalAmount - amountPaid;
    const status = outstandingBalance <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : (Math.random() > 0.7 ? 'overdue' : 'sent');
    const paymentsArr = tf.payments.map((p: ITravelFilePayment) => ({
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      paidAt: p.paidAt,
      recordedBy: finance._id,
      notes: p.note,
    }));

    const invId = new ObjectId();
    invoices.push({
      _id: invId,
      agencyId,
      invoiceNumber: `INV-${issuedAt.getFullYear()}${pad(issuedAt.getMonth() + 1, 2)}-${pad(1000 + invoiceSeq, 4)}`,
      customerId: tf.customerId,
      lineItems: [{ description: `${tf.travelType.replace(/_/g, ' ')} package — ${tf.destination}`, quantity: 1, unitPrice: subtotal, total: subtotal }],
      subtotal,
      tax,
      taxRate,
      discount,
      totalAmount,
      amountPaid,
      outstandingBalance,
      currency: 'NGN',
      status,
      dueDate: futureDate(-10, 20),
      payments: paymentsArr,
      notes: '',
      issuedAt,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    });
    const arr = invoiceIdsByTravelFile.get(tf._id.toString()) || [];
    arr.push(invId);
    invoiceIdsByTravelFile.set(tf._id.toString(), arr);
  }
  await Invoice.insertMany(invoices as any, { timestamps: false } as any);
  console.log(`Created ${invoices.length} invoices`);

  // Back-link invoices to their travel files.
  const invoiceLinkOps = Array.from(invoiceIdsByTravelFile.entries()).map(([tfId, invIds]) => ({
    updateOne: { filter: { _id: tfId }, update: { $set: { invoiceIds: invIds } } },
  }));
  if (invoiceLinkOps.length) await TravelFile.bulkWrite(invoiceLinkOps);

  // ── 7. Receipts ──────────────────────────────────────────────────────────
  let receiptSeq = 0;
  const receipts: any[] = [];
  for (const inv of invoices) {
    if (inv.amountPaid <= 0) continue;
    for (const p of inv.payments) {
      if (Math.random() < 0.3) continue; // not every payment gets a formal receipt
      receiptSeq += 1;
      receipts.push({
        _id: new ObjectId(),
        agencyId,
        receiptNumber: `RCP-${p.paidAt.getFullYear()}${pad(p.paidAt.getMonth() + 1, 2)}-${pad(1000 + receiptSeq, 4)}`,
        customerId: inv.customerId,
        invoiceId: inv._id,
        amount: p.amount,
        currency: 'NGN',
        method: p.method,
        reference: p.reference,
        description: `Payment for invoice ${inv.invoiceNumber}`,
        paidAt: p.paidAt,
        issuedBy: finance._id,
        createdAt: p.paidAt,
        updatedAt: p.paidAt,
      });
    }
  }
  await Receipt.insertMany(receipts as any, { timestamps: false } as any);
  console.log(`Created ${receipts.length} receipts`);

  // ── 8. Documents ─────────────────────────────────────────────────────────
  const documents: any[] = [];
  const documentIdsByTravelFile = new Map<string, mongoose.Types.ObjectId[]>();
  const DOC_TEMPLATES: Array<{ category: any; name: string; expiresFuture?: boolean }> = [
    { category: 'passport', name: 'Passport Bio Page' },
    { category: 'photo', name: 'Passport Photograph' },
    { category: 'visa', name: 'Visa Approval Letter', expiresFuture: true },
    { category: 'ticket', name: 'Flight Itinerary' },
    { category: 'hotel', name: 'Hotel Booking Confirmation' },
    { category: 'financial', name: 'Bank Statement' },
    { category: 'insurance', name: 'Travel Insurance Certificate' },
  ];
  for (const tf of travelFiles) {
    const docCount = tf.status === 'draft' ? randInt(0, 1) : randInt(1, 4);
    const chosen = [...DOC_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, docCount);
    const ids: mongoose.Types.ObjectId[] = [];
    for (const tpl of chosen) {
      const uploadedAt = new Date(tf.createdAt.getTime() + randInt(0, 5) * 86400000);
      const docId = new ObjectId();
      documents.push({
        _id: docId,
        agencyId,
        customerId: tf.customerId,
        travelFileId: tf._id,
        uploadedBy: rand(staffPool)._id,
        status: randWeighted<any>([['submitted', 60], ['approved', 30], ['under_review', 10]]),
        name: tpl.name,
        originalName: `${tpl.name.toLowerCase().replace(/\s+/g, '_')}.${tpl.category === 'financial' ? 'pdf' : 'jpg'}`,
        category: tpl.category,
        fileUrl: tpl.category === 'financial' || tpl.category === 'insurance' ? SAMPLE_PDF : rand(SAMPLE_IMAGES),
        publicId: `tourops/demo/${docId.toString()}`,
        fileType: tpl.category === 'financial' || tpl.category === 'insurance' ? 'application/pdf' : 'image/jpeg',
        fileSize: randInt(80_000, 4_000_000),
        expiryDate: tpl.category === 'passport' ? futureDate(60, 365 * 5) : tpl.expiresFuture ? futureDate(10, 180) : undefined,
        isExpired: false,
        version: 1,
        previousVersions: [],
        tags: [],
        createdAt: uploadedAt,
        updatedAt: uploadedAt,
      });
      ids.push(docId);
    }
    if (ids.length) documentIdsByTravelFile.set(tf._id.toString(), ids);
  }
  await DocumentFile.insertMany(documents as any, { timestamps: false } as any);
  console.log(`Created ${documents.length} documents`);

  const docLinkOps = Array.from(documentIdsByTravelFile.entries()).map(([tfId, docIds]) => ({
    updateOne: { filter: { _id: tfId }, update: { $set: { documentIds: docIds } } },
  }));
  if (docLinkOps.length) await TravelFile.bulkWrite(docLinkOps);

  // ── 9. Notifications ─────────────────────────────────────────────────────
  const notifications: any[] = [];
  const notifTemplates: Array<[string, string, string]> = [
    ['New Travel File Created', 'A new travel file has been opened', 'booking'],
    ['Payment Received', 'A payment has been recorded', 'payment'],
    ['Visa Status Updated', 'A visa application status has changed', 'visa'],
    ['Document Uploaded', 'A new document was uploaded', 'document'],
    ['Appointment Reminder', 'An embassy appointment is coming up', 'appointment'],
  ];
  for (let i = 0; i < 35; i++) {
    const [title, message, type] = rand(notifTemplates);
    const createdAt = pastDate(SPAN_DAYS, 0);
    const isRead = Math.random() > 0.35;
    notifications.push({
      _id: new ObjectId(),
      agencyId,
      userId: rand(staffPool)._id,
      title,
      message,
      type,
      isRead,
      readAt: isRead ? new Date(createdAt.getTime() + randInt(1, 600) * 60000) : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Notification.insertMany(notifications as any, { timestamps: false } as any);
  console.log(`Created ${notifications.length} notifications`);

  // ── 10. Audit Log (Recent Activity feed) ────────────────────────────────
  const auditActions: Array<[string, string]> = [
    ['created', 'TravelFile'], ['updated', 'TravelFile'], ['status_changed', 'TravelFile'],
    ['created', 'Booking'], ['status_changed', 'Booking'],
    ['created', 'VisaApplication'], ['status_changed', 'VisaApplication'],
    ['created', 'Invoice'], ['payment_recorded', 'Invoice'],
    ['created', 'Customer'], ['created', 'Document'],
  ];
  const auditLogs: any[] = [];
  for (let i = 0; i < 80; i++) {
    const [action, resource] = rand(auditActions);
    const createdAt = pastDate(SPAN_DAYS, 0);
    auditLogs.push({
      _id: new ObjectId(),
      agencyId,
      userId: rand(staffPool)._id,
      action,
      resource,
      resourceId: new ObjectId(),
      createdAt,
      updatedAt: createdAt,
    });
  }
  // Skew towards recent activity for a lively "Recent Activity" feed.
  for (let i = 0; i < 20; i++) {
    const [action, resource] = rand(auditActions);
    const createdAt = pastDate(3, 0);
    auditLogs.push({
      _id: new ObjectId(),
      agencyId,
      userId: rand(staffPool)._id,
      action,
      resource,
      resourceId: new ObjectId(),
      createdAt,
      updatedAt: createdAt,
    });
  }
  await AuditLog.insertMany(auditLogs as any, { timestamps: false } as any);
  console.log(`Created ${auditLogs.length} audit log entries`);

  console.log('\nDemo data seeding complete!');
  console.log(`  Customers:      ${customers.length}`);
  console.log(`  Packages:       ${packages.length}`);
  console.log(`  Travel Files:   ${travelFiles.length}`);
  console.log(`  Bookings:       ${bookings.length}`);
  console.log(`  Visas:          ${visas.length}`);
  console.log(`  Invoices:       ${invoices.length}`);
  console.log(`  Receipts:       ${receipts.length}`);
  console.log(`  Documents:      ${documents.length}`);
  console.log(`  Notifications:  ${notifications.length}`);
  console.log(`  Audit Logs:     ${auditLogs.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
