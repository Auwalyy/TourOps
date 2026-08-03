'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi } from '@/services/api.service';
import { Customer } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { CustomerFormModal } from '@/components/features/customers/CustomerFormModal';
import { ConfirmDialog } from '@/components/ui/Modal';

export default function CustomersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () => customersApi.list({ search, page, limit: 20 }).then((r) => r.data),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => customersApi.archive(id),
    onSuccess: () => {
      toast.success('Customer archived');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setArchiveTarget(null);
    },
    onError: () => toast.error('Failed to archive customer'),
  });

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.fullName} size="sm" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{row.fullName}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'nationality', header: 'Nationality' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setArchiveTarget(row); }}
          className="rounded p-1 text-gray-400 hover:text-red-500"
        >
          <UserX className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Customer</Button>}
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search customers..." className="max-w-xs" />
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          total={data?.pagination?.total}
          page={page}
          limit={20}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/customers/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No customers found. Add your first customer."
        />
      </Card>

      <CustomerFormModal open={showForm} onClose={() => setShowForm(false)} />

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget._id)}
        title="Archive Customer"
        description={`Archive ${archiveTarget?.fullName}? They will no longer appear in active lists.`}
        confirmLabel="Archive"
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
