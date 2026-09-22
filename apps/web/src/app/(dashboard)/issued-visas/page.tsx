'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, FileDown, X, Layers, FileText, Paperclip } from 'lucide-react';
import { issuedVisasApi } from '@/services/api.service';
import { VisaGroup, VisaIssuance } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { IssuanceFormModal } from '@/components/features/issued-visas/IssuanceFormModal';

export default function IssuedVisasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'groups' | 'standalone'>('groups');
  const [search, setSearch] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VisaIssuance | null>(null);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [groupForm, setGroupForm] = useState({
    groupNumber: '', name: '', partnerCompany: '', destination: '', travelDate: '', notes: '',
  });

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['issued-visas', 'groups', search],
    queryFn: () => issuedVisasApi.groups.list({ search: search || undefined, limit: 50 }).then((r) => r.data.data),
    enabled: tab === 'groups',
  });

  const { data: standalone, isLoading: standaloneLoading } = useQuery({
    queryKey: ['issued-visas', 'standalone', search],
    queryFn: () =>
      issuedVisasApi.list({ ungrouped: true, search: search || undefined, limit: 100 }).then((r) => r.data.data),
    enabled: tab === 'standalone',
  });

  const createGroup = useMutation({
    mutationFn: () => issuedVisasApi.groups.create(groupForm),
    onSuccess: (res: any) => {
      toast.success('Group created');
      setShowGroupForm(false);
      setGroupForm({ groupNumber: '', name: '', partnerCompany: '', destination: '', travelDate: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['issued-visas'] });
      router.push(`/issued-visas/${res.data.data._id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create group'),
  });

  const selectedIds = Object.keys(selected);

  const downloadSelected = useMutation({
    mutationFn: () => issuedVisasApi.batchPDF(selectedIds).then((r) => r.data),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'visa-list.pdf'; a.click();
      URL.revokeObjectURL(url);
      setSelected({});
    },
    onError: () => toast.error('Failed to generate the list'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Issued Visas & Tickets"
        description="Store issued documents and print a list with your company letterhead"
        actions={
          tab === 'groups' ? (
            <Button onClick={() => setShowGroupForm(true)}><Plus className="h-3.5 w-3.5" /> New Group</Button>
          ) : (
            <Button onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}>
              <Plus className="h-3.5 w-3.5" /> Add Visa / Ticket
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-1">
          {[
            { id: 'groups' as const, label: 'Groups', icon: Layers },
            { id: 'standalone' as const, label: 'Individual', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSelected({}); }}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-[13px] transition-colors ${
                tab === id
                  ? 'border-blue-600 font-medium text-blue-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={tab === 'groups' ? 'Search group number, name or company...' : 'Search name, passport or number...'}
        className="max-w-sm"
      />

      {/* ── Groups ── */}
      {tab === 'groups' && (
        groupsLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !groups?.length ? (
          <Card className="py-14 text-center">
            <Layers className="mx-auto mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-sm text-neutral-600">No groups yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
              Create a group when another company hands you a booking, then add each visa as it comes through.
            </p>
            <Button className="mt-4" onClick={() => setShowGroupForm(true)}>Create Group</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(groups as VisaGroup[]).map((g) => (
              <Card
                key={g._id}
                className="cursor-pointer p-4 transition-colors hover:border-neutral-300"
                onClick={() => router.push(`/issued-visas/${g._id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-700">{g.groupNumber}</span>
                  <Badge variant={g.status === 'open' ? 'blue' : 'default'}>
                    {g.status === 'open' ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                <p className="mt-2 text-[13px] font-medium text-neutral-900">{g.name}</p>
                {g.partnerCompany && (
                  <p className="mt-0.5 text-xs text-neutral-500">for {g.partnerCompany}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                  <span>{g.entryCount || 0} traveller{g.entryCount === 1 ? '' : 's'}</span>
                  {g.travelDate && <span>{formatDate(g.travelDate)}</span>}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Standalone entries ── */}
      {tab === 'standalone' && (
        <>
          {selectedIds.length > 0 && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50 px-4 py-2.5">
              <span className="text-[13px] font-medium text-blue-800">{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <Button size="sm" loading={downloadSelected.isPending} onClick={() => downloadSelected.mutate()}>
                  <FileDown className="h-3.5 w-3.5" /> Download List (PDF)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </Card>
          )}

          {standaloneLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !standalone?.length ? (
            <Card className="py-14 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
              <p className="text-sm text-neutral-600">Nothing here yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
                Use this for one-off visas or tickets you issue that aren&apos;t part of a group.
              </p>
              <Button className="mt-4" onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}>
                Add Visa / Ticket
              </Button>
            </Card>
          ) : (
            <Card className="p-0">
              <EntryTable
                entries={standalone as VisaIssuance[]}
                selected={selected}
                onToggle={(id) => setSelected((s) => {
                  const next = { ...s };
                  if (next[id]) delete next[id]; else next[id] = true;
                  return next;
                })}
                onEdit={(e) => { setEditingEntry(e); setShowEntryForm(true); }}
              />
            </Card>
          )}
        </>
      )}

      {/* New group */}
      <Modal open={showGroupForm} onClose={() => setShowGroupForm(false)} title="New Visa Group" size="md">
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Group Number</Label>
              <Input
                placeholder="Auto-generated if left blank"
                value={groupForm.groupNumber}
                onChange={(e) => setGroupForm((f) => ({ ...f, groupNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>Travel Date</Label>
              <Input
                type="date"
                value={groupForm.travelDate}
                onChange={(e) => setGroupForm((f) => ({ ...f, travelDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Group / Travel Name *</Label>
            <Input
              placeholder="e.g. Umrah Batch — February 2026"
              value={groupForm.name}
              onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Booked For (company)</Label>
              <Input
                placeholder="e.g. Doma Travel and Tours Ltd"
                value={groupForm.partnerCompany}
                onChange={(e) => setGroupForm((f) => ({ ...f, partnerCompany: e.target.value }))}
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input
                placeholder="Saudi Arabia"
                value={groupForm.destination}
                onChange={(e) => setGroupForm((f) => ({ ...f, destination: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={groupForm.notes}
              onChange={(e) => setGroupForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowGroupForm(false)}>Cancel</Button>
            <Button
              disabled={!groupForm.name.trim()}
              loading={createGroup.isPending}
              onClick={() => createGroup.mutate()}
            >
              Create Group
            </Button>
          </div>
        </div>
      </Modal>

      <IssuanceFormModal
        open={showEntryForm}
        onClose={() => { setShowEntryForm(false); setEditingEntry(null); }}
        entry={editingEntry}
      />
    </div>
  );
}

/** Shared between this page and the group detail page. */
export function EntryTable({
  entries, selected, onToggle, onEdit,
}: {
  entries: VisaIssuance[];
  selected: Record<string, true>;
  onToggle: (id: string) => void;
  onEdit: (entry: VisaIssuance) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
            <th className="w-8 px-4 py-2.5"></th>
            <th className="px-4 py-2.5 text-left">Passport No.</th>
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Number</th>
            <th className="px-4 py-2.5 text-left">Purpose</th>
            <th className="px-4 py-2.5 text-left">Issued</th>
            <th className="px-4 py-2.5 text-left">File</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {entries.map((e) => (
            <tr key={e._id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={!!selected[e._id]}
                  onChange={() => onToggle(e._id)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-300 text-blue-600"
                />
              </td>
              <td className="px-4 py-2.5 font-mono font-medium text-neutral-900">{e.passportNumber}</td>
              <td className="px-4 py-2.5 text-neutral-700">{e.travellerName}</td>
              <td className="px-4 py-2.5 font-mono text-neutral-700">{e.documentNumber || '—'}</td>
              <td className="px-4 py-2.5 text-neutral-600">{e.purpose || '—'}</td>
              <td className="px-4 py-2.5 text-neutral-500">{e.issueDate ? formatDate(e.issueDate) : '—'}</td>
              <td className="px-4 py-2.5">
                {e.fileUrl ? (
                  <a href={e.fileUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Paperclip className="h-3 w-3" /> View
                  </a>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => onEdit(e)} className="text-xs text-neutral-500 hover:text-blue-600">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
