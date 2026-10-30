'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { SubscriptionGate } from '@/components/layout/SubscriptionGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // The app rendered, so any auto-reload for a new build has done its job;
  // clear the guard so the next deploy can reload again (see error.tsx).
  useEffect(() => {
    try { sessionStorage.removeItem('reloaded-for-new-build'); } catch {}
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-[1400px] p-5 sm:p-6 lg:p-8">
            <SubscriptionGate>{children}</SubscriptionGate>
          </div>
        </main>
      </div>
    </div>
  );
}
