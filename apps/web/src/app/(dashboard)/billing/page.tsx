'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Clock, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { subscriptionApi } from '@/services/api.service';
import { SubscriptionStatus, SubscriptionPayment, Plan } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

export default function BillingPage() {
  const { user } = useAuthStore();
  const isOwner = user?.role === 'agency_owner' || user?.role === 'system_admin';
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pending, setPending] = useState<string | null>(null);

  const { data: sub, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => subscriptionApi.status().then((r) => r.data.data),
  });

  const { data: history } = useQuery<SubscriptionPayment[]>({
    queryKey: ['subscription', 'history'],
    queryFn: () => subscriptionApi.history().then((r) => r.data.data),
    enabled: isOwner,
  });

  const checkout = useMutation({
    mutationFn: (plan: string) => subscriptionApi.checkout(plan, cycle).then((r) => r.data.data),
    onSuccess: (data) => {
      // Hand off to Flutterwave — they come back to /billing/callback.
      window.location.href = data.paymentLink;
    },
    onError: (e: any) => {
      setPending(null);
      toast.error(e.response?.data?.message || 'Could not start the payment');
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const plans: Plan[] = sub?.plans ? Object.values(sub.plans) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Your TourOps plan and payment history" />

      {sub && <StatusCard status={sub} />}

      {sub && !sub.gatewayConfigured && (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[13px] text-amber-900">
            Online payment is not switched on yet. Add your Flutterwave keys on the server, or contact TourOps to
            pay by transfer.
          </p>
        </Card>
      )}

      {/* Cycle toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 sm:w-fit sm:mx-auto">
        {(['monthly', 'yearly'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`rounded-md px-4 py-1.5 text-[13px] transition-colors ${
              cycle === c ? 'bg-blue-600 font-medium text-white' : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {c === 'monthly' ? 'Monthly' : 'Yearly'}
            {c === 'yearly' && (
              <span className={`ml-1.5 text-[11px] ${cycle === 'yearly' ? 'text-white/80' : 'text-green-600'}`}>
                2 months free
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = cycle === 'yearly' ? plan.yearly : plan.monthly;
          const current = sub?.plan === plan.id && sub?.state === 'active';
          const featured = plan.id === 'professional';

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-5 ${featured ? 'border-blue-300 ring-1 ring-blue-100' : ''}`}
            >
              {featured && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Most agencies
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{plan.description}</p>
                </div>
                {current && <Badge variant="green">Current</Badge>}
              </div>

              <div className="mt-4">
                <span className="text-2xl font-semibold tracking-tight text-neutral-900">
                  {formatCurrency(price)}
                </span>
                <span className="text-[13px] text-neutral-500">/{cycle === 'yearly' ? 'year' : 'month'}</span>
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-neutral-700">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-5 w-full"
                variant={featured ? 'primary' : 'outline'}
                disabled={!isOwner || !sub?.gatewayConfigured}
                loading={checkout.isPending && pending === plan.id}
                onClick={() => { setPending(plan.id); checkout.mutate(plan.id); }}
              >
                {current ? 'Renew' : sub?.state === 'trialing' ? 'Choose this plan' : 'Subscribe'}
              </Button>

              {!isOwner && (
                <p className="mt-2 text-center text-[11px] text-neutral-400">
                  Only the agency owner can change the plan
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* History */}
      {isOwner && !!history?.length && (
        <Card className="p-0">
          <div className="border-b border-neutral-100 px-5 py-3">
            <p className="text-[13px] font-medium text-neutral-900">Payment history</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-left">Plan</th>
                  <th className="px-5 py-2.5 text-left">Amount</th>
                  <th className="px-5 py-2.5 text-left">Reference</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                  <th className="px-5 py-2.5 text-left">Covers until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {history.map((p) => (
                  <tr key={p._id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 text-neutral-600">{formatDate(p.paidAt || p.createdAt)}</td>
                    <td className="px-5 py-2.5 capitalize text-neutral-800">
                      {p.plan} · {p.billingCycle}
                    </td>
                    <td className="px-5 py-2.5 font-medium text-neutral-900">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-neutral-500">{p.reference}</td>
                    <td className="px-5 py-2.5">
                      <Badge
                        variant={
                          p.status === 'success' ? 'green' : p.status === 'pending' ? 'amber' : 'red'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-neutral-600">
                      {p.periodEnd ? formatDate(p.periodEnd) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusCard({ status }: { status: SubscriptionStatus }) {
  const map = {
    active: { icon: CheckCircle2, tone: 'text-green-600 bg-green-50', label: 'Active' },
    trialing: { icon: Clock, tone: 'text-blue-600 bg-blue-50', label: 'Free trial' },
    grace: { icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50', label: 'Expired — read only' },
    locked: { icon: Lock, tone: 'text-red-600 bg-red-50', label: 'Locked' },
    suspended: { icon: Lock, tone: 'text-red-600 bg-red-50', label: 'Suspended' },
  } as const;

  const cfg = map[status.state];
  const Icon = cfg.icon;

  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.tone}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold capitalize text-neutral-900">
            {status.plan === 'trial' ? 'Free trial' : `${status.plan} plan`}
          </p>
          <Badge
            variant={
              status.state === 'active' ? 'green' : status.state === 'trialing' ? 'blue' : 'red'
            }
          >
            {cfg.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-500">
          {status.state === 'active' && status.currentPeriodEnd
            ? `Paid up to ${formatDate(status.currentPeriodEnd)} · renews in ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'}`
            : status.state === 'trialing'
            ? `${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left${status.trialEndsAt ? ` — ends ${formatDate(status.trialEndsAt)}` : ''}`
            : status.state === 'grace' && status.graceEndsAt
            ? `You can still view your data until ${formatDate(status.graceEndsAt)}`
            : 'Renew to restore access. Nothing has been deleted.'}
        </p>
      </div>
    </Card>
  );
}
