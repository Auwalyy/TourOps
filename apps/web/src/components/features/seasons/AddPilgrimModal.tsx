'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ScanLine } from 'lucide-react';
import { seasonsApi, customersApi, aiApi, usersApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { SearchInput } from '@/components/shared/SearchInput';
import { formatCurrency, cn } from '@/lib/utils';
import { Season } from '@/types';
import { useEntitlements } from '@/hooks/useEntitlements';

const EMPTY = {
  firstName: '', lastName: '', phone: '', email: '', gender: '', dateOfBirth: '',
  nationality: '', passportNumber: '', passportExpiry: '',
};

/**
 * Registers one pilgrim on a season: their customer record (matched on
 * passport/phone so returning pilgrims are not duplicated) and their travel
 * file, priced from the season, with an optional deposit taken in the same step.
 */
export function AddPilgrimModal({ open, onClose, season }: { open: boolean; onClose: () => void; season: Season }) {
  const qc = useQueryClient();
  const { entitlements } = useEntitlements();
  const scanRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [person, setPerson] = useState({ ...EMPTY });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [money, setMoney] = useState({ totalCost: '', deposit: '', depositMethod: 'cash', depositReference: '' });
  const [consultant, setConsultant] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('new');
    setPerson({ ...EMPTY });
    setCustomerSearch('');
    setCustomerId('');
    setConsultant('');
    setMoney({ totalCost: season.pricePerPerson ? String(season.pricePerPerson) : '', deposit: '', depositMethod: 'cash', depositReference: '' });
  }, [open, season.pricePerPerson]);

  const { data: customers, isFetching: searching } = useQuery({
    queryKey: ['customers', 'pick', customerSearch],
    queryFn: () => customersApi.list({ search: customerSearch, limit: 10 }).then((r) => r.data.data),
    enabled: open && mode === 'existing' && customerSearch.trim().length >= 2,
  });

  const { data: staff } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.listStaff().then((r) => r.data.data.data ?? r.data.data),
    enabled: open,
  });

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPerson((p) => ({ ...p, [key]: e.target.value }));

  async function scanPassport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append('passport', file);
      const d = (await aiApi.extractPassport(fd)).data.data || {};
      setPerson((p) => ({
        ...p,
        firstName: d.firstName || p.firstName,
        lastName: d.lastName || p.lastName,
        passportNumber: d.passportNumber || p.passportNumber,
        dateOfBirth: d.dateOfBirth || p.dateOfBirth,
        nationality: d.nationality || p.nationality,
        passportExpiry: d.expiryDate || p.passportExpiry,
        gender: ['male', 'female'].includes(d.gender) ? d.gender : p.gender,
      }));
      if (d.firstName || d.passportNumber) toast.success('Passport read — check the details before saving');
      else toast.info('Could not read that passport — please type the details');
    } catch {
      toast.info('Scan failed — please type the details');
    } finally {
      setScanning(false);
    }
  }

  const save = useMutation({
    mutationFn: () =>
      seasonsApi.addPilgrim(season._id, {
        ...(mode === 'existing' ? { customerId } : person),
        totalCost: money.totalCost === '' ? undefined : Number(money.totalCost),
        deposit: Number(money.deposit || 0),
        depositMethod: money.depositMethod,
        depositReference: money.depositReference || undefined,
        assignedConsultant: consultant || undefined,
      }),
    onSuccess: () => {
      toast.success('Pilgrim added to season');
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['travel-files'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not add pilgrim'),
  });

  const canSave =
    mode === 'existing' ? !!customerId : !!(person.firstName.trim() && person.lastName.trim() && person.phone.trim());
  const balance = Number(money.totalCost || 0) - Number(money.deposit || 0);
  const consultants = Array.isArray(staff)
    ? staff.filter((u: any) => ['travel_consultant', 'agency_owner', 'branch_manager', 'system_admin'].includes(u.role))
    : [];

  return (
    <Modal open={open} onClose={onClose} title={`Add pilgrim — ${season.name}`} size="lg">
      <form className="space-y-5 p-5" onSubmit={(e) => { e.preventDefault(); if (canSave) save.mutate(); }}>
        <div className="inline-flex rounded-md border border-neutral-200 p-0.5">
          {(['new', 'existing'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded px-3 py-1 text-[13px] transition-colors',
                mode === m ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
              )}
            >
              {m === 'new' ? 'New customer' : 'Existing customer'}
            </button>
          ))}
        </div>

        {mode === 'new' ? (
          <div className="space-y-3">
            {entitlements.ai && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3">
                <p className="text-[13px] text-neutral-600">Scan the passport to fill these in automatically.</p>
                <input ref={scanRef} type="file" accept="image/*,.pdf" className="hidden" onChange={scanPassport} />
                <Button type="button" variant="outline" size="sm" disabled={scanning} onClick={() => scanRef.current?.click()}>
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                  {scanning ? 'Reading…' : 'Scan passport'}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label>First name *</Label><Input value={person.firstName} onChange={set('firstName')} /></div>
              <div><Label>Last name *</Label><Input value={person.lastName} onChange={set('lastName')} /></div>
              <div><Label>Phone *</Label><Input value={person.phone} onChange={set('phone')} placeholder="+234…" /></div>
              <div><Label>Email</Label><Input type="email" value={person.email} onChange={set('email')} placeholder="Optional" /></div>
              <div>
                <Label>Gender</Label>
                <Select value={person.gender} onChange={set('gender')}>
                  <option value="">Not set</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </div>
              <div><Label>Date of birth</Label><Input type="date" value={person.dateOfBirth} onChange={set('dateOfBirth')} /></div>
              <div><Label>Passport number</Label><Input value={person.passportNumber} onChange={set('passportNumber')} className="uppercase" /></div>
              <div><Label>Passport expiry</Label><Input type="date" value={person.passportExpiry} onChange={set('passportExpiry')} /></div>
              <div className="sm:col-span-2"><Label>Nationality</Label><Input value={person.nationality} onChange={set('nationality')} /></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <SearchInput value={customerSearch} onChange={(v) => { setCustomerSearch(v); setCustomerId(''); }} placeholder="Search by name, phone or email…" />
            <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200">
              {customerSearch.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-[13px] text-neutral-400">Type at least 2 letters to search</p>
              ) : searching ? (
                <p className="px-3 py-6 text-center text-[13px] text-neutral-400">Searching…</p>
              ) : !customers?.length ? (
                <p className="px-3 py-6 text-center text-[13px] text-neutral-400">No customers found</p>
              ) : (
                customers.map((c: any) => (
                  <label
                    key={c._id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 border-b border-neutral-100 px-3 py-2 text-[13px] last:border-0 hover:bg-neutral-50',
                      customerId === c._id && 'bg-blue-50'
                    )}
                  >
                    <input type="radio" name="customer" checked={customerId === c._id} onChange={() => setCustomerId(c._id)} />
                    <span className="flex-1 font-medium text-neutral-900">{c.fullName || `${c.firstName} ${c.lastName}`}</span>
                    <span className="text-neutral-500">{c.phone || c.email || ''}</span>
                    {c.passport?.number && <span className="font-mono text-xs text-neutral-400">{c.passport.number}</span>}
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <fieldset className="rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 text-xs font-medium text-neutral-600">Payment</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <Label>Package price (₦)</Label>
              <Input type="number" min="0" value={money.totalCost} onChange={(e) => setMoney((m) => ({ ...m, totalCost: e.target.value }))} />
            </div>
            <div>
              <Label>Deposit now (₦)</Label>
              <Input type="number" min="0" value={money.deposit} onChange={(e) => setMoney((m) => ({ ...m, deposit: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={money.depositMethod} onChange={(e) => setMoney((m) => ({ ...m, depositMethod: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile money</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={money.depositReference} onChange={(e) => setMoney((m) => ({ ...m, depositReference: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          {Number(money.totalCost || 0) > 0 && (
            <p className="mt-3 flex justify-between border-t border-neutral-100 pt-2 text-[13px]">
              <span className="text-neutral-500">Balance after deposit</span>
              <span className={cn('font-medium', balance < 0 ? 'text-red-600' : 'text-neutral-900')}>{formatCurrency(balance)}</span>
            </p>
          )}
        </fieldset>

        <div className="sm:w-1/2">
          <Label>Assigned consultant</Label>
          <Select value={consultant} onChange={(e) => setConsultant(e.target.value)}>
            <option value="">Unassigned</option>
            {consultants.map((u: any) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!canSave} loading={save.isPending}>Add pilgrim</Button>
        </div>
      </form>
    </Modal>
  );
}
