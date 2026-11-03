import mongoose from 'mongoose';
import { Season, SeasonType } from '../models/Season';
import { TravelFile } from '../models/TravelFile';
import { Customer } from '../models/Customer';
import { Booking } from '../models/Booking';
import { VisaApplication } from '../models/VisaApplication';
import { VisaIssuance } from '../models/VisaIssuance';
import { travelFileService } from './travelFile.service';
import { generateManifestPDF, ManifestRow } from './manifestPdf.service';
import { Agency } from '../models/Agency';
import { bookingService } from './booking.service';
import { NotFoundError, AppError } from '../utils/errors';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Files that no longer take a seat or count toward the season's money. */
const INACTIVE_FILE = ['cancelled', 'archived'];

const BOOKING_DONE = ['confirmed', 'ticketed', 'completed'];

export type StepState = 'done' | 'in_progress' | 'missing';

export interface PilgrimChecklist {
  passport: StepState;
  ticket: StepState;
  visa: StepState;
  hotel: StepState;
  transport: StepState;
  payment: StepState;
}

const SEASON_FIELDS = [
  'name', 'month', 'year', 'departureDate', 'returnDate', 'destination', 'packageId',
  'pricePerPerson', 'capacity', 'airline', 'makkahHotel', 'madinahHotel', 'status', 'notes',
] as const;

function pickSeasonFields(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of SEASON_FIELDS) {
    if (data[key] === undefined) continue;
    // Empty strings from a form mean "cleared", which for refs/dates is unset.
    out[key] = data[key] === '' ? null : data[key];
  }
  return out;
}

function bookingStep(bookings: any[]): StepState {
  const live = bookings.filter((b) => b.status !== 'cancelled');
  if (live.some((b) => BOOKING_DONE.includes(b.status))) return 'done';
  return live.length ? 'in_progress' : 'missing';
}

function buildChecklist(
  file: any,
  bookings: any[],
  visaApp: any | undefined,
  hasIssuedVisa: boolean
): PilgrimChecklist {
  const of = (...types: string[]) => bookings.filter((b) => types.includes(b.bookingType));

  const passport: StepState = file.physicalFile?.originalPassportReceived
    ? 'done'
    : file.customerId?.passport?.number
    ? 'in_progress'
    : 'missing';

  // A visa counts as done from any of the three places agencies record it:
  // an issued-visa record, an approved application, or a confirmed visa booking.
  let visa = bookingStep(of('visa'));
  if (hasIssuedVisa || visaApp?.status === 'approved') visa = 'done';
  else if (visa === 'missing' && visaApp && !['rejected', 'cancelled'].includes(visaApp.status)) visa = 'in_progress';

  const payment: StepState =
    file.totalCost > 0 && file.amountPaid >= file.totalCost
      ? 'done'
      : file.amountPaid > 0
      ? 'in_progress'
      : 'missing';

  return {
    passport,
    ticket: bookingStep(of('flight', 'ticket')),
    visa,
    hotel: bookingStep(of('hotel')),
    transport: bookingStep(of('transport')),
    payment,
  };
}

async function loadSeason(agencyId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Season');
  const season = await Season.findOne({ _id: id, agencyId });
  if (!season) throw new NotFoundError('Season');
  return season;
}

/**
 * Matches a returning pilgrim on passport number, then phone + name, before
 * creating anyone — the same person travelling every Ramadan should stay one
 * customer with their whole history.
 */
async function findOrCreateCustomer(agencyId: string, userId: string, input: Record<string, unknown>) {
  if (input.customerId) {
    const existing = await Customer.findOne({ _id: input.customerId, agencyId });
    if (!existing) throw new NotFoundError('Customer');
    return existing;
  }

  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  if (!firstName || !lastName) throw new AppError('First and last name are required', 400);

  const passportNumber = String(input.passportNumber || '').trim().toUpperCase();
  const phone = String(input.phone || '').trim();
  const email = String(input.email || '').trim().toLowerCase();

  let customer = passportNumber
    ? await Customer.findOne({ agencyId, 'passport.number': passportNumber })
    : null;
  if (!customer && phone) {
    customer = await Customer.findOne({
      agencyId,
      phone,
      firstName: new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
  }
  if (!customer && email) customer = await Customer.findOne({ agencyId, email });
  if (customer) return customer;

  return Customer.create({
    agencyId,
    firstName,
    lastName,
    phone: phone || undefined,
    email: email || undefined,
    gender: ['male', 'female', 'other'].includes(String(input.gender)) ? input.gender : undefined,
    dateOfBirth: input.dateOfBirth ? new Date(String(input.dateOfBirth)) : undefined,
    nationality: input.nationality ? String(input.nationality) : undefined,
    passport: passportNumber
      ? {
          number: passportNumber,
          expiryDate: input.passportExpiry ? new Date(String(input.passportExpiry)) : undefined,
        }
      : undefined,
    createdBy: userId,
  });
}

export const seasonService: {
  list(agencyId: string, query: Record<string, unknown>): Promise<any[]>;
  getById(agencyId: string, id: string): Promise<any>;
  create(agencyId: string, userId: string, data: Record<string, unknown>): Promise<any>;
  update(agencyId: string, id: string, data: Record<string, unknown>): Promise<any>;
  delete(agencyId: string, id: string): Promise<void>;
  addPilgrim(agencyId: string, id: string, userId: string, data: Record<string, unknown>): Promise<any>;
  attachFiles(agencyId: string, id: string, travelFileIds: string[]): Promise<{ moved: number }>;
  detachFile(agencyId: string, id: string, travelFileId: string): Promise<any>;
  addArrangement(
    agencyId: string, id: string, userId: string, data: Record<string, unknown>
  ): Promise<{ createdCount: number; failedCount: number; failed: Array<{ travelFileId: string; reason: string }> }>;
  manifest(agencyId: string, id: string, preparedBy?: string): Promise<{ buffer: Buffer; filename: string }>;
} = {
  /**
   * Every season of a type with its roll-up, newest first. Agencies run a
   * handful a year, so this is unpaginated — the page groups them by year.
   */
  async list(agencyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { agencyId };
    if (query.type === 'umrah' || query.type === 'hajj') filter.type = query.type;
    if (query.year) filter.year = Number(query.year);
    if (query.status) filter.status = query.status;
    else filter.status = { $ne: 'archived' };
    if (query.status === 'all') delete filter.status;

    const seasons = await Season.find(filter).sort({ year: -1, month: -1, createdAt: -1 }).limit(500).lean();

    const stats = await TravelFile.aggregate([
      {
        $match: {
          agencyId: new mongoose.Types.ObjectId(agencyId),
          seasonId: { $in: seasons.map((s) => s._id) },
          status: { $nin: INACTIVE_FILE },
        },
      },
      {
        $group: {
          _id: '$seasonId',
          pilgrims: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          amountPaid: { $sum: '$amountPaid' },
          ready: { $sum: { $cond: [{ $in: ['$status', ['ready_for_departure', 'completed']] }, 1, 0] } },
        },
      },
    ]);
    const byId = new Map(stats.map((s) => [s._id.toString(), s]));

    return seasons.map((s) => {
      const st = byId.get(s._id.toString());
      const pilgrims = st?.pilgrims || 0;
      return {
        ...s,
        pilgrims,
        ready: st?.ready || 0,
        totalCost: st?.totalCost || 0,
        amountPaid: st?.amountPaid || 0,
        balance: (st?.totalCost || 0) - (st?.amountPaid || 0),
        seatsLeft: s.capacity > 0 ? Math.max(0, s.capacity - pilgrims) : null,
      };
    });
  },

  /** The open folder: season, each pilgrim with their checklist, and totals. */
  async getById(agencyId: string, id: string) {
    const season = await loadSeason(agencyId, id);
    await season.populate('packageId', 'title pricing');

    const files = await TravelFile.find({ agencyId, seasonId: id })
      .select('fileNumber customerId status priority totalCost amountPaid departureDate returnDate physicalFile visaApplicationId createdAt')
      .populate('customerId', 'firstName lastName fullName phone email gender passport')
      .sort({ createdAt: 1 })
      .lean();

    const fileIds = files.map((f) => f._id);
    const customerIds = files.map((f: any) => f.customerId?._id).filter(Boolean);
    const passportNumbers = files.map((f: any) => f.customerId?.passport?.number).filter(Boolean);

    const [bookings, visaApps, issued] = await Promise.all([
      Booking.find({ agencyId, travelFileId: { $in: fileIds } })
        .select('travelFileId bookingType status title bookingNumber')
        .lean(),
      VisaApplication.find({ agencyId, _id: { $in: files.map((f) => f.visaApplicationId).filter(Boolean) } })
        .select('status')
        .lean(),
      VisaIssuance.find({
        agencyId,
        type: 'visa',
        $or: [{ customerId: { $in: customerIds } }, { passportNumber: { $in: passportNumbers } }],
      })
        .select('customerId passportNumber')
        .lean(),
    ]);

    const issuedCustomers = new Set(issued.map((i) => i.customerId?.toString()).filter(Boolean));
    const issuedPassports = new Set(issued.map((i) => i.passportNumber?.toUpperCase()).filter(Boolean));
    const visaById = new Map(visaApps.map((v) => [v._id.toString(), v]));

    const pilgrims = files.map((f: any) => {
      const own = bookings.filter((b) => b.travelFileId?.toString() === f._id.toString());
      const c = f.customerId;
      const hasIssuedVisa =
        (c?._id && issuedCustomers.has(c._id.toString())) ||
        (c?.passport?.number && issuedPassports.has(String(c.passport.number).toUpperCase()));
      return {
        ...f,
        balance: (f.totalCost || 0) - (f.amountPaid || 0),
        bookingCount: own.length,
        checklist: buildChecklist(f, own, f.visaApplicationId ? visaById.get(f.visaApplicationId.toString()) : undefined, !!hasIssuedVisa),
      };
    });

    const active = pilgrims.filter((p) => !INACTIVE_FILE.includes(p.status));
    const doneCount = (step: keyof PilgrimChecklist) => active.filter((p) => p.checklist[step] === 'done').length;
    const totalCost = active.reduce((s, p) => s + (p.totalCost || 0), 0);
    const amountPaid = active.reduce((s, p) => s + (p.amountPaid || 0), 0);

    return {
      season,
      pilgrims,
      totals: {
        pilgrims: active.length,
        capacity: season.capacity,
        seatsLeft: season.capacity > 0 ? Math.max(0, season.capacity - active.length) : null,
        totalCost,
        amountPaid,
        balance: totalCost - amountPaid,
        steps: {
          passport: doneCount('passport'),
          ticket: doneCount('ticket'),
          visa: doneCount('visa'),
          hotel: doneCount('hotel'),
          transport: doneCount('transport'),
          payment: doneCount('payment'),
        },
      },
    };
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const type = data.type as SeasonType;
    if (type !== 'umrah' && type !== 'hajj') throw new AppError('Choose Umrah or Hajj', 400);
    const month = Number(data.month);
    const year = Number(data.year);
    if (!(month >= 1 && month <= 12)) throw new AppError('Choose a month', 400);
    if (!(year >= 2000 && year <= 2100)) throw new AppError('Choose a valid year', 400);

    const fields = pickSeasonFields(data);
    const name = String(data.name || '').trim() || `${MONTHS[month - 1]} ${type === 'hajj' ? 'Hajj' : 'Umrah'} ${year}`;

    return Season.create({
      ...fields,
      agencyId,
      type,
      month,
      year,
      name,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  },

  /**
   * Changing the season's dates moves every active pilgrim with it when asked
   * — the usual case when the airline shifts a group departure.
   */
  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const season = await loadSeason(agencyId, id);
    const fields = pickSeasonFields(data);
    if (fields.name !== undefined && !String(fields.name || '').trim()) {
      throw new AppError('A season name is required', 400);
    }

    season.set(fields);
    await season.save();

    if (data.applyDatesToPilgrims === true) {
      const set: Record<string, unknown> = {};
      if (season.departureDate) set.departureDate = season.departureDate;
      if (season.returnDate) set.returnDate = season.returnDate;
      if (Object.keys(set).length) {
        await TravelFile.updateMany(
          { agencyId, seasonId: id, status: { $nin: [...INACTIVE_FILE, 'completed'] } },
          { $set: set }
        );
      }
    }

    return season;
  },

  async delete(agencyId: string, id: string) {
    await loadSeason(agencyId, id);
    const count = await TravelFile.countDocuments({ agencyId, seasonId: id });
    if (count > 0) {
      throw new AppError(
        `This season still has ${count} pilgrim file(s). Move or remove them first, or archive the season instead.`,
        400
      );
    }
    await Season.deleteOne({ _id: id, agencyId });
  },

  /**
   * Registers one pilgrim: finds or creates the customer, then opens their
   * travel file pre-filled from the season. An optional deposit is recorded
   * straight away so the desk can take money in the same step.
   */
  async addPilgrim(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const season = await loadSeason(agencyId, id);
    if (['closed', 'completed', 'archived'].includes(season.status)) {
      throw new AppError(`This season is ${season.status} — reopen it to add pilgrims`, 400);
    }
    if (season.capacity > 0) {
      const taken = await TravelFile.countDocuments({ agencyId, seasonId: id, status: { $nin: INACTIVE_FILE } });
      if (taken >= season.capacity) throw new AppError(`This season is full (${season.capacity} seats)`, 400);
    }

    const customer = await findOrCreateCustomer(agencyId, userId, data);

    const already = await TravelFile.findOne({
      agencyId,
      seasonId: id,
      customerId: customer._id,
      status: { $nin: INACTIVE_FILE },
    });
    if (already) throw new AppError(`${customer.firstName} ${customer.lastName} is already on this season (${already.fileNumber})`, 409);

    const totalCost = data.totalCost !== undefined && data.totalCost !== '' ? Number(data.totalCost) : season.pricePerPerson;
    if (!(totalCost >= 0)) throw new AppError('Total cost must be zero or more', 400);

    const file = await travelFileService.create(agencyId, userId, {
      customerId: customer._id,
      seasonId: season._id,
      travelType: season.type,
      destination: season.destination || 'Saudi Arabia',
      departureDate: season.departureDate,
      returnDate: season.returnDate,
      departureGroup: season.name,
      packageId: season.packageId || undefined,
      totalCost,
      priority: data.priority || 'normal',
      assignedConsultant: data.assignedConsultant || undefined,
    });

    const deposit = Number(data.deposit || 0);
    if (deposit > 0) {
      await travelFileService.addPayment(agencyId, String(file._id), userId, {
        amount: deposit,
        method: data.depositMethod || 'cash',
        reference: data.depositReference,
        note: `Deposit — ${season.name}`,
      });
    }

    return file;
  },

  /** Moves existing travel files into this season (e.g. files opened before it existed). */
  async attachFiles(agencyId: string, id: string, travelFileIds: string[]) {
    const season = await loadSeason(agencyId, id);
    const ids = (Array.isArray(travelFileIds) ? travelFileIds : []).filter((x) => mongoose.isValidObjectId(x));
    if (!ids.length) throw new AppError('Select at least one travel file', 400);

    const result = await TravelFile.updateMany(
      { agencyId, _id: { $in: ids } },
      { $set: { seasonId: season._id, departureGroup: season.name } }
    );
    return { moved: result.modifiedCount };
  },

  async detachFile(agencyId: string, id: string, travelFileId: string) {
    await loadSeason(agencyId, id);
    const file = await TravelFile.findOneAndUpdate(
      { _id: travelFileId, agencyId, seasonId: id },
      { $unset: { seasonId: '' } },
      { new: true }
    );
    if (!file) throw new NotFoundError('Travel File');
    return file;
  },

  /**
   * Books one shared arrangement — the group's flight, the Makkah hotel, the
   * airport bus, the visa batch — for many pilgrims at once. Each pilgrim gets
   * their own booking on their own file, so tickets and changes stay per
   * person, but staff enter the details once.
   */
  async addArrangement(agencyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const season = await loadSeason(agencyId, id);
    const bookingType = String(data.bookingType || '');
    if (!['flight', 'ticket', 'visa', 'hotel', 'transport', 'tour', 'other'].includes(bookingType)) {
      throw new AppError('Choose what is being booked', 400);
    }
    const title = String(data.title || '').trim();
    if (!title) throw new AppError('Give the arrangement a title', 400);

    const requested = Array.isArray(data.travelFileIds) ? (data.travelFileIds as string[]) : [];
    const filter: Record<string, unknown> = { agencyId, seasonId: season._id, status: { $nin: INACTIVE_FILE } };
    if (requested.length) filter._id = { $in: requested.filter((x) => mongoose.isValidObjectId(x)) };
    const files = await TravelFile.find(filter).select('_id customerId').lean();
    if (!files.length) throw new AppError('No pilgrims selected', 400);

    const created: unknown[] = [];
    const failed: Array<{ travelFileId: string; reason: string }> = [];
    for (const f of files) {
      try {
        created.push(
          await bookingService.create(
            agencyId,
            userId,
            {
              bookingType,
              title,
              provider: data.provider || undefined,
              status: data.status || 'pending',
              startDate: data.startDate || undefined,
              endDate: data.endDate || undefined,
              cost: Number(data.costPerPerson || 0),
              details: (data.details as Record<string, unknown>) || {},
            },
            f._id.toString()
          )
        );
      } catch (error) {
        failed.push({
          travelFileId: f._id.toString(),
          reason: error instanceof Error ? error.message : 'Could not create booking',
        });
      }
    }

    return { createdCount: created.length, failedCount: failed.length, failed };
  },

  /**
   * The pilgrim manifest for the season — what goes to the Saudi ground agent,
   * the airline and the visa office. Active pilgrims only, in surname order.
   */
  async manifest(agencyId: string, id: string, preparedBy?: string) {
    const season = await loadSeason(agencyId, id);
    const agency = await Agency.findById(agencyId);
    if (!agency) throw new NotFoundError('Agency');

    const files = await TravelFile.find({ agencyId, seasonId: id, status: { $nin: INACTIVE_FILE } })
      .select('customerId visaApplicationId')
      .populate('customerId', 'firstName lastName fullName gender dateOfBirth nationality passport phone')
      .lean();

    const customerIds = files.map((f: any) => f.customerId?._id).filter(Boolean);
    const passports = files.map((f: any) => f.customerId?.passport?.number).filter(Boolean);
    const [issued, visaApps, flights] = await Promise.all([
      VisaIssuance.find({
        agencyId,
        type: 'visa',
        $or: [{ customerId: { $in: customerIds } }, { passportNumber: { $in: passports } }],
      })
        .select('customerId passportNumber documentNumber')
        .lean(),
      VisaApplication.find({ agencyId, _id: { $in: files.map((f) => f.visaApplicationId).filter(Boolean) } })
        .select('visaNumber')
        .lean(),
      Booking.find({
        agencyId,
        travelFileId: { $in: files.map((f) => f._id) },
        bookingType: { $in: ['flight', 'ticket'] },
        status: { $ne: 'cancelled' },
      })
        .select('travelFileId details.ticketNumber details.pnr')
        .lean(),
    ]);

    const visaByCustomer = new Map(issued.filter((v) => v.customerId).map((v) => [v.customerId!.toString(), v.documentNumber]));
    const visaByPassport = new Map(issued.map((v) => [String(v.passportNumber || '').toUpperCase(), v.documentNumber]));
    const visaByApp = new Map(visaApps.map((v) => [v._id.toString(), v.visaNumber]));
    const flightByFile = new Map(flights.map((b) => [b.travelFileId!.toString(), b.details]));

    const rows: ManifestRow[] = files
      .map((f: any) => {
        const c = f.customerId || {};
        const passport = String(c.passport?.number || '').toUpperCase();
        const visa =
          (c._id && visaByCustomer.get(c._id.toString())) ||
          (passport && visaByPassport.get(passport)) ||
          (f.visaApplicationId && visaByApp.get(f.visaApplicationId.toString())) ||
          '';
        const flight: any = flightByFile.get(f._id.toString());
        const remarks = flight?.ticketNumber ? `Ticket ${flight.ticketNumber}` : flight?.pnr ? `PNR ${flight.pnr}` : '';
        return {
          name: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' '),
          surname: String(c.lastName || ''),
          passportNumber: passport,
          gender: c.gender,
          dateOfBirth: c.dateOfBirth,
          nationality: c.nationality,
          passportExpiry: c.passport?.expiryDate,
          documentNumber: visa || undefined,
          phone: c.phone,
          remarks,
        };
      })
      .sort((a, b) => a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name))
      .map(({ surname: _s, ...row }) => row);

    const label = season.type === 'hajj' ? 'HAJJ' : 'UMRAH';
    const buffer = await generateManifestPDF(agency, rows, {
      title: `${label} PILGRIM MANIFEST`,
      groupName: season.name,
      destination: season.destination,
      travelDate: season.departureDate,
      returnDate: season.returnDate,
      airline: season.airline,
      numberLabel: 'Visa number',
      extraDetails: [
        { label: 'Makkah hotel', value: season.makkahHotel },
        { label: 'Madinah hotel', value: season.madinahHotel },
      ],
      preparedBy,
    });

    const slug = season.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { buffer, filename: `${slug || 'season'}-manifest.pdf` };
  },
};
