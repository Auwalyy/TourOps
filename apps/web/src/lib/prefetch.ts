import { QueryClient } from '@tanstack/react-query';
import { travelFilesApi } from '@/services/api.service';
import { Booking, TravelFile } from '@/types';

/** Lets non-link navigations (row clicks, router.push) light up the top progress bar. */
export function startProgress() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tourops:navigate'));
}

/**
 * Starts loading a travel file the moment the pointer rests on it, so by the
 * time the click lands the page usually has its data. Query keys and fetchers
 * must match the ones on the travel file page exactly, or the cache is missed.
 */
export function prefetchTravelFile(qc: QueryClient, id: string, prefetchRoute?: (href: string) => void) {
  prefetchRoute?.(`/travel-files/${id}`);
  const staleTime = 30 * 1000;
  qc.prefetchQuery({
    queryKey: ['travel-files', id],
    queryFn: () => travelFilesApi.getById(id).then((r) => r.data.data as TravelFile),
    staleTime,
  });
  qc.prefetchQuery({
    queryKey: ['travel-files', id, 'bookings'],
    queryFn: () => travelFilesApi.getBookings(id).then((r) => r.data.data as Booking[]),
    staleTime,
  });
}
