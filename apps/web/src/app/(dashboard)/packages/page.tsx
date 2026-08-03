'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { packagesApi } from '@/services/api.service';
import { TourPackage } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/Input';
import { PackageFormModal } from '@/components/features/packages/PackageFormModal';

export default function PackagesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['packages', { search, status, page }],
    queryFn: () => packagesApi.list({ search, status: status || undefined, page, limit: 20 }).then((r) => r.data),
  });

  const columns: Column<TourPackage>[] = [
    {
      key: 'title',
      header: 'Package',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
          <p className="text-xs text-gray-500">{row.destinations.join(', ')}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => <span className="capitalize">{row.category.replace(/_/g, ' ')}</span> },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => `${row.duration.days}D / ${row.duration.nights}N`,
    },
    {
      key: 'pricing',
      header: 'Price',
      render: (row) => formatCurrency(row.pricing.basePrice, row.pricing.currency),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tour Packages"
        description="Manage your travel packages and itineraries"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Package</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search packages..." className="max-w-xs" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-36">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
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
          onRowClick={(row) => router.push(`/packages/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No packages found."
        />
      </Card>
      <PackageFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
