'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen } from 'lucide-react';
import { travelFilesApi } from '@/services/api.service';
import { TravelFile, TravelFileStatus, TravelType } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { TravelFileFormModal } from '@/components/features/travel-files/TravelFileFormModal';

const TRAVEL_TYPE_LABELS: Record<TravelType, string> = {
  umrah: 'Umrah',
  hajj: 'Hajj',
  study_abroad: 'Study Abroad',
  tourist_visa: 'Tourist Visa',
  business: 'Business',
  medical: 'Medical',
};

const STATUS_SUMMARY_LABELS: Record<string, string> = {
  open: 'Open',
  pending_payment: 'Pending Payment',
  awaiting_documents: 'Awaiting Docs',
  visa_processing: 'Visa Processing',
  ready_for_departure: 'Ready to Depart',
  completed: 'Completed',
};

export default function TravelFilesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [travelType, setTravelType] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['travel-files', { search, status, travelType, page }],
    queryFn: () => travelFilesApi.list({ search, status: status || undefined, travelType: travelType || undefined, page, limit: 20 }).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['travel-files', 'summary'],
    queryFn: () => travelFilesApi.statusSummary().then((r) => r.data.data),
  });

  const summaryMap = Object.fromEntries((summary || []).map((s: any) => [s._id, s.count]));

  const columns: Column<TravelFile>[] = [
    {
      key: 'fileNumber',
      header: 'File #',
      render: (row) => <span className="font-mono text-sm font-semibold text-blue-600">{row.fileNumber}</span>,
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        return <span className="font-medium">{c?.fullName || c?.firstName + ' ' + c?.lastName || '—'}</span>;
      },
    },
    {
      key: 'travelType',
      header: 'Type',
      render: (row) => (
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          {TRAVEL_TYPE_LABELS[row.travelType]}
        </span>
      ),
    },
    { key: 'destination', header: 'Destination', render: (row) => row.destination },
    {
      key: 'assignedConsultant',
      header: 'Consultant',
      render: (row) => {
        const u = row.assignedConsultant as any;
        return u ? <span className="text-sm text-gray-600">{u.firstName} {u.lastName}</span> : <span className="text-gray-400">—</span>;
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => {
        const colors: Record<string, string> = {
          urgent: 'bg-red-100 text-red-700',
          high: 'bg-orange-100 text-orange-700',
          normal: 'bg-gray-100 text-gray-600',
          low: 'bg-green-100 text-green-700',
        };
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[row.priority]}`}>{row.priority}</span>;
      },
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel Files"
        description="Central hub for all customer travel journeys"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Travel File
          </Button>
        }
      />

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(STATUS_SUMMARY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatus(status === key ? '' : key); setPage(1); }}
            className={`rounded-xl border p-4 text-left transition-colors hover:border-blue-300 ${status === key ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'}`}
          >
            <div className="text-2xl font-bold text-blue-600">{summaryMap[key] ?? 0}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search file #, destination..." className="max-w-xs" />
          <Select value={travelType} onChange={(e) => { setTravelType(e.target.value); setPage(1); }} className="w-44">
            <option value="">All Types</option>
            {Object.entries(TRAVEL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_SUMMARY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            <option value="cancelled">Cancelled</option>
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
          onRowClick={(row) => router.push(`/travel-files/${row._id}`)}
          keyExtractor={(row) => row._id}
          emptyMessage="No travel files found."
        />
      </Card>

      <TravelFileFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
