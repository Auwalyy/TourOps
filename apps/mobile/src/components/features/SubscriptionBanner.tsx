import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Lock } from 'lucide-react-native';
import { subscriptionApi } from '@/services/api.service';
import { SubscriptionStatus } from '@/types';

/**
 * A thin strip above the tab bar when the trial is nearly up or the account
 * has gone read-only. Deliberately not a modal — an agent mid-task at an
 * embassy counter should not be interrupted.
 */
export function SubscriptionBanner() {
  const { data } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => subscriptionApi.status().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!data) return null;
  if (data.state === 'active') return null;
  if (data.state === 'trialing' && data.daysLeft > 7) return null;

  const locked = data.state !== 'trialing';
  const message = locked
    ? 'Subscription expired — changes are locked. Renew on the web app.'
    : data.daysLeft <= 0
      ? 'Your free trial ends today'
      : `${data.daysLeft} day${data.daysLeft === 1 ? '' : 's'} left in your free trial`;

  return (
    <View
      className={`absolute bottom-[58px] left-0 right-0 flex-row items-center gap-2 px-4 py-2 ${
        locked ? 'bg-red-600' : 'bg-amber-500'
      }`}
    >
      {locked ? <Lock color="#fff" size={14} /> : <AlertTriangle color="#fff" size={14} />}
      <Text className="flex-1 text-[12px] font-medium text-white">{message}</Text>
    </View>
  );
}
