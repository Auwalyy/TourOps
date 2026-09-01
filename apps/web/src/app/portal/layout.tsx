'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Globe, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/services/api.service';
import { cn } from '@/lib/utils';

const portalNav = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && !pathname.startsWith('/portal/track')) router.replace('/portal/login');
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated && !pathname.startsWith('/portal/track')) return null;

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/portal/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 dark:bg-gray-950 md:pb-0">
      {/* Top nav */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="truncate text-sm font-bold text-gray-900 sm:text-base dark:text-gray-100">TourOps Portal</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {portalNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">{user?.firstName}</span>
            <button onClick={handleLogout} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-5 pb-20 sm:px-6 sm:py-8 md:pb-8">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 md:hidden">
        {portalNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              pathname === href
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
