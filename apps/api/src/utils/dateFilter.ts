/**
 * One date-range parser shared by every list endpoint, so "October" means the
 * same thing on travel files, bookings, visas and payments.
 *
 * Accepts, in order of precedence:
 *   month=2026-10          a calendar month
 *   year=2026              a calendar year
 *   from=...&to=...        an explicit range (either side optional)
 *   period=this_month      a named shortcut
 *
 * `to` is treated as inclusive of that whole day — a user picking 31 October
 * means "up to the end of the 31st", not midnight at its start.
 */
export type DatePeriod =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year';

export interface DateRange {
  from?: Date;
  to?: Date;
}

const MONTH_RE = /^(\d{4})-(\d{1,2})$/;

export function parseDateRange(query: Record<string, unknown>): DateRange | null {
  const month = str(query.month);
  const year = str(query.year);
  const from = str(query.from);
  const to = str(query.to);
  const period = str(query.period) as DatePeriod | undefined;

  if (month) {
    const m = MONTH_RE.exec(month);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      if (mo >= 0 && mo <= 11) {
        return { from: new Date(y, mo, 1, 0, 0, 0, 0), to: new Date(y, mo + 1, 0, 23, 59, 59, 999) };
      }
    }
  }

  if (year && /^\d{4}$/.test(year)) {
    const y = Number(year);
    return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999) };
  }

  if (from || to) {
    const range: DateRange = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) range.from = startOfDay(d);
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) range.to = endOfDay(d);
    }
    return range.from || range.to ? range : null;
  }

  if (period) return fromPeriod(period);

  return null;
}

function fromPeriod(period: DatePeriod): DateRange | null {
  const now = new Date();

  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'last_7_days':
      return { from: startOfDay(daysAgo(6)), to: endOfDay(now) };
    case 'last_30_days':
      return { from: startOfDay(daysAgo(29)), to: endOfDay(now) };
    case 'this_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(new Date(now.getFullYear(), 11, 31)) };
    default:
      return null;
  }
}

/**
 * Turns a range into a Mongo clause on the chosen field. Returns an empty
 * object when there is no range, so it is always safe to spread into a filter.
 */
export function dateClause(
  range: DateRange | null,
  field: string
): Record<string, { $gte?: Date; $lte?: Date }> {
  if (!range || (!range.from && !range.to)) return {};
  const clause: { $gte?: Date; $lte?: Date } = {};
  if (range.from) clause.$gte = range.from;
  if (range.to) clause.$lte = range.to;
  return { [field]: clause };
}

/**
 * Which date a list filters on. Callers pass an allow-list so a client cannot
 * aim the filter at an arbitrary field.
 */
export function pickDateField(
  query: Record<string, unknown>,
  allowed: string[],
  fallback: string
): string {
  const requested = str(query.dateField);
  return requested && allowed.includes(requested) ? requested : fallback;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
