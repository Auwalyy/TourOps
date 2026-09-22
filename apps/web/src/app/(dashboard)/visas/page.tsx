'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, FileDown, X } from 'lucide-react';
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
  const [selected, setSelected] = useState<Record<string, VisaApplication>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['visas', { search, status, paymentStatus, page }],
    queryFn: () =>
      visasApi
        .list({ search, status: status || undefined, paymentStatus: paymentStatus || undefined, page, limit: 20 })
        .then((r) => r.data),
  });

  const selectedIds = Object.keys(selected);

  function toggleSelected(row: VisaApplication) {
    setSelected((s) => {
      const next = { ...s };
      if (next[row._id]) delete next[row._id];
      else next[row._id] = row;
      return next;
    });
  }

  const batchMutation = useMutation({
    mutationFn: () => visasApi.batchPDF(selectedIds).then((r) => r.data),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'visa-batch-list.pdf'; a.click();
      URL.revokeObjectURL(url);
      setSelected({});
    },
    onError: () => toast.error('Failed to generate batch list'),
  });

  const columns: Column<VisaApplication>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-8',
      render: (row) => (
        <input
          type="checkbox"
          checked={!!selected[row._id]}
          onChange={() => toggleSelected(row)}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-300 text-blue-600 focus:ring-blue-600/30"
        />
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.referenceNumber || '—'}</span>,
    },
    {
      key: 'visaNumber',
      header: 'Visa Number',
      render: (row) => <span className="font-mono text-sm text-neutral-700">{row.visaNumber || '—'}</span>,
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
          <p className="text-sm text-neutral-900">{row.fees ? formatCurrency(row.fees) : '—'}</p>
          {!!row.fees && (row.amountPaid || 0) > 0 && (row.amountPaid || 0) < row.fees && (
            <p className="text-xs text-neutral-400">{formatCurrency(row.amountPaid || 0)} paid</p>
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

      {selectedIds.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" loading={batchMutation.isPending} onClick={() => batchMutation.mutate()}>
              <FileDown className="h-3.5 w-3.5" /> Download Batch List (PDF)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-6 py-4">
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
