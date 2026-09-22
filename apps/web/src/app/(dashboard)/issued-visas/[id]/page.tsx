'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, FileDown, Pencil, Trash2, X } from 'lucide-react';
import { issuedVisasApi } from '@/services/api.service';
import { VisaIssuance } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { IssuanceFormModal } from '@/components/features/issued-visas/IssuanceFormModal';
import { EntryTable } from '../page';

export default function VisaGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VisaIssuance | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [edit, setEdit] = useState({
    name: '', partnerCompany: '', destination: '', travelDate: '', notes: '', status: 'open',
  });

  const { data: group, isLoading } = useQuery({
    queryKey: ['issued-visas', 'group', id],
    queryFn: () => issuedVisasApi.groups.getById(id).then((r) => r.data.data),
  });

  const selectedIds = Object.keys(selected);

  const download = useMutation({
    mutationFn: () => issuedVisasApi.groups.downloadPDF(id, selectedIds.length ? selectedIds : undefined).then((r) => r.data),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${group?.groupNumber || 'visa-group'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to generate the list'),
  });

  const updateGroup = useMutation({
    mutationFn: () => issuedVisasApi.groups.update(id, edit),
    onSuccess: () => {
      toast.success('Group updated');
      setShowEdit(false);
      qc.invalidateQueries({ queryKey: ['issued-visas'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteGroup = useMutation({
    mutationFn: () => issuedVisasApi.groups.delete(id),
    onSuccess: () => { toast.success('Group deleted'); router.push('/issued-visas'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!group) return <p className="text-neutral-500">Group not found.</p>;

  const entries: VisaIssuance[] = group.entries || [];

  function openEdit() {
    setEdit({
      name: group.name || '',
      partnerCompany: group.partnerCompany || '',
      destination: group.destination || '',
      travelDate: group.travelDate ? group.travelDate.slice(0, 10) : '',
      notes: group.notes || '',
      status: group.status || 'open',
    });
    setShowEdit(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/issued-visas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-700">{group.groupNumber}</span>
            <Badge variant={group.status === 'open' ? 'blue' : 'default'}>
              {group.status === 'open' ? 'Open' : 'Closed'}
            </Badge>
          </div>
          <h1 className="mt-1 text-lg font-semibold text-neutral-900">{group.name}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {[
              group.partnerCompany && `For ${group.partnerCompany}`,
              group.destination,
              group.travelDate && `Travelling ${formatDate(group.travelDate)}`,
              `${entries.length} traveller${entries.length === 1 ? '' : 's'}`,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          <Button variant="outline" loading={download.isPending} onClick={() => download.mutate()}>
            <FileDown className="h-3.5 w-3.5" />
            {selectedIds.length ? `Download ${selectedIds.length} Selected` : 'Download List'}
          </Button>
          <Button onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}>
            <Plus className="h-3.5 w-3.5" /> Add Visa / Ticket
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <Card className="flex items-center justify-between gap-3 border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-[13px] text-blue-800">
            {selectedIds.length} selected — the download will include only these
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </Card>
      )}

      {/* Entries */}
      {!entries.length ? (
        <Card className="py-14 text-center">
          <p className="text-sm text-neutral-600">No visas added to this group yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
            Add them as they come through — you can keep adding to this group over several days.
          </p>
          <Button className="mt-4" onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}>
            Add First Entry
          </Button>
        </Card>
      ) : (
        <Card className="p-0">
          <EntryTable
            entries={entries}
            selected={selected}
            onToggle={(entryId) => setSelected((s) => {
              const next = { ...s };
              if (next[entryId]) delete next[entryId]; else next[entryId] = true;
              return next;
            })}
            onEdit={(e) => { setEditingEntry(e); setShowEntryForm(true); }}
          />
        </Card>
      )}

      {group.notes && (
        <Card className="p-4">
          <p className="mb-1 text-xs font-medium text-neutral-500">Notes</p>
          <p className="text-[13px] text-neutral-700">{group.notes}</p>
        </Card>
      )}

      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="text-red-600 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" /> Delete group
        </Button>
      </div>

      {/* Add / edit entry */}
      <IssuanceFormModal
        open={showEntryForm}
        onClose={() => { setShowEntryForm(false); setEditingEntry(null); }}
        groupId={id}
        entry={editingEntry}
        onSaved={() => qc.invalidateQueries({ queryKey: ['issued-visas', 'group', id] })}
      />

      {/* Edit group */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Group" size="md">
        <div className="space-y-4 p-5">
          <div>
            <Label>Group / Travel Name *</Label>
            <Input value={edit.name} onChange={(e) => setEdit((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Booked For (company)</Label>
              <Input value={edit.partnerCompany} onChange={(e) => setEdit((f) => ({ ...f, partnerCompany: e.target.value }))} />
            </div>
            <div>
              <Label>Destination</Label>
              <Input value={edit.destination} onChange={(e) => setEdit((f) => ({ ...f, destination: e.target.value }))} />
            </div>
            <div>
              <Label>Travel Date</Label>
              <Input type="date" value={edit.travelDate} onChange={(e) => setEdit((f) => ({ ...f, travelDate: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={edit.status} onChange={(e) => setEdit((f) => ({ ...f, status: e.target.value }))}>
                <option value="open">Open — still adding</option>
                <option value="closed">Closed — complete</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={edit.notes} onChange={(e) => setEdit((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button disabled={!edit.name.trim()} loading={updateGroup.isPending} onClick={() => updateGroup.mutate()}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteGroup.mutate()}
        title="Delete Group"
        description={`Delete ${group.groupNumber}? Any entries must be removed first. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteGroup.isPending}
      />
    </div>
  );
}
