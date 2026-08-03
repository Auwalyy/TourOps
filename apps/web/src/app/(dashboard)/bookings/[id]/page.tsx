'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { BookingStatus } from '@/types';
import { useState } from 'react';

const STATUSES: BookingStatus[] = ['enquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'];

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => bookingsApi.getById(id).then((r) => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: () => bookingsApi.updateStatus(id, newStatus, note || undefined),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['bookings', id] });
      setNewStatus('');
      setNote('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!booking) return <p className="text-gray-500">Booking not found.</p>;

  const customer = booking.customerId as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{booking.referenceNumber}</h1>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <Card>
            <CardHeader><CardTitle>Booking Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Customer" value={customer?.fullName || '—'} />
              <Detail label="Type" value={booking.bookingType} />
              <Detail label="Travel Date" value={booking.travelDate ? formatDate(booking.travelDate) : '—'} />
              <Detail label="Return Date" value={booking.returnDate ? formatDate(booking.returnDate) : '—'} />
              <Detail label="Travelers" value={String(booking.numberOfTravelers)} />
              <Detail label="Total Amount" value={formatCurrency(booking.totalAmount, booking.currency)} />
              {booking.notes && <div className="col-span-2"><Detail label="Notes" value={booking.notes} /></div>}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative border-l border-gray-200 dark:border-gray-700 pl-4 space-y-4">
                {[...booking.statusHistory].reverse().map((h: any, i: number) => (
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

        {/* Update Status */}
        <Card className="h-fit">
          <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Select new status</option>
              {STATUSES.filter((s) => s !== booking.status).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <Button
              className="w-full"
              disabled={!newStatus}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate()}
            >
              Update Status
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{value}</p>
    </div>
  );
}
