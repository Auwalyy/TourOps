'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FolderOpen, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { Select, Input } from '@/components/ui/Input';
import { formatDate, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { Booking, BookingStatus, BookingType } from '@/types';

const BOOKING_STATUSES: BookingStatus[] = ['draft', 'pending', 'reserved', 'confirmed', 'ticketed', 'cancelled', 'completed'];

const TYPE_LABEL: Record<BookingType, string> = {
  flight: 'Flight', ticket: 'Ticket', visa: 'Visa', hotel: 'Hotel', transport: 'Transport',
  tour: 'Tour', activity: 'Activity', package: 'Package', other: 'Other',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState<BookingStatus | ''>('');
  const [reason, setReason] = useState('');
  const [pay, setPay] = useState({ amount: '', method: 'cash' });

  const { data: booking, isLoading } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => bookingsApi.getById(id).then((r) => r.data.data as Booking),
  });

  const { data: payments } = useQuery({
    queryKey: ['bookings', id, 'payments'],
    queryFn: () => bookingsApi.listPayments(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: () => bookingsApi.addPayment(id, { amount: Number(pay.amount), method: pay.method }),
    onSuccess: () => {
      toast.success('Payment recorded');
      setPay({ amount: '', method: 'cash' });
      qc.invalidateQueries({ queryKey: ['bookings', id] });
      qc.invalidateQueries({ queryKey: ['bookings', id, 'payments'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const statusMutation = useMutation({
    mutationFn: () => bookingsApi.updateStatus(id, newStatus as string, reason || undefined),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['bookings', id] });
      setNewStatus('');
      setReason('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => bookingsApi.delete(id),
    onSuccess: () => { toast.success('Booking deleted'); router.push('/bookings'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Cannot delete this booking'),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!booking) return <p className="text-gray-500">Booking not found.</p>;

  const customer = booking.customerId as any;
  const travelFile = booking.travelFileId as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">{booking.bookingNumber}</h1>
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-sm font-medium text-indigo-700">
              {TYPE_LABEL[booking.bookingType]} Booking
            </span>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">{booking.title}</p>
        </div>
        {travelFile?.fileNumber && (
          <Button variant="outline" onClick={() => router.push(`/travel-files/${travelFile._id}`)}>
            <FolderOpen className="h-4 w-4" /> View Travel File
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Booking Info */}
          <Card>
            <CardHeader><CardTitle>Booking Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Booking Number" value={booking.bookingNumber} />
              <Detail label="Type" value={TYPE_LABEL[booking.bookingType]} />
              <Detail label="Title" value={booking.title} />
              <Detail label="Provider" value={booking.provider || '—'} />
              <Detail label="Start Date" value={booking.startDate ? formatDate(booking.startDate) : '—'} />
              <Detail label="End Date" value={booking.endDate ? formatDate(booking.endDate) : '—'} />
              <Detail label="Cost" value={formatCurrency(booking.cost, booking.currency)} />
              <Detail label="Status" value={booking.status} />
            </CardContent>
          </Card>

          {/* Customer & Travel File */}
          <Card>
            <CardHeader><CardTitle>Customer & Travel File</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Customer" value={customer?.fullName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || '—'} />
              <Detail label="Phone" value={customer?.phone || '—'} />
              <Detail label="Travel File" value={travelFile?.fileNumber || '—'} />
              <Detail label="Destination" value={travelFile?.destination || '—'} />
              <Detail label="Travel Type" value={travelFile?.travelType?.replace(/_/g, ' ') || '—'} />
              <Detail label="File Status" value={travelFile?.status || '—'} />
            </CardContent>
          </Card>

          {/* Type-specific details */}
          <BookingDetailsCard booking={booking} />

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.statusHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No status changes recorded.</p>
              ) : (
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-4">
                  {[...booking.statusHistory].reverse().map((h, i) => {
                    const user = h.changedBy as any;
                    return (
                      <li key={i} className="ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white dark:ring-gray-900">
                          <Clock className="h-3 w-3 text-blue-600" />
                        </span>
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={h.from} />
                            <span className="text-xs text-gray-400">→</span>
                            <StatusBadge status={h.to} />
                          </div>
                          {h.reason && <p className="text-xs text-gray-500 mt-1">{h.reason}</p>}
                          <p className="mt-1 text-xs text-gray-400">
                            {user?.firstName} {user?.lastName} · {formatRelativeTime(h.changedAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          {booking.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {booking.documents.map((d, i) => {
                    const doc = d.documentId as any;
                    return (
                      <li key={i} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc?.name || doc?.originalName || 'Document'}</p>
                          <p className="text-xs text-gray-500 capitalize">{doc?.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.visibleToCustomer && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Visible to customer</span>
                          )}
                          {doc?.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline">View</a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment — simple paid/unpaid for this booking */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <PaymentStatusBadge item={{ fees: booking.cost, amountPaid: booking.amountPaid }} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(booking.cost, booking.currency)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500">Paid</p>
                  <p className="mt-0.5 text-sm font-bold text-green-600">{formatCurrency(booking.amountPaid || 0, booking.currency)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className={`mt-0.5 text-sm font-bold ${booking.cost - (booking.amountPaid || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.max(0, booking.cost - (booking.amountPaid || 0)), booking.currency)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Input type="number" min="0" placeholder="Amount" value={pay.amount}
                  onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
                <Select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </Select>
                <Button
                  className="w-full"
                  disabled={!pay.amount || Number(pay.amount) <= 0}
                  loading={paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate()}
                >
                  Record Payment
                </Button>
              </div>

              {payments && payments.length > 0 && (
                <ul className="divide-y divide-gray-50 border-t border-gray-100 pt-2 dark:divide-gray-800 dark:border-gray-800">
                  {payments.map((p: any) => (
                    <li key={p._id} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-gray-500">{formatDate(p.paidAt)} · <span className="capitalize">{p.method.replace(/_/g, ' ')}</span></span>
                      <span className={p.status === 'verified' ? 'font-semibold text-green-600' : 'text-yellow-600'}>
                        {formatCurrency(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as BookingStatus)}>
                <option value="">Select new status...</option>
                {BOOKING_STATUSES.filter((s) => s !== booking.status).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </Select>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
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

          {/* Financial */}
          <Card>
            <CardHeader><CardTitle>Financial</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Booking Cost</span>
                <span className="font-semibold">{formatCurrency(booking.cost, booking.currency)}</span>
              </div>
              <p className="text-xs text-gray-400 pt-1">
                Payments are managed in the Invoices & Payments module linked to this Travel File.
              </p>
            </CardContent>
          </Card>

          {/* Danger zone */}
          {['draft', 'cancelled'].includes(booking.status) && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader><CardTitle className="text-red-600">Danger Zone</CardTitle></CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  loading={deleteMutation.isPending}
                  onClick={() => { if (confirm('Delete this booking? This cannot be undone.')) deleteMutation.mutate(); }}
                >
                  Delete Booking
                </Button>
                <p className="mt-2 text-xs text-gray-400">Only draft or cancelled bookings can be deleted.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Type-specific details card ───────────────────────────────────────────────

function BookingDetailsCard({ booking }: { booking: Booking }) {
  const d = booking.details;
  if (!d) return null;

  const rows: [string, string | number | undefined][] = [];

  if (booking.bookingType === 'flight') {
    rows.push(
      ['Airline', d.airline],
      ['From', d.departureLocation], ['To', d.arrivalLocation],
      ['Departure', d.departureDateTime ? formatDate(d.departureDateTime) : undefined],
      ['Arrival', d.arrivalDateTime ? formatDate(d.arrivalDateTime) : undefined],
      ['Ticket Number', d.ticketNumber],
    );
  } else if (booking.bookingType === 'ticket') {
    rows.push(
      ['Airline', d.airline],
      ['From', d.departureLocation], ['To', d.arrivalLocation],
    );
  } else if (booking.bookingType === 'visa') {
    rows.push(
      ['Destination', d.destinationCountry],
      ['Visa Type', d.visaType],
      ['Applicants', d.numberOfApplicants],
      ['Entry Type', d.entryType],
      ['Processing', d.processingType],
    );
  } else if (booking.bookingType === 'hotel') {
    rows.push(
      ['Hotel', d.hotelName], ['City', d.city], ['Address', d.hotelAddress],
      ['Check-in', d.checkInDate ? formatDate(d.checkInDate) : undefined],
      ['Check-out', d.checkOutDate ? formatDate(d.checkOutDate) : undefined],
      ['Room Type', d.roomType], ['Rooms', d.numberOfRooms],
      ['Nights', d.numberOfNights], ['Guests', d.guestCount],
      ['Booking Ref', d.bookingReference],
    );
  } else if (booking.bookingType === 'transport') {
    rows.push(
      ['Vehicle', d.vehicleType], ['Passengers', d.passengerCount],
      ['Pickup', d.pickupLocation], ['Drop-off', d.dropoffLocation],
      ['Pickup Time', d.pickupDateTime ? formatDate(d.pickupDateTime) : undefined],
      ['Driver', d.driverName], ['Driver Phone', d.driverPhone],
      ['Booking Ref', d.bookingReference],
    );
  } else if (booking.bookingType === 'tour' || booking.bookingType === 'activity') {
    rows.push(
      ['Name', d.tourName], ['Location', d.location],
      ['Participants', d.numberOfParticipants],
      ['Booking Ref', d.bookingReference],
    );
  } else {
    rows.push(['Booking Reference', d.bookingReference]);
  }

  const filled = rows.filter(([, v]) => v !== undefined && v !== '' && v !== null);
  if (filled.length === 0) return null;

  const typeLabel: Record<BookingType, string> = {
    flight: 'Flight Details', ticket: 'Ticket Details', visa: 'Visa Details',
    hotel: 'Hotel Details', transport: 'Transport Details',
    tour: 'Tour Details', activity: 'Activity Details', package: 'Package Details', other: 'Details',
  };

  return (
    <Card>
      <CardHeader><CardTitle>{typeLabel[booking.bookingType]}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        {filled.map(([label, value]) => (
          <Detail key={label} label={label} value={String(value)} />
        ))}
      </CardContent>
    </Card>
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
