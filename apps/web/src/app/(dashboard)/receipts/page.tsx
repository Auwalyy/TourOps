'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Download } from 'lucide-react';
import { receiptsApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReceiptFormModal } from '@/components/features/receipts/ReceiptFormModal';
import { toast } from 'sonner';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', card: 'Card',
  mobile_money: 'Mobile Money', other: 'Other',
};

export default function ReceiptsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', { search, page }],
    queryFn: () => receiptsApi.list({ search: search || undefined, page, limit: 20 }).then((r) => r.data),
  });

  async function handleDownload(id: string, receiptNumber: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await receiptsApi.downloadPDF(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${receiptNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download receipt'); }
  }

  const columns: Column<any>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      render: (row) => <span className="font-mono text-sm font-bold text-blue-600">{row.receiptNumber}</span>,
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        return <span className="font-medium text-gray-900 dark:text-gray-100">{c?.fullName || `${c?.firstName} ${c?.lastName}`}</span>;
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{row.description}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => <span className="capitalize text-sm">{METHOD_LABELS[row.method] || row.method}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-bold text-emerald-600">{formatCurrency(row.amount, row.currency)}</span>
      ),
    },
    { key: 'paidAt', header: 'Date', render: (row) => formatDate(row.paidAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => handleDownload(row._id, row.receiptNumber, e)}
          title="Download PDF"
        >
          <Download className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Issue and manage payment receipts"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Receipt</Button>}
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by receipt number..."
            className="max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          total={data?.pagination?.total}
          page={page}
          limit={20}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/receipts/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No receipts yet. Create your first receipt."
        />
      </Card>

      <ReceiptFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
