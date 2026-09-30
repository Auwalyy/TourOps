import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, ClipboardCheck, TrendingUp, Wallet } from 'lucide-react-native';
import { dashboardApi } from '@/services/api.service';
import { DashboardKPIs } from '@/types';
import { Screen, Loading } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { formatCurrency, timeAgo, titleCase } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { BRAND, MUTED } from '@/lib/brand';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const kpis = useQuery<DashboardKPIs>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardApi.kpis().then((r) => r.data.data),
  });

  const activity = useQuery<any[]>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.recentActivity().then((r) => r.data.data),
    retry: false,
  });

  const refreshing = kpis.isFetching || activity.isFetching;
  function refresh() {
    kpis.refetch();
    activity.refetch();
  }

  const k = kpis.data;

  return (
    <Screen
      title={`Hello, ${user?.firstName || 'there'}`}
      subtitle="Here is where your agency stands today"
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {kpis.isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Money first — it is what an owner opens the app for. */}
          <Card className="mb-3 p-4">
            <View className="flex-row items-center gap-2">
              <TrendingUp color={BRAND} size={15} />
              <Text className="text-[12px] font-medium uppercase tracking-wide text-neutral-500">
                Revenue
              </Text>
            </View>
            <Text className="mt-1.5 text-2xl font-semibold tracking-tight text-neutral-900">
              {formatCurrency(k?.totalRevenue)}
            </Text>
            <View className="mt-3 flex-row items-center gap-2 border-t border-neutral-100 pt-3">
              <Wallet color="#dc2626" size={14} />
              <Text className="text-[13px] text-neutral-600">
                {formatCurrency(k?.totalOutstanding)} still owed
              </Text>
            </View>
          </Card>

          <View className="mb-5 flex-row flex-wrap gap-3">
            <Stat label="Customers" value={k?.totalCustomers} icon={<Users color={MUTED} size={15} />} />
            <Stat label="Active bookings" value={k?.activeBookings} icon={<FileText color={MUTED} size={15} />} />
            <Stat label="Pending visas" value={k?.pendingVisas} icon={<ClipboardCheck color={MUTED} size={15} />} />
          </View>

          <Text className="mb-2 text-[13px] font-medium text-neutral-700">Recent activity</Text>
          {!activity.data?.length ? (
            <Card className="p-5">
              <Text className="text-center text-[13px] text-neutral-400">Nothing recorded yet</Text>
            </Card>
          ) : (
            <Card>
              {activity.data.slice(0, 12).map((row: any, i: number) => (
                <View
                  key={row._id || i}
                  className={`flex-row items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-neutral-100' : ''}`}
                >
                  <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                  <View className="flex-1">
                    <Text className="text-[13px] text-neutral-800">
                      {titleCase(row.action)} · {titleCase(row.resource)}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-neutral-400">
                      {row.userId ? `${row.userId.firstName} ${row.userId.lastName} · ` : ''}
                      {timeAgo(row.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value?: number; icon: React.ReactNode }) {
  return (
    <Card className="min-w-[30%] flex-1 p-3.5">
      {icon}
      <Text className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">{value ?? '—'}</Text>
      <Text className="mt-0.5 text-[11px] text-neutral-500">{label}</Text>
    </Card>
  );
}
