'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Folder, Plane, Plus, Users } from 'lucide-react';
import { seasonsApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, Skeleton } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Tabs, TabDef, useTabParam } from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SeasonSummary, SeasonType } from '@/types';
import { SeasonFormModal } from '@/components/features/seasons/SeasonFormModal';
import { MONTHS, SeasonStatusBadge, seasonLabel } from '@/components/features/seasons/seasonMeta';

const TABS: TabDef[] = [
  { id: 'umrah', label: 'Umrah', icon: Folder },
  { id: 'hajj', label: 'Hajj', icon: Folder },
];

function SeasonCard({ s }: { s: SeasonSummary }) {
  const paidPct = s.totalCost > 0 ? Math.min(100, Math.round((s.amountPaid / s.totalCost) * 100)) : 0;
  return (
    <Link href={`/seasons/${s._id}`} className="group block">
      <Card className="h-full p-4 transition-colors group-hover:border-blue-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <span className="text-[10px] font-semibold uppercase leading-none">{MONTHS[s.month - 1].slice(0, 3)}</span>
              <span className="mt-0.5 text-[11px] leading-none">{String(s.year).slice(-2)}</span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{s.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                <CalendarDays className="h-3 w-3" />
                {s.departureDate ? formatDate(s.departureDate) : 'Dates not set'}
                {s.returnDate && ` – ${formatDate(s.returnDate)}`}
              </p>
            </div>
          </div>
          <SeasonStatusBadge status={s.status} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-neutral-50 py-2">
            <p className="text-base font-semibold text-neutral-900">
              {s.pilgrims}{s.capacity > 0 && <span className="text-xs font-normal text-neutral-400">/{s.capacity}</span>}
            </p>
            <p className="text-[11px] text-neutral-500">Pilgrims</p>
          </div>
          <div className="rounded-md bg-neutral-50 py-2">
            <p className="text-base font-semibold text-neutral-900">{s.ready}</p>
            <p className="text-[11px] text-neutral-500">Ready</p>
          </div>
          <div className="rounded-md bg-neutral-50 py-2">
            <p className="text-base font-semibold text-neutral-900">{paidPct}%</p>
            <p className="text-[11px] text-neutral-500">Paid</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-100">
          <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${paidPct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-neutral-500">
          <span>{formatCurrency(s.amountPaid)} collected</span>
          <span className={s.balance > 0 ? 'text-red-600' : ''}>{formatCurrency(s.balance)} due</span>
        </div>
        {s.seatsLeft !== null && (
          <p className="mt-2 text-xs text-neutral-500">
            {s.seatsLeft === 0 ? <span className="font-medium text-amber-700">Fully booked</span> : `${s.seatsLeft} seat(s) left`}
          </p>
        )}
      </Card>
    </Link>
  );
}

function SeasonsPageInner() {
  const { active, setActive } = useTabParam(TABS);
  const type = active as SeasonType;
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seasons', { type, statusFilter }],
    queryFn: () => seasonsApi.list({ type, status: statusFilter || undefined }).then((r) => r.data.data as SeasonSummary[]),
  });

  const seasons = data || [];
  const years = Array.from(new Set(seasons.map((s) => s.year))).sort((a, b) => b - a);
  const totals = seasons.reduce(
    (t, s) => ({ pilgrims: t.pilgrims + s.pilgrims, due: t.due + s.balance }),
    { pilgrims: 0, due: 0 }
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Umrah & Hajj"
        description="One folder per departure month. Open a season to register pilgrims and track their ticket, visa, hotel, transport and payment."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> New {seasonLabel(type)} season
          </Button>
        }
      />

      <Tabs tabs={TABS} active={active} onChange={setActive} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-4 text-[13px] text-neutral-500">
          <span className="flex items-center gap-1.5"><Plane className="h-3.5 w-3.5" />{seasons.length} season(s)</span>
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{totals.pilgrims} pilgrim(s)</span>
          {totals.due > 0 && <span>{formatCurrency(totals.due)} outstanding</span>}
        </p>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">Current seasons</option>
          <option value="open">Open for booking</option>
          <option value="planning">Planning</option>
          <option value="closed">Booking closed</option>
          <option value="departed">Departed</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
          <option value="all">Everything</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
        </div>
      ) : !seasons.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Folder className="mx-auto mb-3 h-10 w-10 text-neutral-300" strokeWidth={1.5} />
            <p className="text-sm font-medium text-neutral-700">No {seasonLabel(type)} seasons yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-neutral-500">
              Create a folder for each departure — e.g. “November {seasonLabel(type)} {new Date().getFullYear()}” — then add pilgrims to it.
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Create the first season
            </Button>
          </CardContent>
        </Card>
      ) : (
        years.map((year) => (
          <section key={year} className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400">{year}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {seasons.filter((s) => s.year === year).map((s) => <SeasonCard key={s._id} s={s} />)}
            </div>
          </section>
        ))
      )}

      <SeasonFormModal open={showForm} onClose={() => setShowForm(false)} defaultType={type} />
    </div>
  );
}

export default function SeasonsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SeasonsPageInner />
    </Suspense>
  );
}
