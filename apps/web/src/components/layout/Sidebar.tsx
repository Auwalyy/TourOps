'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Package, Receipt,
  FolderOpen, BarChart3, Settings, Bot, UserCog, LogOut,
  FolderKanban, Globe, ClipboardCheck, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import { Avatar } from '@/components/ui/Card';
import { authApi } from '@/services/api.service';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/travel-files', label: 'Travel Files', icon: FolderKanban },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/bookings', label: 'Bookings', icon: FileText },
  { href: '/packages', label: 'Travel Deals', icon: Package },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/receipts', label: 'Receipts', icon: ClipboardCheck },
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
  const { branding } = useBrandingStore();
  const router = useRouter();
  const displayName = branding.companyName || branding.agencyName || 'Operations';
  const primaryColor = branding.primaryColor || '#2563eb';

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'flex h-screen w-[85vw] max-w-[260px] flex-col',
        'bg-[#0f172a] dark:bg-[#080d1a]',
        'fixed inset-y-0 left-0 z-30 transition-transform duration-200',
        'lg:static lg:w-[260px] lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          {branding.logoUrl ? (
            <Image src={branding.logoUrl} alt={displayName} width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: primaryColor }}>
              <Globe className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="text-[15px] font-bold text-white truncate">{displayName}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
                style={active ? { backgroundColor: primaryColor } : {}}
              >
                <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', active ? 'text-white' : 'text-slate-500 group-hover:text-white')} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-white/5 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.fullName} src={user.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                <p className="truncate text-xs text-slate-500 capitalize">{user.role.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
