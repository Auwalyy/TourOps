'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, FileDown, X, FileText } from 'lucide-react';
import { issuedVisasApi } from '@/services/api.service';
import { VisaIssuance } from '@/types';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card, Skeleton } from '@/components/ui/Card';
import { IssuanceFormModal } from '@/components/features/issued-visas/IssuanceFormModal';
import { EntryTable } from '@/components/features/issued-visas/EntryTable';

/** One-off visas and tickets issued outside any group. */
export function IssuedIndividualTab() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VisaIssuance | null>(null);
  const [selected, setSelected] = useState<Record<string, true>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['issued-visas', 'standalone', search],
    queryFn: () =>
      issuedVisasApi.list({ ungrouped: true, search: search || undefined, limit: 100 }).then((r) => r.data.data),
  });

  const selectedIds = Object.keys(selected);

  const download = useMutation({
    mutationFn: () => issuedVisasApi.batchPDF(selectedIds).then((r) => r.data),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visa-list.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setSelected({});
    },
    onError: () => toast.error('Failed to generate the list'),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, passport or number..."
          className="max-w-sm"
        />
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Visa / Ticket
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-[13px] font-medium text-blue-800">{selectedIds.length} selected</span>
          <div className="flex gap-2">
            <Button size="sm" loading={download.isPending} onClick={() => download.mutate()}>
              <FileDown className="h-3.5 w-3.5" /> Download List (PDF)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data?.length ? (
        <Card className="py-14 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
          <p className="text-sm text-neutral-600">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
            Use this for one-off visas or tickets you issue that aren&apos;t part of a group.
          </p>
          <Button className="mt-4" onClick={() => { setEditing(null); setShowForm(true); }}>
            Add Visa / Ticket
          </Button>
        </Card>
      ) : (
        <Card className="p-0">
          <EntryTable
            entries={data as VisaIssuance[]}
            selected={selected}
            onToggle={(id) => setSelected((s) => {
              const next = { ...s };
              if (next[id]) delete next[id]; else next[id] = true;
              return next;
            })}
            onEdit={(e) => { setEditing(e); setShowForm(true); }}
          />
        </Card>
      )}

      <IssuanceFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        entry={editing}
      />
    </div>
  );
}
