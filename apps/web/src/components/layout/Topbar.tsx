'use client';
import { Bell, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api.service';
import { useBrandingStore } from '@/stores/branding.store';
import Link from 'next/link';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { branding } = useBrandingStore();

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const unread = data?.count ?? 0;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="hidden truncate text-sm text-neutral-500 sm:block">
          {branding.companyName || branding.agencyName || ''}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          title="Notifications"
          className="relative rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
          )}
        </Link>
      </div>
    </header>
  );
}
