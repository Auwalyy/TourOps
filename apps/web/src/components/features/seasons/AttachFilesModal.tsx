'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { seasonsApi, travelFilesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/shared/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Season, TravelFile } from '@/types';

/** Files opened before the season existed can be moved into it here. */
export function AttachFilesModal({ open, onClose, season }: { open: boolean; onClose: () => void; season: Season }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (open) { setSearch(''); setPicked([]); }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ['travel-files', 'no-season', season.type, search],
    queryFn: () =>
      travelFilesApi
        .list({ noSeason: 'true', travelType: season.type, search: search || undefined, limit: 50 })
        .then((r) => r.data.data as TravelFile[]),
    enabled: open,
  });

  const move = useMutation({
    mutationFn: () => seasonsApi.attachFiles(season._id, picked),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Files moved');
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['travel-files'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not move the files'),
  });

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const files = (data || []).filter((f) => !['cancelled', 'archived'].includes(f.status));

  return (
    <Modal open={open} onClose={onClose} title="Move existing travel files into this season" size="lg">
      <div className="space-y-3 p-5">
        <p className="text-[13px] text-neutral-500">
          Showing {season.type === 'hajj' ? 'Hajj' : 'Umrah'} files that are not in any season yet.
        </p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, passport or file #…" />
        <div className="max-h-80 overflow-y-auto rounded-md border border-neutral-200">
          {isLoading ? (
            <p className="px-3 py-8 text-center text-[13px] text-neutral-400">Loading…</p>
          ) : !files.length ? (
            <p className="px-3 py-8 text-center text-[13px] text-neutral-400">No unfiled travel files found</p>
          ) : (
            files.map((f) => {
              const c = f.customerId as any;
              return (
                <label key={f._id} className="flex cursor-pointer items-center gap-3 border-b border-neutral-100 px-3 py-2 text-[13px] last:border-0 hover:bg-neutral-50">
                  <input type="checkbox" checked={picked.includes(f._id)} onChange={() => toggle(f._id)} />
                  <span className="w-32 shrink-0 font-mono text-xs text-blue-600">{f.fileNumber}</span>
                  <span className="flex-1 truncate font-medium text-neutral-900">{c?.fullName || `${c?.firstName || ''} ${c?.lastName || ''}`}</span>
                  <span className="hidden text-xs text-neutral-500 sm:inline">{f.departureDate ? formatDate(f.departureDate) : ''}</span>
                  <StatusBadge status={f.status} />
                </label>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-4">
          <span className="text-[13px] text-neutral-500">{picked.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!picked.length} loading={move.isPending} onClick={() => move.mutate()}>Move into season</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
