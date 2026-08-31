'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, travelFilesApi } from '@/services/api.service';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, SkeletonCard } from '@/components/ui/Card';
import { Users, FileText, Globe, TrendingUp, AlertCircle, Calendar, FolderKanban } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function KPICard({ title, value, icon: Icon, color, sub }: { title: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
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

  const travelMap = Object.fromEntries((travelSummary || []).map((s: any) => [s._id, s.count]));
  const activeTravelFiles = (travelSummary || []).filter((s: any) => !['completed', 'cancelled'].includes(s._id)).reduce((sum: number, s: any) => sum + s.count, 0);

  const chartData = MONTHS.map((month, i) => {
    const found = revenueData?.find((d: any) => d._id === i + 1);
    return { month, revenue: found?.revenue || 0, outstanding: found?.outstanding || 0 };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back. Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KPICard title="Active Customers" value={kpis?.totalCustomers ?? 0} icon={Users} color="bg-blue-500" />
          <KPICard title="Active Bookings" value={kpis?.activeBookings ?? 0} icon={FileText} color="bg-purple-500" />
          <KPICard title="Pending Visas" value={kpis?.pendingVisas ?? 0} icon={Globe} color="bg-orange-500" />
          <KPICard title="Active Travel Files" value={activeTravelFiles} icon={FolderKanban} color="bg-indigo-500" sub={`${travelMap['ready_for_departure'] ?? 0} ready to depart`} />
          <KPICard
            title="Total Revenue"
            value={formatCurrency(kpis?.totalRevenue ?? 0)}
            icon={TrendingUp}
            color="bg-green-500"
            sub={`${formatCurrency(kpis?.totalOutstanding ?? 0)} outstanding`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#revenue)" strokeWidth={2} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!appointments?.length ? (
              <p className="text-sm text-gray-400">No upcoming appointments</p>
            ) : (
              appointments.slice(0, 5).map((appt: any) => (
                <div key={appt._id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {(appt.customerId as any)?.fullName || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-500">{appt.destinationCountry} — {formatDate(appt.appointment?.date)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!activity?.length ? (
            <p className="text-sm text-gray-400">No recent activity</p>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 10).map((log: any) => (
                <li key={log._id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {(log.userId as any)?.firstName} {(log.userId as any)?.lastName}
                  </span>
                  <span className="text-gray-500">{log.action} {log.resource}</span>
                  <span className="ml-auto text-xs text-gray-400">{formatRelativeTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
