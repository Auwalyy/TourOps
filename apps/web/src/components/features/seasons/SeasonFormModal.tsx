'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { seasonsApi, packagesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Season, SeasonType } from '@/types';
import { refId } from '@/lib/utils';
import { MONTHS, SEASON_STATUS, seasonLabel } from './seasonMeta';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Editing an existing season; omit to create one. */
  season?: Season;
  defaultType?: SeasonType;
}

function emptyForm(type: SeasonType) {
  const now = new Date();
  return {
    type,
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    name: '',
    departureDate: '',
    returnDate: '',
    destination: 'Saudi Arabia',
    packageId: '',
    pricePerPerson: '',
    capacity: '',
    airline: '',
    makkahHotel: '',
    madinahHotel: '',
    status: 'open',
    notes: '',
  };
}

function fromSeason(s: Season) {
  return {
    type: s.type,
    month: String(s.month),
    year: String(s.year),
    name: s.name,
    departureDate: s.departureDate?.slice(0, 10) || '',
    returnDate: s.returnDate?.slice(0, 10) || '',
    destination: s.destination || '',
    packageId: refId(s.packageId),
    pricePerPerson: s.pricePerPerson ? String(s.pricePerPerson) : '',
    capacity: s.capacity ? String(s.capacity) : '',
    airline: s.airline || '',
    makkahHotel: s.makkahHotel || '',
    madinahHotel: s.madinahHotel || '',
    status: s.status,
    notes: s.notes || '',
  };
}

export function SeasonFormModal({ open, onClose, season, defaultType = 'umrah' }: Props) {
  const qc = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState(() => (season ? fromSeason(season) : emptyForm(defaultType)));
  const [applyDates, setApplyDates] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(season ? fromSeason(season) : emptyForm(defaultType));
      setApplyDates(false);
    }
  }, [open, season, defaultType]);

  const { data: packages } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => packagesApi.list({ status: 'active', limit: 100 }).then((r) => r.data.data.data ?? r.data.data),
    enabled: open,
  });

  const set = (key: keyof ReturnType<typeof emptyForm>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const suggestedName = `${MONTHS[Number(form.month) - 1]} ${seasonLabel(form.type)} ${form.year}`;
  const datesChanged =
    !!season &&
    (form.departureDate !== (season.departureDate?.slice(0, 10) || '') ||
      form.returnDate !== (season.returnDate?.slice(0, 10) || ''));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        name: form.name.trim() || suggestedName,
        month: Number(form.month),
        year: Number(form.year),
        pricePerPerson: Number(form.pricePerPerson || 0),
        capacity: Number(form.capacity || 0),
        applyDatesToPilgrims: datesChanged && applyDates,
      };
      return season ? seasonsApi.update(season._id, payload) : seasonsApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(season ? 'Season updated' : 'Season created');
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['travel-files'] });
      onClose();
      if (!season) router.push(`/seasons/${res.data.data._id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not save the season'),
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <Modal open={open} onClose={onClose} title={season ? 'Edit season' : 'New Umrah / Hajj season'} size="lg">
      <form
        className="space-y-5 p-5"
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label>Type *</Label>
            <Select value={form.type} onChange={set('type')} disabled={!!season}>
              <option value="umrah">Umrah</option>
              <option value="hajj">Hajj</option>
            </Select>
          </div>
          <div>
            <Label>Month *</Label>
            <Select value={form.month} onChange={set('month')}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </div>
          <div>
            <Label>Year *</Label>
            <Select value={form.year} onChange={set('year')}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Season name</Label>
            <Input value={form.name} onChange={set('name')} placeholder={suggestedName} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={set('status')}>
              {Object.entries(SEASON_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
          </div>
        </div>

        <fieldset className="space-y-3 rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 text-xs font-medium text-neutral-600">Trip</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Departure date</Label>
              <Input type="date" value={form.departureDate} onChange={set('departureDate')} />
            </div>
            <div>
              <Label>Return date</Label>
              <Input type="date" value={form.returnDate} onChange={set('returnDate')} />
            </div>
            <div>
              <Label>Destination</Label>
              <Input value={form.destination} onChange={set('destination')} />
            </div>
            <div>
              <Label>Airline</Label>
              <Input value={form.airline} onChange={set('airline')} placeholder="e.g. Saudia" />
            </div>
            <div>
              <Label>Makkah hotel</Label>
              <Input value={form.makkahHotel} onChange={set('makkahHotel')} />
            </div>
            <div>
              <Label>Madinah hotel</Label>
              <Input value={form.madinahHotel} onChange={set('madinahHotel')} />
            </div>
          </div>
          {datesChanged && (
            <label className="flex items-center gap-2 text-[13px] text-neutral-700">
              <input type="checkbox" checked={applyDates} onChange={(e) => setApplyDates(e.target.checked)} />
              Also move every active pilgrim on this season to the new dates
            </label>
          )}
        </fieldset>

        <fieldset className="rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 text-xs font-medium text-neutral-600">Pricing &amp; seats</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Price per pilgrim (₦)</Label>
              <Input type="number" min="0" value={form.pricePerPerson} onChange={set('pricePerPerson')} placeholder="0" />
            </div>
            <div>
              <Label>Seats available</Label>
              <Input type="number" min="0" value={form.capacity} onChange={set('capacity')} placeholder="No limit" />
            </div>
            <div>
              <Label>Linked package</Label>
              <Select value={form.packageId} onChange={set('packageId')}>
                <option value="">None</option>
                {Array.isArray(packages) && packages.map((p: any) => <option key={p._id} value={p._id}>{p.title}</option>)}
              </Select>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            New pilgrims start at this price — you can still change any individual file.
          </p>
        </fieldset>

        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={set('notes')} placeholder="Internal notes for staff" />
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{season ? 'Save changes' : 'Create season'}</Button>
        </div>
      </form>
    </Modal>
  );
}
