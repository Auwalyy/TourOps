'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X, ExternalLink, Wallet, AlertTriangle, Clock } from 'lucide-react';
import { paymentsApi, travelFilesApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Label } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function PaymentsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<'pending' | 'all' | 'overdue'>('pending');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['payments', 'pending'],
    queryFn: () => paymentsApi.pending().then((r) => r.data.data),
  });

  const { data: all, isLoading: allLoading } = useQuery({
    queryKey: ['payments', 'all', statusFilter],
    queryFn: () => paymentsApi.list({ status: statusFilter || undefined, limit: 50 }).then((r) => r.data.data),
    enabled: tab === 'all',
  });

  const { data: overdue, isLoading: overdueLoading } = useQuery({
    queryKey: ['travel-files', 'overdue-installments'],
    queryFn: () => travelFilesApi.overdueInstallments().then((r) => r.data.data),
    enabled: tab === 'overdue',
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['payments'] });
    qc.invalidateQueries({ queryKey: ['travel-files'] });
  }

  const verifyMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.verify(id),
    onSuccess: () => { toast.success('Payment verified'); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to verify payment'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => paymentsApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Payment rejected');
      setRejecting(null);
      setRejectReason('');
      refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reject payment'),
  });

  const pendingTotal = (pending || []).reduce((s: number, p: any) => s + p.amount, 0);

  const TABS = [
    { id: 'pending' as const, label: 'Awaiting Verification', icon: Clock, count: pending?.length },
    { id: 'overdue' as const, label: 'Overdue Installments', icon: AlertTriangle, count: overdue?.length },
    { id: 'all' as const, label: 'All Payments', icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Verify money received, and chase what's late"
      />

      {/* Pending money summary */}
      {(pending?.length ?? 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/20">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  {pending!.length} payment{pending!.length === 1 ? '' : 's'} awaiting verification
                </p>
                <p className="text-xs text-yellow-700/70">
                  {formatCurrency(pendingTotal)} reported but not yet confirmed against the bank
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count ? (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">{count}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Awaiting verification */}
      {tab === 'pending' && (
        <Card>
          <CardHeader><CardTitle>Awaiting Verification</CardTitle></CardHeader>
          <CardContent className="p-0">
            {pendingLoading ? (
              <div className="p-6"><Skeleton className="h-24 w-full" /></div>
            ) : !pending?.length ? (
              <div className="py-12 text-center">
                <Check className="mx-auto mb-3 h-10 w-10 text-green-300" />
                <p className="text-sm font-medium text-neutral-500">Nothing waiting — all payments are verified</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {pending.map((p: any) => (
                  <li key={p._id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-900">
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                        <span className="text-xs capitalize text-neutral-500">{p.method?.replace(/_/g, ' ')}</span>
                        {p.travelFileId?.fileNumber && (
                          <button
                            onClick={() => router.push(`/travel-files/${p.travelFileId._id}`)}
                            className="font-mono text-xs text-blue-600 hover:underline"
                          >
                            {p.travelFileId.fileNumber}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600">
                        {p.customerId?.fullName || `${p.customerId?.firstName || ''} ${p.customerId?.lastName || ''}`.trim() || '—'}
                        {p.customerId?.phone && ` · ${p.customerId.phone}`}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(p.paidAt)}{p.reference && ` · Ref: ${p.reference}`}{p.notes && ` · ${p.notes}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {p.proofUrl && (
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-blue-400 hover:text-blue-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View proof
                        </a>
                      )}
                      <Button size="sm" loading={verifyMutation.isPending} onClick={() => verifyMutation.mutate(p._id)}>
                        <Check className="h-3.5 w-3.5" /> Verify
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(p)}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overdue installments */}
      {tab === 'overdue' && (
        <Card>
          <CardHeader><CardTitle>Overdue Installments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {overdueLoading ? (
              <div className="p-6"><Skeleton className="h-24 w-full" /></div>
            ) : !overdue?.length ? (
              <div className="py-12 text-center">
                <Check className="mx-auto mb-3 h-10 w-10 text-green-300" />
                <p className="text-sm font-medium text-neutral-500">No one is behind on their payment plan</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {overdue.map((f: any) => (
                  <li
                    key={f._id}
                    className="flex cursor-pointer flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-neutral-50"
                    onClick={() => router.push(`/travel-files/${f._id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">{f.fileNumber}</span>
                        <StatusBadge status={f.status} />
                      </div>
                      <p className="text-sm text-neutral-700">
                        {f.customerId?.fullName || `${f.customerId?.firstName || ''} ${f.customerId?.lastName || ''}`.trim()}
                        {f.customerId?.phone && ` · ${f.customerId.phone}`}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {f.overdueInstallments?.length} installment(s) past due · {f.destination}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{formatCurrency(f.shortfall)}</p>
                      <p className="text-xs text-neutral-400">behind schedule</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* All payments */}
      {tab === 'all' && (
        <Card>
          <div className="flex items-center gap-3 border-b border-neutral-100 px-6 py-4">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
          <CardContent className="p-0">
            {allLoading ? (
              <div className="p-6"><Skeleton className="h-24 w-full" /></div>
            ) : !all?.length ? (
              <p className="py-12 text-center text-sm text-neutral-400">No payments found.</p>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {all.map((p: any) => (
                  <li key={p._id} className="flex flex-wrap items-center gap-4 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${p.status === 'rejected' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-neutral-500">
                        {p.customerId?.fullName || '—'} · <span className="capitalize">{p.method?.replace(/_/g, ' ')}</span> · {formatDate(p.paidAt)}
                      </p>
                      {p.rejectionReason && <p className="text-xs text-red-500">Rejected: {p.rejectionReason}</p>}
                    </div>
                    {p.status === 'pending' && (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => verifyMutation.mutate(p._id)}>Verify</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(p)}>Reject</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject reason */}
      <Modal open={!!rejecting} onClose={() => { setRejecting(null); setRejectReason(''); }} title="Reject Payment" size="sm">
        <div className="space-y-4 p-6">
          <p className="text-sm text-neutral-600">
            Rejecting {rejecting && formatCurrency(rejecting.amount, rejecting.currency)} from{' '}
            {rejecting?.customerId?.fullName || 'this customer'}. It will not count towards their balance.
          </p>
          <div>
            <Label>Reason *</Label>
            <Textarea
              rows={3}
              placeholder="e.g. No matching credit found in the bank statement"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectReason(''); }}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
              loading={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejecting._id, reason: rejectReason.trim() })}
            >
              Reject Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
