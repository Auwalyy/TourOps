'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState, ReactNode, useEffect, Suspense } from 'react';
import { ProgressBar } from '@/components/layout/ProgressBar';
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
          queries: {
            staleTime: 30 * 1000,
            // A 4xx (not found, forbidden, invalid) won't change on retry — show
            // it straight away. Retry once only for network/server failures.
            retry: (count, error: any) => {
              const status = error?.response?.status;
              if (status && status >= 400 && status < 500) return false;
              return count < 1;
            },
          },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingBootstrap />
      <Suspense fallback={null}>
        <ProgressBar />
      </Suspense>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
