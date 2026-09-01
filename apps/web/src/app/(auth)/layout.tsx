import { ReactNode } from 'react';
import { Globe } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-blue-600 p-8 lg:flex lg:p-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">TourOps</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            The Complete Operations Platform for Travel & Visa Businesses.
          </h1>
          <p className="mt-4 text-blue-100">
            Manage customers, bookings, visas, invoices, and documents — all in one place.
          </p>
        </div>
        <p className="text-sm text-blue-200">© {new Date().getFullYear()} TourOps. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8 dark:bg-gray-950">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
