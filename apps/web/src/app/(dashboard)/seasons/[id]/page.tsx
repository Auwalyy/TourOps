'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, BedDouble, CalendarDays, FolderInput, Pencil, Plane, Plus, Trash2, Upload, UserMinus, Users,
} from 'lucide-react';
import { seasonsApi } from '@/services/api.service';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/shared/SearchInput';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { PilgrimStep, SeasonDetail, SeasonPilgrim } from '@/types';
import { SeasonFormModal } from '@/components/features/seasons/SeasonFormModal';
import { AddPilgrimModal } from '@/components/features/seasons/AddPilgrimModal';
import { ArrangementModal } from '@/components/features/seasons/ArrangementModal';
import { AttachFilesModal } from '@/components/features/seasons/AttachFilesModal';
import { BulkPassportModal } from '@/components/features/travel-files/BulkPassportModal';
import { STEPS, SeasonStatusBadge, StepDot, seasonLabel } from '@/components/features/seasons/seasonMeta';

const INACTIVE = ['cancelled', 'archived'];

function pilgrimName(p: SeasonPilgrim) {
  const c = p.customerId;
  return c?.fullName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || '—';
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'red' }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold text-neutral-900', tone === 'red' && 'text-red-600')}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-400">{sub}</p>}
    </Card>
  );
}

export default function SeasonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [missing, setMissing] = useState<'' | PilgrimStep>('');
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<'' | 'edit' | 'add' | 'bulk' | 'attach' | 'arrange' | 'delete'>('');
  const [removing, setRemoving] = useState<SeasonPilgrim | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seasons', id],
    queryFn: () => seasonsApi.getById(id).then((r) => r.data.data as SeasonDetail),
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) => seasonsApi.detachFile(id, fileId),
    onSuccess: () => {
      toast.success('Pilgrim removed from season — their travel file is kept');
      setRemoving(null);
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['travel-files'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not remove pilgrim'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => seasonsApi.delete(id),
    onSuccess: () => {
      toast.success('Season deleted');
      qc.invalidateQueries({ queryKey: ['seasons'] });
      router.push('/seasons');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not delete season'),
  });

  const pilgrims = data?.pilgrims || [];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pilgrims.filter((p) => {
      if (!showInactive && INACTIVE.includes(p.status)) return false;
      if (missing && p.checklist[missing] === 'done') return false;
      if (!q) return true;
      const c = p.customerId;
      return [pilgrimName(p), p.fileNumber, c?.phone, c?.email, c?.passport?.number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [pilgrims, search, missing, showInactive]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-neutral-500">This season could not be found.</p>
        <Link href="/seasons" className="mt-3 inline-block text-[13px] font-medium text-blue-600">Back to Umrah &amp; Hajj</Link>
      </div>
    );
  }

  const { season, totals } = data;
  const activeCount = totals.pilgrims;
  const inactiveCount = pilgrims.length - activeCount;
  const visibleIds = visible.filter((p) => !INACTIVE.includes(p.status)).map((p) => p._id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((x) => selected.includes(x));
  const selectedActive = selected.filter((x) => pilgrims.some((p) => p._id === x && !INACTIVE.includes(p.status)));
  const pkg = typeof season.packageId === 'object' ? season.packageId : null;
  const full = totals.seatsLeft === 0;

  function toggleAll() {
    setSelected(allChecked ? selected.filter((x) => !visibleIds.includes(x)) : Array.from(new Set([...selected, ...visibleIds])));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href={`/seasons${season.type === 'hajj' ? '?tab=hajj' : ''}`} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800">
            <ArrowLeft className="h-3.5 w-3.5" /> {seasonLabel(season.type)} seasons
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-neutral-900">{season.name}</h1>
            <SeasonStatusBadge status={season.status} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-neutral-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {season.departureDate ? formatDate(season.departureDate) : 'Departure not set'}
              {season.returnDate && ` – ${formatDate(season.returnDate)}`}
            </span>
            <span>{season.destination}</span>
            {season.pricePerPerson > 0 && <span>{formatCurrency(season.pricePerPerson)} per pilgrim</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setModal('edit')}><Pencil className="h-3.5 w-3.5" /> Edit season</Button>
          <Button variant="outline" onClick={() => setModal('attach')}><FolderInput className="h-3.5 w-3.5" /> Move files in</Button>
          <Button variant="outline" onClick={() => setModal('bulk')} disabled={full}><Upload className="h-3.5 w-3.5" /> Bulk from passports</Button>
          <Button onClick={() => setModal('add')} disabled={full} title={full ? 'This season is fully booked' : undefined}>
            <Plus className="h-3.5 w-3.5" /> Add pilgrim
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Pilgrims"
          value={totals.capacity > 0 ? `${activeCount} / ${totals.capacity}` : String(activeCount)}
          sub={totals.seatsLeft !== null ? (full ? 'Fully booked' : `${totals.seatsLeft} seat(s) left`) : 'No seat limit'}
        />
        <Stat label="Expected" value={formatCurrency(totals.totalCost)} />
        <Stat label="Collected" value={formatCurrency(totals.amountPaid)} sub={totals.totalCost > 0 ? `${Math.round((totals.amountPaid / totals.totalCost) * 100)}% of expected` : undefined} />
        <Stat label="Outstanding" value={formatCurrency(totals.balance)} tone={totals.balance > 0 ? 'red' : undefined} />
      </div>

      {/* Readiness + shared arrangements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Readiness</CardTitle><span className="text-xs text-neutral-500">Pilgrims complete per step</span></CardHeader>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-3">
            {STEPS.map((s) => {
              const done = totals.steps[s.id];
              const pct = activeCount ? Math.round((done / activeCount) * 100) : 0;
              return (
                <button key={s.id} type="button" onClick={() => setMissing(missing === s.id ? '' : s.id)} className="text-left" title={`Show pilgrims still missing: ${s.label}`}>
                  <div className="flex justify-between text-xs">
                    <span className={cn('text-neutral-600', missing === s.id && 'font-medium text-blue-700')}>{s.label}</span>
                    <span className="text-neutral-500">{done}/{activeCount}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-100">
                    <div className={cn('h-1.5 rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-blue-600')} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Group arrangements</CardTitle></CardHeader>
          <dl className="space-y-2 px-5 py-4 text-[13px]">
            {[
              { icon: Plane, label: 'Airline', value: season.airline },
              { icon: BedDouble, label: 'Makkah', value: season.makkahHotel },
              { icon: BedDouble, label: 'Madinah', value: season.madinahHotel },
              { icon: Users, label: 'Package', value: pkg?.title },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <dt className="w-16 shrink-0 text-neutral-500">{label}</dt>
                <dd className={cn('truncate', value ? 'font-medium text-neutral-900' : 'text-neutral-400')}>{value || 'Not set'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Pilgrims */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, passport, file #…" className="w-full lg:max-w-xs" />
          <Select value={missing} onChange={(e) => setMissing(e.target.value as any)} className="w-full lg:w-48">
            <option value="">All pilgrims</option>
            {STEPS.map((s) => <option key={s.id} value={s.id}>Missing: {s.label}</option>)}
          </Select>
          {inactiveCount > 0 && (
            <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-neutral-600">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show cancelled ({inactiveCount})
            </label>
          )}
          <div className="flex items-center gap-2 lg:ml-auto">
            {selectedActive.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear ({selectedActive.length})</Button>
            )}
            <Button variant="outline" onClick={() => setModal('arrange')} disabled={!activeCount} className="w-full lg:w-auto">
              <Plane className="h-3.5 w-3.5" /> {selectedActive.length ? `Book for ${selectedActive.length} selected` : 'Book for whole group'}
            </Button>
          </div>
        </div>

        {!pilgrims.length ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-neutral-300" strokeWidth={1.5} />
            <p className="text-sm font-medium text-neutral-700">No pilgrims on this season yet</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-neutral-500">
              Add pilgrims one by one, upload a batch of passports, or move travel files you already opened.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setModal('add')}><Plus className="h-3.5 w-3.5" /> Add pilgrim</Button>
              <Button variant="outline" onClick={() => setModal('bulk')}><Upload className="h-3.5 w-3.5" /> Bulk from passports</Button>
            </div>
          </div>
        ) : !visible.length ? (
          <p className="px-6 py-12 text-center text-[13px] text-neutral-500">No pilgrims match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                  <th className="w-10 px-4 py-2.5 text-left">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th className="px-2 py-2.5 text-left font-medium">Pilgrim</th>
                  <th className="px-2 py-2.5 text-left font-medium">Passport</th>
                  {STEPS.map((s) => <th key={s.id} className="px-1 py-2.5 text-center font-medium">{s.short}</th>)}
                  <th className="px-2 py-2.5 text-right font-medium">Balance</th>
                  <th className="px-2 py-2.5 text-left font-medium">File status</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visible.map((p) => {
                  const inactive = INACTIVE.includes(p.status);
                  return (
                    <tr
                      key={p._id}
                      onClick={() => router.push(`/travel-files/${p._id}`)}
                      className={cn('cursor-pointer transition-colors hover:bg-neutral-50', inactive && 'opacity-50')}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {!inactive && (
                          <input
                            type="checkbox"
                            checked={selected.includes(p._id)}
                            onChange={() => setSelected((s) => (s.includes(p._id) ? s.filter((x) => x !== p._id) : [...s, p._id]))}
                            aria-label={`Select ${pilgrimName(p)}`}
                          />
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-neutral-900">{pilgrimName(p)}</p>
                        <p className="text-xs text-neutral-500">
                          <span className="font-mono text-blue-600">{p.fileNumber}</span>
                          {p.customerId?.phone && ` · ${p.customerId.phone}`}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 font-mono text-xs text-neutral-600">{p.customerId?.passport?.number || '—'}</td>
                      {STEPS.map((s) => (
                        <td key={s.id} className="px-1 py-2.5 text-center">
                          <span className="inline-flex"><StepDot step={s.id} state={p.checklist[s.id]} /></span>
                        </td>
                      ))}
                      <td className={cn('px-2 py-2.5 text-right font-medium tabular', p.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>
                        {p.balance > 0 ? formatCurrency(p.balance) : 'Paid'}
                      </td>
                      <td className="px-2 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setRemoving(p)}
                          title="Remove from this season"
                          className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pilgrims.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 border-t border-neutral-200 px-4 py-2.5 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5"><StepDot step="visa" state="done" /> Done</span>
            <span className="flex items-center gap-1.5"><StepDot step="visa" state="in_progress" /> In progress</span>
            <span className="flex items-center gap-1.5"><StepDot step="visa" state="missing" /> Not started</span>
            <span className="ml-auto">Open a pilgrim to add their ticket, visa, hotel, transport, documents and payments.</span>
          </div>
        )}
      </Card>

      {season.notes && (
        <Card className="px-5 py-4">
          <p className="text-xs font-medium text-neutral-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-neutral-700">{season.notes}</p>
        </Card>
      )}

      {pilgrims.length === 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setModal('delete')} className="text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete this season
          </Button>
        </div>
      )}

      <SeasonFormModal open={modal === 'edit'} onClose={() => setModal('')} season={season} />
      <AddPilgrimModal open={modal === 'add'} onClose={() => setModal('')} season={season} />
      <AttachFilesModal open={modal === 'attach'} onClose={() => setModal('')} season={season} />
      {modal === 'bulk' && <BulkPassportModal open onClose={() => setModal('')} season={season} />}
      <ArrangementModal
        open={modal === 'arrange'}
        onClose={() => setModal('')}
        season={season}
        travelFileIds={selectedActive}
        selectedCount={selectedActive.length}
        totalCount={activeCount}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMutation.mutate(removing._id)}
        loading={removeMutation.isPending}
        title="Remove from season?"
        description={removing ? `${pilgrimName(removing)} will be taken off ${season.name}. Their travel file, bookings and payments are kept.` : ''}
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={modal === 'delete'}
        onClose={() => setModal('')}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete season?"
        description={`${season.name} has no pilgrims and will be permanently deleted.`}
        confirmLabel="Delete season"
      />
    </div>
  );
}
