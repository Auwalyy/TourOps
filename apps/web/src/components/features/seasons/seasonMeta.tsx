import { Check, Circle, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PilgrimStep, SeasonStatus, StepState } from '@/types';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SEASON_STATUS: Record<SeasonStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'border-neutral-200 bg-neutral-50 text-neutral-600' },
  open: { label: 'Open for booking', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  closed: { label: 'Booking closed', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  departed: { label: 'Departed', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  archived: { label: 'Archived', className: 'border-neutral-200 bg-neutral-50 text-neutral-500' },
};

export function SeasonStatusBadge({ status }: { status: SeasonStatus }) {
  const s = SEASON_STATUS[status] || SEASON_STATUS.planning;
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium', s.className)}>
      {s.label}
    </span>
  );
}

/** The six things every pilgrim needs before they can fly, in the order they usually happen. */
export const STEPS: Array<{ id: PilgrimStep; label: string; short: string }> = [
  { id: 'passport', label: 'Passport', short: 'Passport' },
  { id: 'payment', label: 'Payment', short: 'Paid' },
  { id: 'visa', label: 'Visa', short: 'Visa' },
  { id: 'ticket', label: 'Flight ticket', short: 'Ticket' },
  { id: 'hotel', label: 'Hotel', short: 'Hotel' },
  { id: 'transport', label: 'Transport', short: 'Transport' },
];

const STEP_HINT: Record<PilgrimStep, Record<StepState, string>> = {
  passport: { done: 'Original passport received', in_progress: 'Passport number on file, original not yet received', missing: 'No passport details' },
  payment: { done: 'Fully paid', in_progress: 'Part-paid', missing: 'Nothing paid yet' },
  visa: { done: 'Visa issued / approved', in_progress: 'Visa in progress', missing: 'No visa started' },
  ticket: { done: 'Ticket confirmed', in_progress: 'Flight booking pending', missing: 'No flight booked' },
  hotel: { done: 'Hotel confirmed', in_progress: 'Hotel booking pending', missing: 'No hotel booked' },
  transport: { done: 'Transport confirmed', in_progress: 'Transport booking pending', missing: 'No transport booked' },
};

export function StepDot({ step, state }: { step: PilgrimStep; state: StepState }) {
  const title = STEP_HINT[step][state];
  if (state === 'done') {
    return (
      <span title={title} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span title={title} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <CircleDashed className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span title={title} className="inline-flex h-5 w-5 items-center justify-center text-neutral-300">
      <Circle className="h-3.5 w-3.5" />
    </span>
  );
}

export function seasonLabel(type: 'umrah' | 'hajj') {
  return type === 'hajj' ? 'Hajj' : 'Umrah';
}
