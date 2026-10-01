'use client';
import { useState } from 'react';
import { CalendarRange, X } from 'lucide-react';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface DateFilterValue {
  /** 'YYYY-MM' for a single calendar month. */
  month?: string;
  period?: string;
  from?: string;
  to?: string;
  /** Which date to filter on, from the page's allowed list. */
  dateField?: string;
}

const PERIODS = [
  { value: '', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'month', label: 'Pick a month…' },
];

/** The last 24 months, newest first — agencies look backwards, not forwards. */
function recentMonths(): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    });
  }
  return out;
}

/**
 * One date filter shared by every list, so "October" means the same thing on
 * travel files, bookings, visas and payments.
 */
export function DateRangeFilter({
  value,
  onChange,
  fields,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
  /** Which dates this page can filter on, e.g. created vs departure. */
  fields?: Array<{ value: string; label: string }>;
}) {
  const [pickingMonth, setPickingMonth] = useState(!!value.month);

  const active = !!(value.month || value.period || value.from || value.to);

  function setPeriod(next: string) {
    if (next === 'month') {
      setPickingMonth(true);
      const now = new Date();
      onChange({
        ...value,
        period: undefined,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      });
      return;
    }
    setPickingMonth(false);
    onChange({ ...value, month: undefined, from: undefined, to: undefined, period: next || undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="h-3.5 w-3.5 shrink-0 text-neutral-400" />

      <Select
        value={pickingMonth ? 'month' : value.period || ''}
        onChange={(e) => setPeriod(e.target.value)}
        className="w-40"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </Select>

      {pickingMonth && (
        <Select
          value={value.month || ''}
          onChange={(e) => onChange({ ...value, month: e.target.value, period: undefined })}
          className="w-44"
        >
          {recentMonths().map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
      )}

      {fields && fields.length > 1 && active && (
        <Select
          value={value.dateField || fields[0].value}
          onChange={(e) => onChange({ ...value, dateField: e.target.value })}
          className="w-40"
        >
          {fields.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
      )}

      {active && (
        <Button size="sm" variant="ghost" onClick={() => { setPickingMonth(false); onChange({}); }}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

/** Strips empty keys so they never reach the API as `?month=`. */
export function dateParams(value: DateFilterValue): Record<string, string> {
  const out: Record<string, string> = {};
  if (value.month) out.month = value.month;
  if (value.period) out.period = value.period;
  if (value.from) out.from = value.from;
  if (value.to) out.to = value.to;
  if (value.dateField && (value.month || value.period || value.from || value.to)) {
    out.dateField = value.dateField;
  }
  return out;
}
