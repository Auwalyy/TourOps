'use client';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, visasApi, invoicesApi } from '@/services/api.service';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Globe, Receipt, ArrowRight } from 'lucide-react';

export default function PortalDashboardPage() {
  const { user } = useAuthStore();

  const { data: bookings } = useQuery({
    queryKey: ['portal', 'bookings'],
    queryFn: () => bookingsApi.list({ limit: 3 }).then((r) => r.data.data),
  });

  const { data: visas } = useQuery({
    queryKey: ['portal', 'visas'],
    queryFn: () => visasApi.list({ limit: 3 }).then((r) => r.data.data),
  });

  const { data: invoices } = useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: () => invoicesApi.list({ limit: 3 }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-sm text-gray-500">Here's an overview of your travel activity</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard
          title="Active Bookings"
          count={bookings?.filter((b: any) => ['confirmed', 'in_progress'].includes(b.status)).length || 0}
          icon={FileText}
          href="/portal/bookings"
          color="bg-blue-500"
        />
        <SummaryCard
          title="Visa Applications"
          count={visas?.length || 0}
          icon={Globe}
          href="/portal/visas"
          color="bg-purple-500"
        />
        <SummaryCard
          title="Outstanding Invoices"
          count={invoices?.filter((i: any) => i.outstandingBalance > 0).length || 0}
          icon={Receipt}
          href="/portal/invoices"
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <Link href="/portal/bookings" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!bookings?.length ? (
              <p className="text-sm text-gray-400">No bookings yet</p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {bookings.map((b: any) => (
                  <li key={b._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.referenceNumber}</p>
                      <p className="text-xs text-gray-500">{b.bookingType} · {formatDate(b.createdAt)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visa Applications</CardTitle>
            <Link href="/portal/visas" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!visas?.length ? (
              <p className="text-sm text-gray-400">No visa applications</p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {visas.map((v: any) => (
                  <li key={v._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.destinationCountry}</p>
                      <p className="text-xs text-gray-500">{v.visaType} · {formatDate(v.createdAt)}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, count, icon: Icon, href, color }: { title: string; count: number; icon: any; href: string; color: string }) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 py-5">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
