import { View, Text, Pressable, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  CreditCard,
  FileText,
  Wallet,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { subscriptionApi } from '@/services/api.service';
import { SubscriptionStatus } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { Card, Badge } from '@/components/ui/Card';
import { formatDate, initials, titleCase } from '@/lib/utils';
import { MUTED } from '@/lib/brand';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();

  const { data: sub } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => subscriptionApi.status().then((r) => r.data.data),
    retry: false,
  });

  function confirmLogout() {
    Alert.alert('Sign out', 'You will need your password to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <Screen title="More">
      {/* Who is signed in */}
      <Card className="mb-4 flex-row items-center gap-3 p-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
          <Text className="text-[14px] font-semibold text-neutral-600">
            {initials(user?.firstName, user?.lastName)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-medium text-neutral-900">
            {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
          </Text>
          <Text className="mt-0.5 text-[12px] text-neutral-500">
            {titleCase(user?.role)} · {user?.email}
          </Text>
        </View>
      </Card>

      {/* Plan */}
      {sub ? (
        <Card className="mb-4 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <BadgeCheck color={MUTED} size={15} />
              <Text className="text-[13px] font-medium text-neutral-700">
                {sub.plan === 'trial' ? 'Free trial' : `${titleCase(sub.plan)} plan`}
              </Text>
            </View>
            <Badge
              tone={sub.state === 'active' ? 'green' : sub.state === 'trialing' ? 'blue' : 'red'}
            >
              {titleCase(sub.state)}
            </Badge>
          </View>
          <Text className="mt-2 text-[12px] text-neutral-500">
            {sub.state === 'active' && sub.currentPeriodEnd
              ? `Paid up to ${formatDate(sub.currentPeriodEnd)}`
              : sub.state === 'trialing'
                ? `${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'} left`
                : 'Renew on the web app to restore full access.'}
          </Text>
          <Text className="mt-2 text-[11px] text-neutral-400">
            Plans are changed on the web app, not here.
          </Text>
        </Card>
      ) : null}

      {/* These live on the web app for now — say so rather than dead-ending. */}
      <Text className="mb-2 px-1 text-[12px] font-medium uppercase tracking-wide text-neutral-400">
        On the web app
      </Text>
      <Card className="mb-4">
        <WebOnlyRow icon={<FileText color={MUTED} size={16} />} label="Invoices and receipts" />
        <WebOnlyRow icon={<Wallet color={MUTED} size={16} />} label="Reports and exports" />
        <WebOnlyRow icon={<CreditCard color={MUTED} size={16} />} label="Billing and plans" last />
      </Card>

      <Pressable
        onPress={confirmLogout}
        className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 active:bg-red-50"
      >
        <LogOut color="#dc2626" size={16} />
        <Text className="text-[15px] font-medium text-red-600">Sign out</Text>
      </Pressable>

      <Text className="mt-6 text-center text-[11px] text-neutral-400">TourOps · v1.0.0</Text>
    </Screen>
  );
}

function WebOnlyRow({
  icon,
  label,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-neutral-100'}`}
    >
      {icon}
      <Text className="flex-1 text-[14px] text-neutral-700">{label}</Text>
      <ChevronRight color="#d4d4d4" size={16} />
    </View>
  );
}
