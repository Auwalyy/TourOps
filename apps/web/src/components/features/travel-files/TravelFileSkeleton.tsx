import { Card, Skeleton } from '@/components/ui/Card';

/** Same shape as the travel file page, so the page fills in rather than jumps. */
export function TravelFileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading travel file">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>

      <div className="flex gap-4 border-b border-neutral-200 pb-2">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
      </div>

      <Skeleton className="h-12 w-full" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {[4, 6].map((rows, c) => (
            <Card key={c}>
              <div className="border-b border-neutral-200 px-5 py-3.5"><Skeleton className="h-4 w-36" /></div>
              <div className="grid grid-cols-2 gap-4 px-5 py-4">
                {Array.from({ length: rows }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          {[3, 2].map((rows, c) => (
            <Card key={c}>
              <div className="border-b border-neutral-200 px-5 py-3.5"><Skeleton className="h-4 w-32" /></div>
              <div className="space-y-3 px-5 py-4">
                {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
