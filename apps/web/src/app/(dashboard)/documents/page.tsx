'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { documentsApi } from '@/services/api.service';
import { Document } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';

const CATEGORIES = ['', 'passport', 'visa', 'ticket', 'hotel', 'insurance', 'financial', 'photo', 'other'];

export default function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { search, category, page }],
    queryFn: () => documentsApi.list({ search, category: category || undefined, page, limit: 20 }).then((r) => r.data),
  });

  const { data: expiring } = useQuery({
    queryKey: ['documents', 'expiring'],
    queryFn: () => documentsApi.getExpiringSoon(30).then((r) => r.data.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('category', 'other');
      return documentsApi.upload(fd);
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['documents'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Delete failed'),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  }

  const columns: Column<Document>[] = [
    {
      key: 'name',
      header: 'Document',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
          <p className="text-xs text-gray-500">{row.fileType} · {(row.fileSize / 1024).toFixed(0)} KB</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <Badge variant="blue" className="capitalize">{row.category}</Badge>,
    },
    {
      key: 'version',
      header: 'Version',
      render: (row) => <span className="text-xs text-gray-500">v{row.version}</span>,
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      render: (row) => row.expiryDate ? (
        <span className={row.isExpired ? 'text-red-600 font-medium' : ''}>
          {row.isExpired && <AlertTriangle className="mr-1 inline h-3 w-3" />}
          {formatDate(row.expiryDate)}
        </span>
      ) : '—',
    },
    {
      key: 'aiValidation',
      header: 'AI Status',
      render: (row) => row.aiValidation?.isValid !== undefined ? (
        <Badge variant={row.aiValidation.isValid ? 'green' : 'red'}>
          {row.aiValidation.isValid ? 'Valid' : 'Issues'}
        </Badge>
      ) : <span className="text-xs text-gray-400">Not checked</span>,
    },
    { key: 'createdAt', header: 'Uploaded', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-gray-400 hover:text-blue-500">
            <Eye className="h-4 w-4" />
          </a>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} className="rounded p-1 text-gray-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage and track all uploaded documents"
        actions={
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <Button onClick={() => fileRef.current?.click()} loading={uploadMutation.isPending}>
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
          </>
        }
      />

      {expiring && expiring.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              {expiring.length} document{expiring.length > 1 ? 's' : ''} expiring within 30 days
            </p>
          </div>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search documents..." className="max-w-xs" />
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-36">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c ? c.charAt(0).toUpperCase() + c.slice(1) : 'All Categories'}</option>
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
          keyExtractor={(row) => row._id}
          emptyMessage="No documents found. Upload your first document."
        />
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete Document"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
