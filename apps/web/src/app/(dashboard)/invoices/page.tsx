'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Download } from 'lucide-react';
import { invoicesApi } from '@/services/api.service';
import { Invoice } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Select } from '@/components/ui/Input';
import { InvoiceFormModal } from '@/components/features/invoices/InvoiceFormModal';

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, status, page }],
    queryFn: () => invoicesApi.list({ search, status: status || undefined, page, limit: 20 }).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: () => invoicesApi.getFinancialSummary().then((r) => r.data.data),
  });

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.invoiceNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        return <span>{c?.fullName || '—'}</span>;
      },
    },
    { key: 'totalAmount', header: 'Total', render: (row) => formatCurrency(row.totalAmount, row.currency) },
    { key: 'amountPaid', header: 'Paid', render: (row) => formatCurrency(row.amountPaid, row.currency) },
    {
      key: 'outstandingBalance',
      header: 'Outstanding',
      render: (row) => (
        <span className={row.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
          {formatCurrency(row.outstandingBalance, row.currency)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'dueDate', header: 'Due', render: (row) => row.dueDate ? formatDate(row.dueDate) : '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage invoices and track payments"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Invoice</Button>}
      />

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Invoiced" value={formatCurrency(summary.totalInvoiced || 0)} color="text-gray-900 dark:text-gray-100" />
          <SummaryCard label="Total Collected" value={formatCurrency(summary.totalRevenue || 0)} color="text-green-600" />
          <SummaryCard label="Outstanding" value={formatCurrency(summary.totalOutstanding || 0)} color="text-red-600" />
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by invoice #..." className="max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partially_paid">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
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
          onRowClick={(row) => router.push(`/invoices/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No invoices found."
        />
      </Card>

      <InvoiceFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
