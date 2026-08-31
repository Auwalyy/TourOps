'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Package, Receipt,
  FolderOpen, BarChart3, Bell, Settings, Bot, UserCog, LogOut, FolderKanban, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar } from '@/components/ui/Card';
import { authApi } from '@/services/api.service';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/travel-files', label: 'Travel Files', icon: FolderKanban },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/bookings', label: 'Bookings', icon: FileText },
  { href: '/packages', label: 'Tour Packages', icon: Package },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/ai', label: 'AI Insights', icon: Bot },
  { href: '/users', label: 'Team', icon: UserCog },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 transition-transform duration-200',
        'fixed inset-y-0 left-0 z-30 lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6 dark:border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">TourOps</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Avatar name={user.fullName} src={user.avatar} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{user.fullName}</p>
              <p className="truncate text-xs text-gray-500 capitalize">{user.role.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
