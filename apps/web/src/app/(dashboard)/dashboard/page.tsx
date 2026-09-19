'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, travelFilesApi } from '@/services/api.service';
import { formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Card';
import { useBrandingStore } from '@/stores/branding.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  Users, FileText, Globe, TrendingUp, FolderKanban,
  AlertTriangle, Calendar, ArrowRight, Clock, CheckCircle2,
  Plane, ArrowUpRight, Wallet,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BOOKING_COLORS: Record<string, string> = {
  draft: '#94a3b8', pending: '#facc15', reserved: '#60a5fa', confirmed: '#34d399',
  ticketed: '#a78bfa', completed: '#10b981', cancelled: '#f87171',
};

const STAT_CONFIGS = [
  { key: 'totalCustomers',    label: 'Total Customers',     icon: Users,        href: '/customers' },
  { key: 'activeBookings',    label: 'Active Bookings',     icon: FileText,     href: '/bookings' },
  { key: 'pendingVisas',      label: 'Pending Visas',       icon: Globe,        href: '/visas' },
  { key: 'activeTravelFiles', label: 'Active Travel Files', icon: FolderKanban, href: '/travel-files' },
  { key: 'totalRevenue',      label: 'Total Revenue',       icon: TrendingUp,   href: '/invoices', accent: true },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-2 font-bold text-slate-600 dark:text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

/**
 * Quiet by default, with the one figure that matters most (revenue) carrying
 * the accent. Five competing colours read as decoration; one reads as emphasis.
 */
function StatCard({ title, value, icon: Icon, href, sub, accent }: {
  title: string; value: string | number; icon: any;
  href: string; sub?: string; accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-5 transition-colors ${
        accent
          ? 'border-transparent bg-blue-600 text-white hover:bg-blue-700'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <Icon className={`h-5 w-5 ${accent ? 'text-white/80' : 'text-slate-400'}`} />
        <ArrowUpRight
          className={`h-4 w-4 transition-opacity ${
            accent ? 'text-white/40 group-hover:text-white/80' : 'text-slate-300 group-hover:text-slate-500'
          }`}
        />
      </div>
      <p className={`mt-4 text-2xl font-semibold tracking-tight ${accent ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
      <p className={`mt-0.5 text-sm ${accent ? 'text-white/70' : 'text-slate-500'}`}>{title}</p>
      {sub && <p className={`mt-1 text-xs ${accent ? 'text-white/50' : 'text-slate-400'}`}>{sub}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#0d6e52';

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

  const statValues: Record<string, string | number> = {
    totalCustomers: kpis?.totalCustomers ?? 0,
    activeBookings: kpis?.activeBookings ?? 0,
    pendingVisas: kpis?.pendingVisas ?? 0,
    activeTravelFiles,
    totalRevenue: formatCurrency(kpis?.totalRevenue ?? 0),
  };

  const statSubs: Record<string, string> = {
    activeTravelFiles: `${travelMap['ready_for_departure'] ?? 0} ready to depart`,
    totalRevenue: `${formatCurrency(kpis?.totalOutstanding ?? 0)} outstanding`,
  };

  return (
    <div className="space-y-6">

      {/* ── Greeting ── */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {greeting}, {user?.firstName}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-400">Outstanding</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(kpis?.totalOutstanding ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Revenue</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(kpis?.totalRevenue ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {STAT_CONFIGS.map((cfg) => (
            <StatCard
              key={cfg.key}
              title={cfg.label}
              value={statValues[cfg.key]}
              icon={cfg.icon}
              href={cfg.href}
              sub={statSubs[cfg.key]}
              accent={cfg.accent}
            />
          ))}
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Revenue chart */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-800/50">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Revenue Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly revenue vs outstanding — {new Date().getFullYear()}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />Outstanding
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke={primaryColor} fill="url(#gRev)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="Outstanding" stroke="#f97316" fill="url(#gOut)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Booking status */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-800/50">
          <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Booking Status</h2>
          <p className="mb-5 text-xs text-slate-400">Distribution by status</p>
          {bookingStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={bookingStatusData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold capitalize text-slate-700">{payload[0].payload.name}</p>
                      <p className="text-slate-500">{payload[0].value} bookings</p>
                    </div>
                  ) : null
                } />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  {bookingStatusData.map((entry: any) => (
                    <Cell key={entry.key} fill={BOOKING_COLORS[entry.key] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[230px] items-center justify-center text-sm text-slate-300">No booking data yet</div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Attention required */}
        <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-white/5 dark:bg-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Needs Attention</h2>
              {attentionFiles?.length > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                  {attentionFiles.length}
                </span>
              )}
            </div>
            <Link href="/travel-files" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {!attentionFiles?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">All clear!</p>
              <p className="text-xs text-slate-400">No files need attention right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {attentionFiles.slice(0, 6).map((f: any) => {
                const c = f.customerId as any;
                return (
                  <Link key={f._id} href={`/travel-files/${f._id}`}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                      <Plane className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{f.fileNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          f.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                          f.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                          'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                        }`}>{f.priority}</span>
                      </div>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                        {c?.firstName} {c?.lastName} · {f.destination}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={f.status} />
                      {f.departureDate && <p className="mt-1 text-xs text-slate-400">{formatDate(f.departureDate)}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Upcoming appointments */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-white/5 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4 dark:border-white/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Appointments</h2>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {!appointments?.length ? (
                <p className="px-5 py-6 text-center text-sm text-slate-300">No upcoming appointments</p>
              ) : (
                appointments.slice(0, 4).map((appt: any) => (
                  <div key={appt._id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                      <span className="text-xs font-bold text-blue-600 leading-none">
                        {new Date(appt.appointment?.date).getDate() || '—'}
                      </span>
                      <span className="text-[9px] text-blue-400 leading-none">
                        {MONTHS[new Date(appt.appointment?.date).getMonth()] || ''}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {(appt.customerId as any)?.fullName || 'Customer'}
                      </p>
                      <p className="text-xs text-slate-400">{appt.destinationCountry}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-white/5 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4 dark:border-white/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {!activity?.length ? (
                <p className="px-5 py-6 text-center text-sm text-slate-300">No recent activity</p>
              ) : (
                activity.slice(0, 6).map((log: any) => (
                  <div key={log._id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {(log.userId as any)?.firstName}
                        </span>
                        {' '}{log.action} {log.resource}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatRelativeTime(log.createdAt)}</p>
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
