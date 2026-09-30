'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Layers } from 'lucide-react';
import { issuedVisasApi } from '@/services/api.service';
import { VisaGroup } from '@/types';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';

/** Batches another company hands over — one group number, visas added over days. */
export function IssuedGroupsTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    groupNumber: '', name: '', partnerCompany: '', destination: '', travelDate: '', notes: '',
  });

  const { data: groups, isLoading } = useQuery({
    queryKey: ['issued-visas', 'groups', search],
    queryFn: () => issuedVisasApi.groups.list({ search: search || undefined, limit: 50 }).then((r) => r.data.data),
  });

  const createGroup = useMutation({
    mutationFn: () => issuedVisasApi.groups.create(form),
    onSuccess: (res: any) => {
      toast.success('Group created');
      setShowForm(false);
      setForm({ groupNumber: '', name: '', partnerCompany: '', destination: '', travelDate: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['issued-visas'] });
      router.push(`/issued-visas/${res.data.data._id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create group'),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search group number, name or company..."
          className="max-w-sm"
        />
        <Button onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> New Group</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !groups?.length ? (
        <Card className="py-14 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
          <p className="text-sm text-neutral-600">No groups yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
            Create a group when another company hands you a booking, then add each visa as it comes through.
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>Create Group</Button>
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
              {g.partnerCompany && <p className="mt-0.5 text-xs text-neutral-500">for {g.partnerCompany}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>{g.entryCount || 0} traveller{g.entryCount === 1 ? '' : 's'}</span>
                {g.travelDate && <span>{formatDate(g.travelDate)}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Visa Group" size="md">
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Group Number</Label>
              <Input
                placeholder="Auto-generated if left blank"
                value={form.groupNumber}
                onChange={(e) => setForm((f) => ({ ...f, groupNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>Travel Date</Label>
              <Input
                type="date"
                value={form.travelDate}
                onChange={(e) => setForm((f) => ({ ...f, travelDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Group / Travel Name *</Label>
            <Input
              placeholder="e.g. Umrah Batch — February 2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Booked For (company)</Label>
              <Input
                placeholder="e.g. Doma Travel and Tours Ltd"
                value={form.partnerCompany}
                onChange={(e) => setForm((f) => ({ ...f, partnerCompany: e.target.value }))}
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input
                placeholder="Saudi Arabia"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button disabled={!form.name.trim()} loading={createGroup.isPending} onClick={() => createGroup.mutate()}>
              Create Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
