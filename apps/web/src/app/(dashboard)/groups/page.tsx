'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { groupsApi, customersApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';

export default function GroupsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', primaryContactCustomerId: '', departureGroup: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list({ limit: 50 }).then((r) => r.data.data),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customersApi.list({ limit: 200 }).then((r) => r.data.data),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: () => groupsApi.create(form),
    onSuccess: () => {
      toast.success('Group created');
      setShowForm(false);
      setForm({ name: '', primaryContactCustomerId: '', departureGroup: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create group'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family & Group Bookings"
        description="Travellers booked together under one payer, with a shared ledger"
        actions={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Group</Button>}
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No groups yet</p>
            <p className="mt-1 text-xs text-neutral-400">
              Group a family or a departure batch so one payment can cover everyone.
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>Create First Group</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((g: any) => {
            const balance = (g.totalCost || 0) - (g.amountPaid || 0);
            const pct = g.totalCost > 0 ? Math.min(100, Math.round((g.amountPaid / g.totalCost) * 100)) : 0;
            const contact = g.primaryContactCustomerId;
            return (
              <Card
                key={g._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/groups/${g._id}`)}
              >
                <CardContent className="space-y-3 py-5">
                  <div>
                    <p className="font-semibold text-neutral-900">{g.name}</p>
                    <p className="text-xs text-neutral-500">
                      {contact?.fullName || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim()} pays ·{' '}
                      {g.memberCount} traveller{g.memberCount === 1 ? '' : 's'}
                    </p>
                    {g.departureGroup && <p className="text-xs text-neutral-400">{g.departureGroup}</p>}
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100">
                    <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Paid {formatCurrency(g.amountPaid || 0)}</span>
                    <span className={balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-600'}>
                      {balance > 0 ? `${formatCurrency(balance)} left` : 'Fully paid'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Family / Group Booking" size="md">
        <div className="space-y-4 p-6">
          <div>
            <Label>Group Name *</Label>
            <Input
              placeholder="e.g. Bello Family — Umrah Feb 2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>Who pays for the group? *</Label>
            <Select
              value={form.primaryContactCustomerId}
              onChange={(e) => setForm((f) => ({ ...f, primaryContactCustomerId: e.target.value }))}
            >
              <option value="">Select customer...</option>
              {(customers as any[])?.map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.fullName || `${c.firstName} ${c.lastName}`} {c.phone ? `· ${c.phone}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Departure Group</Label>
            <Input
              placeholder="e.g. Gwale LGA — Batch 2"
              value={form.departureGroup}
              onChange={(e) => setForm((f) => ({ ...f, departureGroup: e.target.value }))}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Anything the team should know about this group"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <p className="text-xs text-neutral-400">
            After creating the group, add each traveller&apos;s travel file to it — every member keeps their own
            documents and visa status.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              disabled={!form.name.trim() || !form.primaryContactCustomerId}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
