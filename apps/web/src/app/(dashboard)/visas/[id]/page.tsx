'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { visasApi, usersApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { VisaStatus } from '@/types';
import { useState } from 'react';

const STATUSES: VisaStatus[] = ['draft', 'documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review', 'approved', 'rejected', 'cancelled'];

export default function VisaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptLocation, setApptLocation] = useState('');
  const [pay, setPay] = useState({ amount: '', method: 'cash', reference: '', note: '' });
  const [editingVisaNumber, setEditingVisaNumber] = useState(false);
  const [visaNumberInput, setVisaNumberInput] = useState('');

  const { data: visa, isLoading } = useQuery({
    queryKey: ['visas', id],
    queryFn: () => visasApi.getById(id).then((r) => r.data.data),
  });

  const { data: officers } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.listStaff().then((r) => r.data.data?.data || []),
  });

  const { data: payments } = useQuery({
    queryKey: ['visas', id, 'payments'],
    queryFn: () => visasApi.listPayments(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: () => visasApi.addPayment(id, {
      amount: Number(pay.amount),
      method: pay.method,
      reference: pay.reference || undefined,
      note: pay.note || undefined,
    }),
    onSuccess: () => {
      toast.success('Payment recorded');
      setPay({ amount: '', method: 'cash', reference: '', note: '' });
      qc.invalidateQueries({ queryKey: ['visas', id] });
      qc.invalidateQueries({ queryKey: ['visas', id, 'payments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record payment'),
  });

  const visaNumberMutation = useMutation({
    mutationFn: () => visasApi.update(id, { visaNumber: visaNumberInput.trim() || undefined }),
    onSuccess: () => {
      toast.success('Visa number saved');
      setEditingVisaNumber(false);
      qc.invalidateQueries({ queryKey: ['visas', id] });
    },
    onError: () => toast.error('Failed to save visa number'),
  });

  const statusMutation = useMutation({
    mutationFn: () => visasApi.updateStatus(id, newStatus, note || undefined),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['visas', id] });
      setNewStatus(''); setNote('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const assignMutation = useMutation({
    mutationFn: (officerId: string) => visasApi.assignOfficer(id, officerId),
    onSuccess: () => { toast.success('Officer assigned'); qc.invalidateQueries({ queryKey: ['visas', id] }); },
    onError: () => toast.error('Failed to assign officer'),
  });

  const appointmentMutation = useMutation({
    mutationFn: () => visasApi.scheduleAppointment(id, { date: apptDate, location: apptLocation }),
    onSuccess: () => {
      toast.success('Appointment scheduled');
      qc.invalidateQueries({ queryKey: ['visas', id] });
      setApptDate(''); setApptLocation('');
    },
    onError: () => toast.error('Failed to schedule appointment'),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!visa) return <p className="text-neutral-500">Visa application not found.</p>;

  const customer = visa.customerId as any;
  const officer = visa.assignedOfficer as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">
            {visa.destinationCountry} — {visa.visaType}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusBadge status={visa.status} />
            <PaymentStatusBadge item={visa} />
            {visa.referenceNumber && <span className="font-mono text-xs text-neutral-400">{visa.referenceNumber}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Application Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Customer" value={customer?.fullName || '—'} />
              <Detail label="Purpose" value={visa.purposeOfTravel} />
              <Detail label="Travel Date" value={visa.travelDate ? formatDate(visa.travelDate) : '—'} />
              <Detail label="Return Date" value={visa.returnDate ? formatDate(visa.returnDate) : '—'} />
              <Detail label="Due Date" value={visa.dueDate ? formatDate(visa.dueDate) : '—'} />
              <Detail label="Assigned Officer" value={officer?.fullName || 'Unassigned'} />
              <div className="col-span-2 border-t border-neutral-100 pt-3">
                <p className="mb-1 text-xs text-neutral-500">Visa Number (issued by embassy)</p>
                {editingVisaNumber ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. 6174141815"
                      value={visaNumberInput}
                      onChange={(e) => setVisaNumberInput(e.target.value)}
                      className="max-w-[220px]"
                    />
                    <Button size="sm" loading={visaNumberMutation.isPending} onClick={() => visaNumberMutation.mutate()}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingVisaNumber(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      {visa.visaNumber || '—'}
                    </span>
                    <button
                      onClick={() => { setVisaNumberInput(visa.visaNumber || ''); setEditingVisaNumber(true); }}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {visa.visaNumber ? 'Edit' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
              {visa.notes && <div className="col-span-2"><Detail label="Notes" value={visa.notes} /></div>}
            </CardContent>
          </Card>

          {/* Visa fee — is this paid or not */}
          <Card>
            <CardHeader>
              <CardTitle>Visa Fee</CardTitle>
              <PaymentStatusBadge item={visa} />
            </CardHeader>
            <CardContent className="space-y-4">
              {visa.billedVia && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                  Billed via booking{' '}
                  <button
                    onClick={() => router.push(`/bookings/${visa.billedVia._id}`)}
                    className="font-mono font-semibold underline"
                  >
                    {visa.billedVia.bookingNumber}
                  </button>{' '}
                  ({formatCurrency(visa.billedVia.cost, visa.billedVia.currency)}). Record payment there, not here, so
                  the charge stays in one place.
                </div>
              )}
              {!visa.fees ? (
                <p className="text-sm text-neutral-400">
                  No fee set for this application. Add one via Edit so it can be tracked and chased.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Fee', value: formatCurrency(visa.fees), color: 'text-neutral-900' },
                      { label: 'Paid', value: formatCurrency(visa.amountPaid || 0), color: 'text-green-600' },
                      {
                        label: 'Balance',
                        value: formatCurrency(Math.max(0, visa.fees - (visa.amountPaid || 0))),
                        color: visa.fees - (visa.amountPaid || 0) > 0 ? 'text-red-600' : 'text-green-600',
                      },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-neutral-50 p-3 text-center">
                        <p className="text-xs text-neutral-500">{s.label}</p>
                        <p className={`mt-0.5 text-base font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(100, Math.round(((visa.amountPaid || 0) / visa.fees) * 100))}%` }}
                    />
                  </div>
                </>
              )}

              {/* Record a payment against the fee */}
              <div className="border-t border-neutral-100 pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" min="0" placeholder="0" value={pay.amount}
                      onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Reference</Label>
                    <Input placeholder="optional" value={pay.reference}
                      onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Input placeholder="optional" value={pay.note}
                      onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>
                <Button
                  className="mt-3"
                  disabled={!pay.amount || Number(pay.amount) <= 0}
                  loading={paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate()}
                >
                  <Wallet className="h-4 w-4" /> Record Payment
                </Button>
              </div>

              {/* Payment history */}
              {payments && payments.length > 0 && (
                <ul className="divide-y divide-neutral-50 border-t border-neutral-100 pt-2">
                  {payments.map((p: any) => (
                    <li key={p._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm capitalize text-neutral-700">
                            {p.method.replace(/_/g, ' ')}
                          </span>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-neutral-400">
                          {formatDate(p.paidAt)}{p.reference && ` · Ref: ${p.reference}`}{p.notes && ` · ${p.notes}`}
                        </p>
                      </div>
                      <span className={`shrink-0 font-semibold ${
                        p.status === 'verified' ? 'text-green-600' : p.status === 'rejected' ? 'text-neutral-400 line-through' : 'text-yellow-600'
                      }`}>
                        +{formatCurrency(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {visa.appointment?.date && (
            <Card>
              <CardHeader><CardTitle>Appointment</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Date" value={formatDate(visa.appointment.date)} />
                <Detail label="Time" value={visa.appointment.time || '—'} />
                <Detail label="Location" value={visa.appointment.location || '—'} />
                <Detail label="Confirmation #" value={visa.appointment.confirmationNumber || '—'} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative border-l border-neutral-200 pl-4 space-y-4">
                {[...visa.statusHistory].reverse().map((h: any, i: number) => (
                  <li key={i} className="ml-2">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-neutral-400">{formatDate(h.changedAt)}</span>
                    </div>
                    {h.note && <p className="mt-1 text-xs text-neutral-500">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Select status</option>
                {STATUSES.filter((s) => s !== visa.status).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </Select>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <Button className="w-full" disabled={!newStatus} loading={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
                Update
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assign Officer</CardTitle></CardHeader>
            <CardContent>
              <Select onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)} defaultValue="">
                <option value="">Select officer</option>
                {(officers || []).filter((u: any) => ['visa_officer', 'travel_consultant', 'agency_owner'].includes(u.role)).map((u: any) => (
                  <option key={u._id} value={u._id}>{u.fullName}</option>
                ))}
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Schedule Appointment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Date</Label>
                <Input type="datetime-local" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
              </div>
              <div>
                <Label>Location</Label>
                <Input placeholder="Embassy address" value={apptLocation} onChange={(e) => setApptLocation(e.target.value)} />
              </div>
              <Button className="w-full" disabled={!apptDate || !apptLocation} loading={appointmentMutation.isPending} onClick={() => appointmentMutation.mutate()}>
                Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-medium text-neutral-900">{value}</p>
    </div>
  );
}
