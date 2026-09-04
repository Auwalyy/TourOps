'use client';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api.service';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import Link from 'next/link';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const { branding } = useBrandingStore();

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md dark:border-white/5 dark:bg-[#0f172a]/90 sm:px-6">
      {/* Left — mobile menu + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-slate-400">
            {branding.companyName || branding.agencyName || 'Operations Platform'}
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {data?.count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {data.count > 9 ? '9+' : data.count}
            </span>
          )}
        </Link>

        {/* User pill */}
        {user && (
          <div className="ml-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:block">
              {user.firstName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
