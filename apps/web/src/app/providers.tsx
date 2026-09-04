'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState, ReactNode, useEffect } from 'react';
import { useBrandingStore } from '@/stores/branding.store';
import { useAuthStore } from '@/stores/auth.store';

function BrandingBootstrap() {
  const { fetch, branding } = useBrandingStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetch(user?.agencyId);
  }, [user?.agencyId]);

  useEffect(() => {
    if (branding.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', branding.primaryColor);
    }
    if (branding.faviconUrl) {
      const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ||
        Object.assign(document.createElement('link'), { rel: 'icon' });
      link.href = branding.faviconUrl;
      document.head.appendChild(link);
    }
  }, [branding.primaryColor, branding.faviconUrl]);

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
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <BrandingBootstrap />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
