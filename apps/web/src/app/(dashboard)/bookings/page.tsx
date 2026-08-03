'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi } from '@/services/api.service';
import { Booking } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { BookingFormModal } from '@/components/features/bookings/BookingFormModal';
import { Select } from '@/components/ui/Input';

const STATUS_OPTIONS = ['', 'enquiry', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'];

export default function BookingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { search, status, page }],
    queryFn: () => bookingsApi.list({ search, status: status || undefined, page, limit: 20 }).then((r) => r.data),
  });

  const columns: Column<Booking>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.referenceNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        return <span>{c?.fullName || c?.firstName || '—'}</span>;
      },
    },
    { key: 'bookingType', header: 'Type', render: (row) => <span className="capitalize">{row.bookingType}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (row) => formatCurrency(row.totalAmount, row.currency),
    },
    {
      key: 'travelDate',
      header: 'Travel Date',
      render: (row) => row.travelDate ? formatDate(row.travelDate) : '—',
    },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Manage all bookings and their pipeline"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Booking</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by reference..." className="max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Statuses'}</option>
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
