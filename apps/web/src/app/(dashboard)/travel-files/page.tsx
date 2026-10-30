'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Upload } from 'lucide-react';
import { travelFilesApi } from '@/services/api.service';
import { TravelFile, TravelFileStatus, TravelType } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { TravelFileFormModal } from '@/components/features/travel-files/TravelFileFormModal';
import { BulkPassportModal } from '@/components/features/travel-files/BulkPassportModal';
import { DateRangeFilter, DateFilterValue, dateParams } from '@/components/shared/DateRangeFilter';

const TRAVEL_TYPE_LABELS: Record<TravelType, string> = {
  umrah: 'Umrah',
  hajj: 'Hajj',
  study_abroad: 'Study Abroad',
  tourist_visa: 'Tourist Visa',
  business: 'Business',
  medical: 'Medical',
  other: 'Other',
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
  const [showBulk, setShowBulk] = useState(false);
  const [dates, setDates] = useState<DateFilterValue>({});

  const { data, isLoading } = useQuery({
    queryKey: ['travel-files', { search, status, travelType, page, dates }],
    queryFn: () => travelFilesApi.list({ search, status: status || undefined, travelType: travelType || undefined, ...dateParams(dates), page, limit: 20 }).then((r) => r.data),
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
      render: (row) => <span className="whitespace-nowrap font-mono text-xs font-medium text-blue-600">{row.fileNumber}</span>,
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (row) => {
        const c = row.customerId as any;
        const name = c?.fullName || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || '—';
        return (
          <div>
            <p className="font-medium text-neutral-900">{name}</p>
            {c?.phone && <p className="text-xs text-neutral-500">{c.phone}</p>}
          </div>
        );
      },
    },
    {
      key: 'travelType',
      header: 'Type',
      render: (row) => {
        const season = typeof row.seasonId === 'object' ? row.seasonId : null;
        return (
          <div>
            <p className="text-neutral-700">{TRAVEL_TYPE_LABELS[row.travelType]}</p>
            {season && <p className="text-xs text-neutral-500">{season.name}</p>}
          </div>
        );
      },
    },
    { key: 'destination', header: 'Destination', render: (row) => row.destination },
    {
      key: 'assignedConsultant',
      header: 'Consultant',
      render: (row) => {
        const u = row.assignedConsultant as any;
        return u ? <span className="text-sm text-neutral-600">{u.firstName} {u.lastName}</span> : <span className="text-neutral-400">—</span>;
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => {
        const variant: Record<string, string> = { urgent: 'red', high: 'yellow', normal: 'default', low: 'default' };
        return <Badge variant={variant[row.priority]} className="capitalize">{row.priority}</Badge>;
      },
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel Files"
        description="One file per traveller — customer details, bookings, visa, documents and payments in one place"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowBulk(true)}>
              <Upload className="h-3.5 w-3.5" /> Bulk from passports
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> New travel file
            </Button>
          </>
        }
      />

      {/* Status summary — click a tile to filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(STATUS_SUMMARY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatus(status === key ? '' : key); setPage(1); }}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              status === key ? 'border-blue-600 bg-blue-50' : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div className="text-lg font-semibold text-neutral-900">{summaryMap[key] ?? 0}</div>
            <div className={`mt-0.5 text-xs ${status === key ? 'font-medium text-blue-700' : 'text-neutral-500'}`}>{label}</div>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-3 md:flex-row md:flex-wrap md:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search name, phone, passport, file #…"
            className="w-full md:w-72"
          />
          <Select value={travelType} onChange={(e) => { setTravelType(e.target.value); setPage(1); }} className="w-full md:w-40">
            <option value="">All types</option>
            {Object.entries(TRAVEL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full md:w-44">
            <option value="">All statuses</option>
            {Object.entries(STATUS_SUMMARY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            <option value="cancelled">Cancelled</option>
          </Select>
          <DateRangeFilter
            value={dates}
            onChange={(v) => { setDates(v); setPage(1); }}
            fields={[
              { value: 'createdAt', label: 'Date opened' },
              { value: 'departureDate', label: 'Departure date' },
            ]}
          />
          {(search || status || travelType) && (
            <Button
              variant="ghost"
              size="sm"
              className="md:ml-auto"
              onClick={() => { setSearch(''); setStatus(''); setTravelType(''); setPage(1); }}
            >
              Reset filters
            </Button>
          )}
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
      <BulkPassportModal open={showBulk} onClose={() => setShowBulk(false)} />
    </div>
  );
}
