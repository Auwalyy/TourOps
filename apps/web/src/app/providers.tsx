'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState, ReactNode, useEffect } from 'react';
import { useBrandingStore } from '@/stores/branding.store';
import { useAuthStore } from '@/stores/auth.store';

function BrandingBootstrap() {
  const { fetch } = useBrandingStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetch(user?.agencyId);
  }, [user?.agencyId]);

  // The app's colour and icon are fixed TourOps brand, not per-agency. An
  // agency's logo and name still appear in the sidebar and on its documents.
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, retry: 1 },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingBootstrap />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
