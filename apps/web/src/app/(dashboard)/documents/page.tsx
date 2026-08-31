'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, AlertTriangle, Download, FolderOpen, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { documentsApi } from '@/services/api.service';
import { Document } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatDate } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const FOLDERS = [
  { key: '', label: 'All Documents', color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-gray-200' },
  { key: 'visa', label: 'Visa', color: 'text-purple-700', bg: 'bg-purple-50', activeBg: 'bg-purple-100' },
  { key: 'ticket', label: 'Tickets', color: 'text-blue-700', bg: 'bg-blue-50', activeBg: 'bg-blue-100' },
  { key: 'passport', label: 'Passports', color: 'text-green-700', bg: 'bg-green-50', activeBg: 'bg-green-100' },
  { key: 'hotel', label: 'Hotels', color: 'text-orange-700', bg: 'bg-orange-50', activeBg: 'bg-orange-100' },
  { key: 'insurance', label: 'Insurance', color: 'text-teal-700', bg: 'bg-teal-50', activeBg: 'bg-teal-100' },
  { key: 'financial', label: 'Financial', color: 'text-yellow-700', bg: 'bg-yellow-50', activeBg: 'bg-yellow-100' },
  { key: 'photo', label: 'Photos', color: 'text-pink-700', bg: 'bg-pink-50', activeBg: 'bg-pink-100' },
  { key: 'other', label: 'General', color: 'text-gray-700', bg: 'bg-gray-50', activeBg: 'bg-gray-100' },
];

const CATEGORY_BADGE: Record<string, string> = {
  visa: 'purple', ticket: 'blue', passport: 'green', hotel: 'orange',
  insurance: 'default', financial: 'yellow', photo: 'red', other: 'default',
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeFolder, setActiveFolder] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { search, category: activeFolder, page }],
    queryFn: () =>
      documentsApi.list({ search, category: activeFolder || undefined, page, limit: 20 }).then((r) => r.data),
  });

  // Count per folder
  const { data: allCounts } = useQuery({
    queryKey: ['documents', 'counts'],
    queryFn: () => documentsApi.list({ limit: 1000 }).then((r) => r.data.data as Document[]),
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
      fd.append('category', activeFolder || 'other');
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

  function handleFolderClick(key: string) {
    setActiveFolder(key);
    setPage(1);
    setSearch('');
  }

  function countForFolder(key: string) {
    if (!allCounts) return 0;
    if (!key) return allCounts.length;
    return allCounts.filter((d) => d.category === key).length;
  }

  const activeFolderLabel = FOLDERS.find((f) => f.key === activeFolder)?.label || 'All Documents';

  const columns: Column<Document>[] = [
    {
      key: 'name',
      header: 'Document',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
          <p className="text-xs text-gray-500">{row.fileType?.split('/')[1] || row.fileType} · {(row.fileSize / 1024).toFixed(0)} KB</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Folder',
      render: (row) => (
        <Badge variant={CATEGORY_BADGE[row.category] || 'default'} className="capitalize">
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      render: (row) => row.expiryDate ? (
        <span className={row.isExpired ? 'text-red-600 font-medium text-sm' : 'text-sm'}>
          {row.isExpired && <AlertTriangle className="mr-1 inline h-3 w-3" />}
          {formatDate(row.expiryDate)}
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    { key: 'createdAt', header: 'Uploaded', render: (row) => <span className="text-sm">{formatDate(row.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <a
            href={row.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-gray-700"
          >
            <Download className="h-3.5 w-3.5" /> View
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
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
        description="Manage all documents organised by folder"
        actions={
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <Button onClick={() => fileRef.current?.click()} loading={uploadMutation.isPending}>
              <Upload className="h-4 w-4" />
              Upload to {activeFolderLabel}
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

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          {FOLDERS.map((folder) => {
            const isActive = activeFolder === folder.key;
            const count = countForFolder(folder.key);
            return (
              <button
                key={folder.key}
                onClick={() => handleFolderClick(folder.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? `${folder.activeBg} ${folder.color}`
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                {isActive
                  ? <FolderOpen className="h-4 w-4 shrink-0" />
                  : <Folder className="h-4 w-4 shrink-0" />
                }
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    isActive ? 'bg-white/60' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Document list */}
        <div className="flex-1 min-w-0">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder={`Search in ${activeFolderLabel}...`}
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
              keyExtractor={(row) => row._id}
              emptyMessage={`No documents in ${activeFolderLabel}. Upload one using the button above.`}
            />
          </Card>
        </div>
      </div>

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
