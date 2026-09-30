'use client';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/services/api.service';
import { Entitlements, SubscriptionStatus } from '@/types';
import { useAuthStore } from '@/stores/auth.store';

/** Everything on, used while the status is still loading or for the owner. */
const ALL_ON: Entitlements = {
  maxUsers: 100,
  packages: true,
  groups: true,
  reports: true,
  portal: true,
  branches: true,
  refunds: true,
  ai: true,
};

/**
 * What this agency's plan allows. The server enforces the same rules — this
 * exists so the interface doesn't offer something that will be refused.
 *
 * Defaults to everything on while loading, so the nav never flickers items
 * out from under someone mid-click.
 */
export function useEntitlements(): { entitlements: Entitlements; plan?: string; loading: boolean } {
  const { user } = useAuthStore();
  const isPlatformOwner = user?.role === 'system_admin' && !user?.agencyId;

  const { data, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => subscriptionApi.status().then((r) => r.data.data),
    enabled: !isPlatformOwner,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    entitlements: data?.entitlements || ALL_ON,
    plan: data?.plan,
    loading: isLoading,
  };
}
