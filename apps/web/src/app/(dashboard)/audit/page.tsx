'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { auditApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge, Skeleton } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { UpgradeNotice } from '@/components/shared/UpgradeNotice';
import { useEntitlements } from '@/hooks/useEntitlements';
import { formatDate } from '@/lib/utils';

interface AuditRow {
  _id: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
  userId?: { firstName: string; lastName: string; role: string };
}

const ACTION_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'default'> = {
  create: 'green',
  delete: 'red',
  approve: 'green',
  reject: 'red',
  suspend: 'red',
  verify: 'blue',
  update: 'default',
};

export default function AuditPage() {
  const { entitlements } = useEntitlements();
  const [resource, setResource] = useState('');

  const { data, isLoading } = useQuery<AuditRow[]>({
    queryKey: ['audit', resource],
    queryFn: () => auditApi.list({ resource: resource || undefined, limit: 200 }).then((r) => r.data.data),
    enabled: entitlements.refunds,
  });

  // The audit trail ships with the same plan as refund approvals.
  if (!entitlements.refunds) {
    return (
      <div className="space-y-5">
        <PageHeader title="Audit Trail" description="Who changed what, and when" />
        <UpgradeNotice
          feature="The audit trail"
          body="Every change your staff make, recorded with who did it, what they touched and when. Useful when money or a visa goes missing and you need to know who last touched the record."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Trail" description="Who changed what, and when" />

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-3">
          <Select value={resource} onChange={(e) => setResource(e.target.value)} className="w-48">
            <option value="">Everything</option>
            <option value="customers">Customers</option>
            <option value="travel-files">Travel files</option>
            <option value="bookings">Bookings</option>
            <option value="visas">Visas</option>
            <option value="issued-visas">Issued visas</option>
            <option value="payments">Payments</option>
            <option value="refunds">Refunds</option>
            <option value="invoices">Invoices</option>
            <option value="users">Team</option>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data?.length ? (
          <div className="py-16 text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-sm text-neutral-600">Nothing recorded yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
              Changes your team makes from now on will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
                  <th className="px-5 py-2.5 text-left">When</th>
                  <th className="px-5 py-2.5 text-left">Who</th>
                  <th className="px-5 py-2.5 text-left">Action</th>
                  <th className="px-5 py-2.5 text-left">On</th>
                  <th className="px-5 py-2.5 text-left">From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((row) => (
                  <tr key={row._id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 text-neutral-600">{formatDate(row.createdAt)}</td>
                    <td className="px-5 py-2.5">
                      <p className="text-neutral-900">
                        {row.userId ? `${row.userId.firstName} ${row.userId.lastName}` : '—'}
                      </p>
                      <p className="text-[11px] capitalize text-neutral-400">
                        {row.userId?.role?.replace(/_/g, ' ')}
                      </p>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant={ACTION_TONE[row.action] || 'default'}>
                        {row.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 capitalize text-neutral-700">
                      {row.resource.replace(/-/g, ' ')}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs text-neutral-400">{row.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
