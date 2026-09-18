'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { bookingsApi } from '@/services/api.service';
import { Booking } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { BookingFormModal } from '@/components/features/bookings/BookingFormModal';

const BOOKING_STATUSES = ['', 'draft', 'pending', 'reserved', 'confirmed', 'ticketed', 'cancelled', 'completed'];
const BOOKING_TYPES = ['', 'flight', 'ticket', 'visa', 'hotel', 'transport', 'tour', 'activity', 'package', 'other'];

export default function BookingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { search, status, bookingType, page }],
    queryFn: () =>
      bookingsApi
        .list({ search: search || undefined, status: status || undefined, bookingType: bookingType || undefined, page, limit: 20 })
        .then((r) => r.data),
  });

  const columns: Column<Booking>[] = [
    {
      key: 'bookingNumber',
      header: 'Booking #',
      render: (row) => <span className="font-mono text-sm font-semibold text-blue-600">{row.bookingNumber}</span>,
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        return <span>{c?.fullName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || '—'}</span>;
      },
    },
    {
      key: 'travelFileId',
      header: 'Travel File',
      render: (row) => {
        const tf = row.travelFileId as any;
        return tf?.fileNumber ? (
          <span className="font-mono text-xs text-indigo-600">{tf.fileNumber}</span>
        ) : '—';
      },
    },
    {
      key: 'bookingType',
      header: 'Type',
      render: (row) => <span className="capitalize">{row.bookingType}</span>,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => <span className="text-gray-600 dark:text-gray-400">{row.provider || '—'}</span>,
    },
    {
      key: 'startDate',
      header: 'Travel Date',
      render: (row) => row.startDate ? formatDate(row.startDate) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (row) => formatCurrency(row.cost, row.currency),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="All travel arrangements across every Travel File"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Booking
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by booking #, customer, provider..."
            className="max-w-xs"
          />
          <Select value={bookingType} onChange={(e) => { setBookingType(e.target.value); setPage(1); }} className="w-36">
            {BOOKING_TYPES.map((t) => (
              <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All Types'}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-36">
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          total={data?.pagination?.total}
          page={page}
          limit={20}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/bookings/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No bookings found."
        />
      </Card>

      <BookingFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
