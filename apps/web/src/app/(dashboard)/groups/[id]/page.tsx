'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Users, Wallet, Plus, X } from 'lucide-react';
import { groupsApi, travelFilesApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showPay, setShowPay] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addFileId, setAddFileId] = useState('');
  const [pay, setPay] = useState({ amount: '', method: 'bank_transfer', reference: '' });
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['groups', id, 'ledger'],
    queryFn: () => groupsApi.ledger(id).then((r) => r.data.data),
  });

  const { data: unassignedFiles } = useQuery({
    queryKey: ['travel-files', 'unassigned'],
    queryFn: () => travelFilesApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: showAdd,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['groups'] });
    qc.invalidateQueries({ queryKey: ['travel-files'] });
  }

  const addMutation = useMutation({
    mutationFn: () => groupsApi.addMember(id, addFileId),
    onSuccess: () => { toast.success('Traveller added to group'); setShowAdd(false); setAddFileId(''); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) => groupsApi.removeMember(id, fileId),
    onSuccess: () => { toast.success('Traveller removed from group'); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to remove member'),
  });

  const payMutation = useMutation({
    mutationFn: () =>
      groupsApi.recordPayment(id, {
        amount: Number(pay.amount),
        method: pay.method,
        reference: pay.reference || undefined,
        autoVerify: true,
        allocations: Object.entries(allocations)
          .filter(([, amt]) => Number(amt) > 0)
          .map(([travelFileId, amt]) => ({ travelFileId, amount: Number(amt) })),
      }),
    onSuccess: () => {
      toast.success('Group payment recorded');
      setShowPay(false);
      setPay({ amount: '', method: 'bank_transfer', reference: '' });
      setAllocations({});
      refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record payment'),
  });

  const members = data?.members || [];
  const totals = data?.totals;

  /** Spread the entered amount across whoever still owes, largest balance first. */
  function autoSplit() {
    const amount = Number(pay.amount);
    if (!amount) return;
    const owing = members
      .map((m: any) => ({ id: m._id, balance: Math.max(0, (m.totalCost || 0) - (m.amountPaid || 0)) }))
      .filter((m: any) => m.balance > 0)
      .sort((a: any, b: any) => b.balance - a.balance);

    let left = amount;
    const next: Record<string, string> = {};
    for (const m of owing) {
      if (left <= 0) break;
      const give = Math.min(left, m.balance);
      next[m.id] = String(give);
      left -= give;
    }
    // Anything left over after everyone's covered goes on the first member.
    if (left > 0 && owing.length) next[owing[0].id] = String(Number(next[owing[0].id] || 0) + left);
    setAllocations(next);
  }

  useEffect(() => { if (showPay) setAllocations({}); }, [showPay]);

  const allocatedTotal = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);
  const allocationMatches = Number(pay.amount) > 0 && allocatedTotal === Number(pay.amount);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-neutral-500">Group not found.</p>;

  const group = data.group;
  const contact = group.primaryContactCustomerId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{group.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {contact?.fullName || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim()} pays
            {contact?.phone && ` · ${contact.phone}`}
            {group.departureGroup && ` · ${group.departureGroup}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Traveller</Button>
          <Button onClick={() => setShowPay(true)}><Wallet className="h-4 w-4" /> Record Group Payment</Button>
        </div>
      </div>

      {/* Shared ledger totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Travellers', value: String(totals?.memberCount ?? 0), color: 'text-neutral-900 dark:text-neutral-100' },
          { label: 'Group Total', value: formatCurrency(totals?.totalCost ?? 0), color: 'text-neutral-900 dark:text-neutral-100' },
          { label: 'Paid', value: formatCurrency(totals?.totalPaid ?? 0), color: 'text-green-600' },
          { label: 'Balance', value: formatCurrency(totals?.balance ?? 0), color: (totals?.balance ?? 0) > 0 ? 'text-red-600' : 'text-green-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-neutral-500">{s.label}</p>
              <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(totals?.pendingVerification ?? 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/10">
          <CardContent className="py-3 text-sm text-yellow-800 dark:text-yellow-300">
            {formatCurrency(totals!.pendingVerification)} submitted but not yet verified — it isn&apos;t counted above.
          </CardContent>
        </Card>
      )}

      {/* Members — each keeps their own file, documents and visa status */}
      <Card>
        <CardHeader><CardTitle>Travellers ({members.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!members.length ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
              <p className="text-sm text-neutral-500">No travellers in this group yet</p>
              <Button className="mt-4" onClick={() => setShowAdd(true)}>Add Traveller</Button>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {members.map((m: any) => {
                const balance = (m.totalCost || 0) - (m.amountPaid || 0);
                return (
                  <li key={m._id} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => router.push(`/travel-files/${m._id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">{m.fileNumber}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        {m.customerId?.fullName || `${m.customerId?.firstName || ''} ${m.customerId?.lastName || ''}`.trim()}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {m.destination}
                        {m.customerId?.passport?.number ? ` · Passport ${m.customerId.passport.number}` : ' · No passport on file'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(m.amountPaid || 0)}</p>
                      <p className={`text-xs ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {balance > 0 ? `${formatCurrency(balance)} left` : 'Fully paid'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(m._id)}
                      title="Remove from group"
                      className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Shared ledger */}
      <Card>
        <CardHeader><CardTitle>Shared Ledger ({data.payments?.length || 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!data.payments?.length ? (
            <p className="py-10 text-center text-sm text-neutral-400">No payments recorded for this group yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {data.payments.map((p: any) => (
                <li key={p._id} className="flex items-center justify-between gap-4 px-6 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${p.status === 'rejected' ? 'text-neutral-400 line-through' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {formatCurrency(p.amount, p.currency)}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-neutral-400">
                      {p.travelFileId?.fileNumber && `${p.travelFileId.fileNumber} · `}
                      <span className="capitalize">{p.method?.replace(/_/g, ' ')}</span> · {formatDate(p.paidAt)}
                      {p.reference && ` · Ref: ${p.reference}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {p.customerId?.fullName || ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add traveller */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Traveller to Group" size="md">
        <div className="space-y-4 p-6">
          <div>
            <Label>Travel File</Label>
            <Select value={addFileId} onChange={(e) => setAddFileId(e.target.value)}>
              <option value="">Select a travel file...</option>
              {(unassignedFiles as any[])?.filter((f: any) => !f.groupId).map((f: any) => (
                <option key={f._id} value={f._id}>
                  {f.fileNumber} — {f.customerId?.fullName || `${f.customerId?.firstName || ''} ${f.customerId?.lastName || ''}`.trim()}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-neutral-400">
              Only files not already in a group are listed. Their documents and visa stay on their own file.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!addFileId} loading={addMutation.isPending} onClick={() => addMutation.mutate()}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Record group payment */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record Group Payment" size="lg">
        <div className="space-y-4 p-6">
          <p className="text-sm text-neutral-500">
            One transfer covering several travellers. Enter the total, split it across the family, then record it once.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Total Amount *</Label>
              <Input type="number" min="0" placeholder="0" value={pay.amount}
                onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input placeholder="Teller / transfer ref" value={pay.reference}
                onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <Label>Split across travellers</Label>
            <Button size="sm" variant="outline" onClick={autoSplit} disabled={!Number(pay.amount)}>
              Auto-split by balance
            </Button>
          </div>

          <ul className="space-y-2">
            {members.map((m: any) => {
              const balance = Math.max(0, (m.totalCost || 0) - (m.amountPaid || 0));
              return (
                <li key={m._id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                      {m.customerId?.fullName || `${m.customerId?.firstName || ''} ${m.customerId?.lastName || ''}`.trim()}
                    </p>
                    <p className="text-xs text-neutral-400">{m.fileNumber} · {formatCurrency(balance)} outstanding</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    className="w-36"
                    placeholder="0"
                    value={allocations[m._id] || ''}
                    onChange={(e) => setAllocations((a) => ({ ...a, [m._id]: e.target.value }))}
                  />
                </li>
              );
            })}
          </ul>

          <div className={`flex justify-between rounded-lg px-4 py-2.5 text-sm ${
            allocationMatches ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-neutral-50 text-neutral-600 dark:bg-neutral-800'
          }`}>
            <span>Allocated</span>
            <span className="font-semibold">
              {formatCurrency(allocatedTotal)} {Number(pay.amount) > 0 && `of ${formatCurrency(Number(pay.amount))}`}
            </span>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPay(false)}>Cancel</Button>
            <Button disabled={!allocationMatches} loading={payMutation.isPending} onClick={() => payMutation.mutate()}>
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
