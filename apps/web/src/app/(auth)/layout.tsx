'use client';
import { ReactNode } from 'react';
import { Globe } from 'lucide-react';
import Image from 'next/image';
import { useBrandingStore } from '@/stores/branding.store';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { branding } = useBrandingStore();
  const displayName = branding.companyName || branding.agencyName || 'Operations Platform';
  const tagline = branding.tagline;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between p-8 lg:flex lg:p-12" style={{ backgroundColor: branding.primaryColor || '#2563eb' }}>
        <div className="flex items-center gap-2">
          {branding.logoUrl ? (
            <Image src={branding.logoUrl} alt={displayName} width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Globe className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="text-xl font-bold text-white">{displayName}</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            {tagline || 'Manage your operations — all in one place.'}
          </h1>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} {displayName}. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8 dark:bg-gray-950">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
