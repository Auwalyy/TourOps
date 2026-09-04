'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, travelFilesApi } from '@/services/api.service';
import { formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Card';
import { useBrandingStore } from '@/stores/branding.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  Users, FileText, Globe, TrendingUp, FolderKanban, AlertTriangle,
  Calendar, ArrowUpRight, ArrowRight, Clock, CheckCircle2, Plane,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BOOKING_STATUS_COLORS: Record<string, string> = {
  enquiry: '#94a3b8', quoted: '#60a5fa', confirmed: '#34d399',
  in_progress: '#a78bfa', completed: '#10b981', cancelled: '#f87171',
};

function StatCard({
  title, value, sub, icon: Icon, iconBg, trend, href,
}: {
  title: string; value: string | number; sub?: string;
  icon: any; iconBg: string; trend?: { value: string; up: boolean };
  href?: string;
}) {
  const inner = (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-200">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold tracking-tight text-gray-900">{value}</p>
        <p className="mt-0.5 text-sm text-gray-500">{title}</p>
      </div>
      {(sub || trend) && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
              <ArrowUpRight className={`h-3 w-3 ${!trend.up && 'rotate-180'}`} />
              {trend.value}
            </span>
          )}
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-gray-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#2563eb';

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardApi.getKPIs().then((r) => r.data.data),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: () => dashboardApi.getRevenueChart().then((r) => r.data.data),
  });

  const { data: appointments } = useQuery({
    queryKey: ['dashboard', 'appointments'],
    queryFn: () => dashboardApi.getUpcomingAppointments().then((r) => r.data.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.getRecentActivity().then((r) => r.data.data),
  });

  const { data: travelSummary } = useQuery({
    queryKey: ['travel-files', 'summary'],
    queryFn: () => travelFilesApi.statusSummary().then((r) => r.data.data),
  });

  const { data: attentionFiles } = useQuery({
    queryKey: ['travel-files', 'attention'],
    queryFn: () => travelFilesApi.attentionRequired().then((r) => r.data.data),
  });

  const travelMap = Object.fromEntries((travelSummary || []).map((s: any) => [s._id, s.count]));
  const activeTravelFiles = (travelSummary || [])
    .filter((s: any) => !['completed', 'cancelled', 'archived'].includes(s._id))
    .reduce((sum: number, s: any) => sum + s.count, 0);

  const chartData = MONTHS.map((month, i) => {
    const found = revenueData?.find((d: any) => d._id === i + 1);
    return { month, Revenue: found?.revenue || 0, Outstanding: found?.outstanding || 0 };
  });

  const bookingStatusData = (kpis?.bookingStatusCounts || []).map((s: any) => ({
    name: s._id.replace(/_/g, ' '),
    value: s.count,
    key: s._id,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {greeting}, {user?.firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
          <Clock className="h-4 w-4 text-gray-400" />
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <StatCard title="Total Customers" value={kpis?.totalCustomers ?? 0} icon={Users} iconBg="bg-blue-500" href="/customers" sub="All time" />
          <StatCard title="Active Bookings" value={kpis?.activeBookings ?? 0} icon={FileText} iconBg="bg-violet-500" href="/bookings" sub="In progress" />
          <StatCard title="Pending Visas" value={kpis?.pendingVisas ?? 0} icon={Globe} iconBg="bg-orange-500" href="/visas" sub="Awaiting action" />
          <StatCard
            title="Active Travel Files"
            value={activeTravelFiles}
            icon={FolderKanban}
            iconBg="bg-indigo-500"
            href="/travel-files"
            sub={`${travelMap['ready_for_departure'] ?? 0} ready to depart`}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(kpis?.totalRevenue ?? 0)}
            icon={TrendingUp}
            iconBg="bg-emerald-500"
            sub={`${formatCurrency(kpis?.totalOutstanding ?? 0)} outstanding`}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue area chart */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Revenue Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">Monthly revenue vs outstanding</p>
            </div>
            <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">{new Date().getFullYear()}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOutstanding" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke={primaryColor} fill="url(#gradRevenue)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="Outstanding" stroke="#f97316" fill="url(#gradOutstanding)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" />Outstanding</span>
          </div>
        </div>

        {/* Booking status bar chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">Booking Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">Distribution by status</p>
          </div>
          {bookingStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingStatusData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: '#f9fafb' }} content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold capitalize text-gray-700">{payload[0].payload.name}</p>
                    <p className="text-gray-500">{payload[0].value} bookings</p>
                  </div>
                ) : null} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {bookingStatusData.map((entry: any) => (
                    <Cell key={entry.key} fill={BOOKING_STATUS_COLORS[entry.key] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-gray-300">No booking data yet</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Attention required */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Needs Attention</h2>
              {attentionFiles?.length > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">{attentionFiles.length}</span>
              )}
            </div>
            <Link href="/travel-files" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!attentionFiles?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium text-gray-500">All clear! No files need attention.</p>
              </div>
            ) : (
              attentionFiles.slice(0, 6).map((f: any) => {
                const c = f.customerId as any;
                return (
                  <Link key={f._id} href={`/travel-files/${f._id}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <Plane className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{f.fileNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          f.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                          f.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{f.priority}</span>
                      </div>
                      <p className="truncate text-sm text-gray-700">{c?.firstName} {c?.lastName} · {f.destination}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={f.status} />
                      {f.departureDate && <p className="mt-1 text-xs text-gray-400">{formatDate(f.departureDate)}</p>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: appointments + activity */}
        <div className="space-y-6">
          {/* Upcoming appointments */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-50 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Appointments</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!appointments?.length ? (
                <p className="px-5 py-6 text-center text-sm text-gray-300">No upcoming appointments</p>
              ) : (
                appointments.slice(0, 4).map((appt: any) => (
                  <div key={appt._id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">
                      {new Date(appt.appointment?.date).getDate() || '—'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {(appt.customerId as any)?.fullName || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-400">{appt.destinationCountry} · {formatDate(appt.appointment?.date)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-50 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!activity?.length ? (
                <p className="px-5 py-6 text-center text-sm text-gray-300">No recent activity</p>
              ) : (
                activity.slice(0, 5).map((log: any) => (
                  <div key={log._id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-800">{(log.userId as any)?.firstName}</span>
                        {' '}{log.action} {log.resource}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatRelativeTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
