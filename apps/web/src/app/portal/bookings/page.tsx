'use client';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/services/api.service';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function PortalBookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'bookings', 'all'],
    queryFn: () => bookingsApi.list({ limit: 50 }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : !data?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-gray-400">No bookings found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((b: any) => (
            <Card key={b._id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-mono text-sm font-medium text-blue-600">{b.referenceNumber}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{b.bookingType} booking</p>
                  <p className="text-xs text-gray-500">
                    {b.travelDate ? `Travel: ${formatDate(b.travelDate)}` : `Created: ${formatDate(b.createdAt)}`}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(b.totalAmount, b.currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
