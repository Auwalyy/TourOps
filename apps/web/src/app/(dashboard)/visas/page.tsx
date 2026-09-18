'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { visasApi } from '@/services/api.service';
import { VisaApplication } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Select } from '@/components/ui/Input';
import { VisaFormModal } from '@/components/features/visas/VisaFormModal';

const STATUS_OPTIONS = ['', 'draft', 'documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review', 'approved', 'rejected', 'cancelled'];

export default function VisasPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['visas', { search, status, paymentStatus, page }],
    queryFn: () =>
      visasApi
        .list({ search, status: status || undefined, paymentStatus: paymentStatus || undefined, page, limit: 20 })
        .then((r) => r.data),
  });

  const columns: Column<VisaApplication>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.referenceNumber || '—'}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        return <span>{c?.fullName || '—'}</span>;
      },
    },
    { key: 'destinationCountry', header: 'Destination' },
    { key: 'visaType', header: 'Visa Type' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'fees',
      header: 'Fee',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{row.fees ? formatCurrency(row.fees) : '—'}</p>
          {!!row.fees && (row.amountPaid || 0) > 0 && (row.amountPaid || 0) < row.fees && (
            <p className="text-xs text-gray-400">{formatCurrency(row.amountPaid || 0)} paid</p>
          )}
        </div>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (row) => <PaymentStatusBadge item={row} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) => row.dueDate ? formatDate(row.dueDate) : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visa Applications"
        description="Track and manage all visa applications"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Application</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by reference..." className="max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-48">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Statuses'}</option>
            ))}
          </Select>
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="w-44">
            <option value="">All Payments</option>
            <option value="outstanding">Owing money</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Part-paid</option>
            <option value="paid">Paid</option>
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
          onRowClick={(row) => router.push(`/visas/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No visa applications found."
        />
      </Card>

      <VisaFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
