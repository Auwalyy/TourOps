'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Ban, CalendarPlus, Wallet, RotateCcw } from 'lucide-react';
import { platformApi } from '@/services/api.service';
import { PlatformAgencyRow, AccessState, SubscriptionPayment } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const STATE_BADGE: Record<AccessState, { variant: 'green' | 'blue' | 'amber' | 'red' | 'default'; label: string }> = {
  active: { variant: 'green', label: 'Paying' },
  trialing: { variant: 'blue', label: 'Trial' },
  grace: { variant: 'amber', label: 'Read-only' },
  locked: { variant: 'red', label: 'Locked' },
  suspended: { variant: 'default', label: 'Suspended' },
};

export default function PlatformPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [extendFor, setExtendFor] = useState<PlatformAgencyRow | null>(null);
  const [payFor, setPayFor] = useState<PlatformAgencyRow | null>(null);
  const [suspendFor, setSuspendFor] = useState<PlatformAgencyRow | null>(null);
  const [days, setDays] = useState('30');
  const [manual, setManual] = useState({ plan: 'professional', billingCycle: 'monthly', amount: '' });

  const isPlatformOwner = user?.role === 'system_admin' && !user?.agencyId;

  const { data: stats } = useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: () => platformApi.stats().then((r) => r.data.data),
    enabled: isPlatformOwner,
  });

  const { data: agencies, isLoading } = useQuery<PlatformAgencyRow[]>({
    queryKey: ['platform', 'agencies', search, stateFilter],
    queryFn: () =>
      platformApi
        .agencies({ search: search || undefined, state: stateFilter || undefined })
        .then((r) => r.data.data),
    enabled: isPlatformOwner,
  });

  const { data: payments } = useQuery<SubscriptionPayment[]>({
    queryKey: ['platform', 'payments'],
    queryFn: () => platformApi.payments().then((r) => r.data.data),
    enabled: isPlatformOwner,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['platform'] });
  }

  const extend = useMutation({
    mutationFn: () => platformApi.extend(extendFor!._id, parseInt(days, 10)),
    onSuccess: () => { toast.success('Access extended'); setExtendFor(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to extend'),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      platformApi.recordPayment(payFor!._id, {
        plan: manual.plan,
        billingCycle: manual.billingCycle,
        amount: manual.amount ? Number(manual.amount) : undefined,
      }),
    onSuccess: () => { toast.success('Payment recorded'); setPayFor(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record'),
  });

  const suspend = useMutation({
    mutationFn: () => platformApi.suspend(suspendFor!._id, suspendFor!.state !== 'suspended'),
    onSuccess: () => { toast.success('Updated'); setSuspendFor(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  if (!isPlatformOwner) {
    return (
      <Card className="py-16 text-center">
        <p className="text-sm text-neutral-600">This page is for TourOps platform administrators.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Platform" description="Every agency on TourOps" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Agencies" value={stats?.totalAgencies ?? '—'} />
        <Stat label="Paying" value={stats?.active ?? '—'} tone="text-green-700" />
        <Stat label="On trial" value={stats?.trialing ?? '—'} tone="text-blue-700" />
        <Stat label="Lapsed" value={(stats?.grace ?? 0) + (stats?.locked ?? 0)} tone="text-red-700" />
        <Stat
          label="Revenue (30 days)"
          value={stats ? formatCurrency(stats.revenue30d) : '—'}
        />
      </div>

      {/* Agencies */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search agency, email or phone..." className="max-w-xs" />
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-40">
            <option value="">All states</option>
            <option value="active">Paying</option>
            <option value="trialing">On trial</option>
            <option value="grace">Read-only</option>
            <option value="locked">Locked</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !agencies?.length ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-sm text-neutral-600">No agencies match that</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
                  <th className="px-5 py-2.5 text-left">Agency</th>
                  <th className="px-5 py-2.5 text-left">Plan</th>
                  <th className="px-5 py-2.5 text-left">State</th>
                  <th className="px-5 py-2.5 text-left">Access until</th>
                  <th className="px-5 py-2.5 text-left">Staff</th>
                  <th className="px-5 py-2.5 text-left">Last payment</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {agencies.map((a) => {
                  const badge = STATE_BADGE[a.state];
                  return (
                    <tr key={a._id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-900">{a.name}</p>
                        <p className="text-xs text-neutral-500">{a.email}</p>
                      </td>
                      <td className="px-5 py-3 capitalize text-neutral-700">{a.plan}</td>
                      <td className="px-5 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {a.accessUntil ? formatDate(a.accessUntil) : '—'}
                        {a.daysLeft > 0 && (
                          <span className="ml-1 text-xs text-neutral-400">({a.daysLeft}d)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-neutral-600">{a.userCount}</td>
                      <td className="px-5 py-3 text-neutral-600">
                        {a.lastPayment
                          ? `${formatCurrency(a.lastPayment.amount)} · ${formatDate(a.lastPayment.paidAt)}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            title="Extend access"
                            onClick={() => { setExtendFor(a); setDays('30'); }}
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-blue-600"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Record a payment"
                            onClick={() => { setPayFor(a); setManual({ plan: 'professional', billingCycle: 'monthly', amount: '' }); }}
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-green-600"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title={a.state === 'suspended' ? 'Reinstate' : 'Suspend'}
                            onClick={() => setSuspendFor(a)}
                            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
                          >
                            {a.state === 'suspended' ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent payments */}
      {!!payments?.length && (
        <Card className="p-0">
          <div className="border-b border-neutral-100 px-5 py-3">
            <p className="text-[13px] font-medium text-neutral-900">Recent subscription payments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-left">Agency</th>
                  <th className="px-5 py-2.5 text-left">Plan</th>
                  <th className="px-5 py-2.5 text-left">Amount</th>
                  <th className="px-5 py-2.5 text-left">Channel</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payments.slice(0, 25).map((p) => {
                  const agency = typeof p.agencyId === 'object' ? p.agencyId : null;
                  return (
                    <tr key={p._id} className="hover:bg-neutral-50">
                      <td className="px-5 py-2.5 text-neutral-600">{formatDate(p.paidAt || p.createdAt)}</td>
                      <td className="px-5 py-2.5 text-neutral-800">{agency?.name || '—'}</td>
                      <td className="px-5 py-2.5 capitalize text-neutral-600">{p.plan} · {p.billingCycle}</td>
                      <td className="px-5 py-2.5 font-medium text-neutral-900">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-2.5 text-neutral-500">{p.channel || '—'}</td>
                      <td className="px-5 py-2.5">
                        <Badge variant={p.status === 'success' ? 'green' : p.status === 'pending' ? 'amber' : 'red'}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Extend */}
      <Modal open={!!extendFor} onClose={() => setExtendFor(null)} title="Extend access" size="sm">
        <div className="space-y-4 p-5">
          <p className="text-[13px] text-neutral-600">
            Give <span className="font-medium text-neutral-900">{extendFor?.name}</span> more time without a payment.
          </p>
          <div>
            <Label>Days</Label>
            <Input type="number" min={1} max={730} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExtendFor(null)}>Cancel</Button>
            <Button loading={extend.isPending} onClick={() => extend.mutate()}>Extend</Button>
          </div>
        </div>
      </Modal>

      {/* Manual payment */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title="Record a payment" size="sm">
        <div className="space-y-4 p-5">
          <p className="text-[13px] text-neutral-600">
            For money <span className="font-medium text-neutral-900">{payFor?.name}</span> paid you outside the
            gateway — a bank transfer or cash.
          </p>
          <div>
            <Label>Plan</Label>
            <Select value={manual.plan} onChange={(e) => setManual((m) => ({ ...m, plan: e.target.value }))}>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </div>
          <div>
            <Label>Billing cycle</Label>
            <Select
              value={manual.billingCycle}
              onChange={(e) => setManual((m) => ({ ...m, billingCycle: e.target.value }))}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <div>
            <Label>Amount received (optional)</Label>
            <Input
              type="number"
              placeholder="Leave blank to use the plan price"
              value={manual.amount}
              onChange={(e) => setManual((m) => ({ ...m, amount: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button loading={recordPayment.isPending} onClick={() => recordPayment.mutate()}>Record</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!suspendFor}
        onClose={() => setSuspendFor(null)}
        onConfirm={() => suspend.mutate()}
        title={suspendFor?.state === 'suspended' ? 'Reinstate agency' : 'Suspend agency'}
        description={
          suspendFor?.state === 'suspended'
            ? `Restore access for ${suspendFor?.name}?`
            : `${suspendFor?.name} will be locked out immediately. Their data is kept and nothing is deleted.`
        }
        confirmLabel={suspendFor?.state === 'suspended' ? 'Reinstate' : 'Suspend'}
        loading={suspend.isPending}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight ${tone || 'text-neutral-900'}`}>{value}</p>
    </Card>
  );
}
