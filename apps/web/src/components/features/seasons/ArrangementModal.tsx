'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { seasonsApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Season } from '@/types';

type Kind = 'flight' | 'visa' | 'hotel' | 'transport' | 'other';

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: 'flight', label: 'Flight ticket' },
  { id: 'visa', label: 'Visa' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'transport', label: 'Transport' },
  { id: 'other', label: 'Other' },
];

/** Detail fields per kind, stored on Booking.details exactly as single bookings store them. */
const DETAIL_FIELDS: Record<Kind, Array<{ key: string; label: string; type?: string }>> = {
  flight: [
    { key: 'airline', label: 'Airline' },
    { key: 'flightNumber', label: 'Flight number' },
    { key: 'departureLocation', label: 'From' },
    { key: 'arrivalLocation', label: 'To' },
    { key: 'pnr', label: 'Group PNR' },
    { key: 'baggageAllowance', label: 'Baggage' },
  ],
  visa: [
    { key: 'visaType', label: 'Visa type' },
    { key: 'entryType', label: 'Entry (single / multiple)' },
  ],
  hotel: [
    { key: 'hotelName', label: 'Hotel name' },
    { key: 'city', label: 'City' },
    { key: 'roomType', label: 'Room type (e.g. Quad)' },
    { key: 'numberOfNights', label: 'Nights', type: 'number' },
  ],
  transport: [
    { key: 'vehicleType', label: 'Vehicle' },
    { key: 'pickupLocation', label: 'Pick-up' },
    { key: 'dropoffLocation', label: 'Drop-off' },
    { key: 'driverPhone', label: 'Driver phone' },
  ],
  other: [],
};

function suggestTitle(kind: Kind, season: Season, details: Record<string, string>) {
  switch (kind) {
    case 'flight': return `${details.airline || season.airline || 'Group'} flight — ${season.name}`;
    case 'visa': return `${season.type === 'hajj' ? 'Hajj' : 'Umrah'} visa — ${season.name}`;
    case 'hotel': return `${details.hotelName || 'Hotel'}${details.city ? `, ${details.city}` : ''}`;
    case 'transport': return `${details.vehicleType || 'Ground transport'} — ${season.name}`;
    default: return '';
  }
}

export function ArrangementModal({
  open,
  onClose,
  season,
  travelFileIds,
  selectedCount,
  totalCount,
}: {
  open: boolean;
  onClose: () => void;
  season: Season;
  /** Empty means everyone active on the season. */
  travelFileIds: string[];
  selectedCount: number;
  totalCount: number;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>('flight');
  const [form, setForm] = useState({ title: '', provider: '', status: 'pending', startDate: '', endDate: '', costPerPerson: '' });
  const [details, setDetails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setKind('flight');
    setDetails({ airline: season.airline || '' });
    setForm({
      title: '',
      provider: '',
      status: 'pending',
      startDate: season.departureDate?.slice(0, 10) || '',
      endDate: season.returnDate?.slice(0, 10) || '',
      costPerPerson: '',
    });
  }, [open, season]);

  function pickKind(k: Kind) {
    setKind(k);
    // Pre-fill the hotel the season already names, so staff only confirm it.
    if (k === 'hotel') setDetails({ hotelName: season.makkahHotel || '', city: season.makkahHotel ? 'Makkah' : '' });
    else if (k === 'flight') setDetails({ airline: season.airline || '' });
    else setDetails({});
  }

  const save = useMutation({
    mutationFn: () => {
      const cleanDetails: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(details)) if (v !== '') cleanDetails[k] = v;
      if (kind === 'hotel') {
        if (form.startDate) cleanDetails.checkInDate = form.startDate;
        if (form.endDate) cleanDetails.checkOutDate = form.endDate;
      }
      if (kind === 'flight' && form.startDate) cleanDetails.departureDateTime = form.startDate;
      return seasonsApi.addArrangement(season._id, {
        bookingType: kind,
        title: form.title.trim() || suggestTitle(kind, season, details),
        provider: form.provider || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        costPerPerson: Number(form.costPerPerson || 0),
        details: cleanDetails,
        travelFileIds,
      });
    },
    onSuccess: (res) => {
      const r = res.data.data;
      if (r.failedCount) toast.warning(`Booked for ${r.createdCount}; ${r.failedCount} could not be booked`);
      else toast.success(`Booked for ${r.createdCount} pilgrim(s)`);
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['travel-files'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not create the bookings'),
  });

  const who = selectedCount > 0 ? `${selectedCount} selected pilgrim(s)` : `all ${totalCount} active pilgrim(s)`;
  const title = form.title || suggestTitle(kind, season, details);
  const dateLabels = kind === 'hotel' ? ['Check-in', 'Check-out'] : kind === 'flight' ? ['Departure', 'Return'] : ['Start', 'End'];

  return (
    <Modal open={open} onClose={onClose} title="Book for the group" size="lg">
      <form className="space-y-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-[13px] text-neutral-600">
          Enter it once — a separate booking is added to the travel file of <span className="font-medium text-neutral-900">{who}</span>, so tickets and changes stay per person.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => pickKind(k.id)}
              className={`rounded-md border px-3 py-1.5 text-[13px] transition-colors ${
                kind === k.id ? 'border-blue-600 bg-blue-50 font-medium text-blue-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {DETAIL_FIELDS[kind].length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DETAIL_FIELDS[kind].map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type || 'text'}
                  value={details[f.key] || ''}
                  onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={title || 'Describe the arrangement'} />
          </div>
          <div>
            <Label>{dateLabels[0]}</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <Label>{dateLabels[1]}</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <Label>Supplier / provider</Label>
            <Input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Optional" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="reserved">Reserved</option>
              <option value="confirmed">Confirmed</option>
              {kind === 'flight' && <option value="ticketed">Ticketed</option>}
            </Select>
          </div>
          <div>
            <Label>Charge per pilgrim (₦)</Label>
            <Input type="number" min="0" value={form.costPerPerson} onChange={(e) => setForm((f) => ({ ...f, costPerPerson: e.target.value }))} placeholder="0 — included in package" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={!title.trim()}>Create bookings</Button>
        </div>
      </form>
    </Modal>
  );
}
