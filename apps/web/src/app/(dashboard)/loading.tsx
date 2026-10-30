import { Skeleton } from '@/components/ui/Card';

/** Shown the instant a dashboard page is opened, while it loads. */
export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
