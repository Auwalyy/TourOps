'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Lock, Clock } from 'lucide-react';
import { subscriptionApi } from '@/services/api.service';
import { SubscriptionStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

/** Pages that must stay reachable when the account is locked. */
const ALWAYS_REACHABLE = ['/billing', '/settings', '/platform'];

/**
 * Wraps the dashboard with the trial and subscription state: a countdown
 * banner while a trial is running out, a read-only notice during the grace
 * period, and a full-page lock once the grace period ends.
 */
export function SubscriptionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isPlatformOwner = user?.role === 'system_admin' && !user?.agencyId;

  const { data: sub } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: () => subscriptionApi.status().then((r) => r.data.data),
    enabled: !isPlatformOwner,
    // Cheap, and it means a renewal unlocks the app without a hard refresh.
    refetchInterval: 5 * 60 * 1000,
    retry: false,
  });

  if (isPlatformOwner || !sub) return <>{children}</>;

  const exempt = ALWAYS_REACHABLE.some((p) => pathname.startsWith(p));

  if ((sub.state === 'locked' || sub.state === 'suspended') && !exempt) {
    return <LockScreen status={sub} />;
  }

  return (
    <>
      <SubscriptionBanner status={sub} />
      {children}
    </>
  );
}

function SubscriptionBanner({ status }: { status: SubscriptionStatus }) {
  // A trial with plenty of time left does not need to shout.
  if (status.state === 'active') return null;
  if (status.state === 'trialing' && status.daysLeft > 7) return null;

  if (status.state === 'grace') {
    return (
      <Banner
        tone="red"
        icon={Lock}
        title="Your subscription has expired — the account is read-only"
        body={
          status.graceEndsAt
            ? `You can still view everything, but nothing can be added or changed. Full access closes on ${formatDate(status.graceEndsAt)}.`
            : 'You can still view everything, but nothing can be added or changed.'
        }
      />
    );
  }

  if (status.state === 'trialing') {
    const urgent = status.daysLeft <= 3;
    return (
      <Banner
        tone={urgent ? 'red' : 'amber'}
        icon={urgent ? AlertTriangle : Clock}
        title={
          status.daysLeft <= 0
            ? 'Your free trial ends today'
            : `${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left in your free trial`
        }
        body="Choose a plan to keep your data and carry on working."
      />
    );
  }

  return null;
}

function Banner({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: 'amber' | 'red';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  const styles =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';
  const iconColor = tone === 'red' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${styles}`}>
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-xs opacity-80">{body}</p>
      </div>
      <Link href="/billing">
        <Button size="sm">Choose a plan</Button>
      </Link>
    </div>
  );
}

function LockScreen({ status }: { status: SubscriptionStatus }) {
  const suspended = status.state === 'suspended';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Lock className="h-5 w-5 text-red-600" />
        </span>
        <h1 className="text-lg font-semibold text-neutral-900">
          {suspended ? 'This account has been suspended' : 'Your subscription has expired'}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-neutral-600">
          {suspended
            ? 'Please contact TourOps support to have your account reinstated.'
            : 'Nothing has been deleted — every customer, file and payment is exactly where you left it. Renew and it all comes straight back.'}
        </p>

        {!suspended && (
          <Link href="/billing">
            <Button className="mt-6">Renew now</Button>
          </Link>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          Need help? Call or WhatsApp TourOps support.
        </p>
      </div>
    </div>
  );
}
