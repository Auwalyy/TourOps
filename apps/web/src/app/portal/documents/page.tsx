'use client';
import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { documentsApi } from '@/services/api.service';
import { Card, CardContent, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export default function PortalDocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'documents'],
    queryFn: () => documentsApi.list({ limit: 50 }).then((r) => r.data.data),
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
      qc.invalidateQueries({ queryKey: ['portal', 'documents'] });
    },
    onError: () => toast.error('Upload failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Documents</h1>
        <>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = ''; }} />
          <Button onClick={() => fileRef.current?.click()} loading={uploadMutation.isPending}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : !data?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-gray-400">No documents uploaded yet</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((doc: any) => (
            <Card key={doc._id}>
              <CardContent className="flex items-start justify-between py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">{doc.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="blue" className="capitalize">{doc.category}</Badge>
                    {doc.isExpired && <Badge variant="red"><AlertTriangle className="mr-1 h-3 w-3" />Expired</Badge>}
                  </div>
                  {doc.expiryDate && (
                    <p className="mt-1 text-xs text-gray-500">Expires: {formatDate(doc.expiryDate)}</p>
                  )}
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-3 rounded p-1.5 text-gray-400 hover:text-blue-500">
                  <Eye className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
