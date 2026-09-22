'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Package, Receipt,
  FolderOpen, BarChart3, Settings, Sparkles, UserCog, LogOut,
  FolderKanban, ClipboardCheck, Wallet, UsersRound, Stamp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import { authApi } from '@/services/api.service';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogoMark } from '@/components/ui/Logo';

/** Grouped so a 14-item list reads as three short lists instead of one long one. */
const navGroups: Array<{ label?: string; items: Array<{ href: string; label: string; icon: any }> }> = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/travel-files', label: 'Travel Files', icon: FolderKanban },
      { href: '/bookings', label: 'Bookings', icon: FileText },
      { href: '/visas', label: 'Visas', icon: ClipboardCheck },
      { href: '/issued-visas', label: 'Issued Visas', icon: Stamp },
      { href: '/groups', label: 'Groups', icon: UsersRound },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/payments', label: 'Payments', icon: Wallet },
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/receipts', label: 'Receipts', icon: Receipt },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Agency',
    items: [
      { href: '/packages', label: 'Packages', icon: Package },
      { href: '/ai', label: 'Insights', icon: Sparkles },
      { href: '/users', label: 'Team', icon: UserCog },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const { branding } = useBrandingStore();
  const router = useRouter();
  const displayName = branding.companyName || branding.agencyName || 'TourOps';

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-neutral-900/20 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'flex h-screen w-[85vw] max-w-[248px] flex-col border-r border-neutral-200 bg-white',
        'fixed inset-y-0 left-0 z-30 transition-transform duration-200',
        'lg:static lg:w-[248px] lg:translate-x-0',
        '',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Agency identity */}
        <div className="flex h-14 items-center gap-2.5 border-b border-neutral-200 px-4">
          {branding.logoUrl ? (
            <Image src={branding.logoUrl} alt={displayName} width={24} height={24} className="h-6 w-6 rounded object-contain" />
          ) : (
            <LogoMark size={24} className="text-blue-600" />
          )}
          <span className="truncate text-sm font-semibold text-neutral-900">{displayName}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group, gi) => (
            <div key={group.label || gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                        active
                          ? 'bg-neutral-100 font-medium text-neutral-900'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-blue-600' : 'text-neutral-400')} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Current user */}
        {user && (
          <div className="border-t border-neutral-200 p-2">
            <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-neutral-900">{user.fullName}</p>
                <p className="truncate text-[11px] capitalize text-neutral-500">{user.role.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
