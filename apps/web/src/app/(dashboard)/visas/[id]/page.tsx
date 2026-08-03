'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { visasApi, usersApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
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

  const { data: visa, isLoading } = useQuery({
    queryKey: ['visas', id],
    queryFn: () => visasApi.getById(id).then((r) => r.data.data),
  });

  const { data: officers } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.listStaff().then((r) => r.data.data?.data || []),
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
  if (!visa) return <p className="text-gray-500">Visa application not found.</p>;

  const customer = visa.customerId as any;
  const officer = visa.assignedOfficer as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {visa.destinationCountry} — {visa.visaType}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={visa.status} />
            {visa.referenceNumber && <span className="font-mono text-xs text-gray-400">{visa.referenceNumber}</span>}
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
              <Detail label="Fees" value={visa.fees ? formatCurrency(visa.fees) : '—'} />
              <Detail label="Assigned Officer" value={officer?.fullName || 'Unassigned'} />
              {visa.notes && <div className="col-span-2"><Detail label="Notes" value={visa.notes} /></div>}
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
              <ol className="relative border-l border-gray-200 dark:border-gray-700 pl-4 space-y-4">
                {[...visa.statusHistory].reverse().map((h: any, i: number) => (
                  <li key={i} className="ml-2">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-gray-900" />
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-gray-400">{formatDate(h.changedAt)}</span>
                    </div>
                    {h.note && <p className="mt-1 text-xs text-gray-500">{h.note}</p>}
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
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
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
