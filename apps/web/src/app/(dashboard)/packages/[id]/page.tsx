'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { packagesApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useState } from 'react';

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['packages', id],
    queryFn: () => packagesApi.getById(id).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => packagesApi.delete(id),
    onSuccess: () => {
      toast.success('Package deleted');
      router.push('/packages');
    },
    onError: () => toast.error('Failed to delete package'),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!pkg) return <p className="text-gray-500">Package not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pkg.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={pkg.status} />
            <span className="text-sm text-gray-500 capitalize">{pkg.category.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Package Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{pkg.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Destinations" value={pkg.destinations.join(', ')} />
                <Detail label="Duration" value={`${pkg.duration.days} Days / ${pkg.duration.nights} Nights`} />
                <Detail label="Base Price" value={formatCurrency(pkg.pricing.basePrice, pkg.pricing.currency)} />
                {pkg.pricing.discountedPrice && (
                  <Detail label="Discounted Price" value={formatCurrency(pkg.pricing.discountedPrice, pkg.pricing.currency)} />
                )}
                <Detail label="Per Person" value={pkg.pricing.pricePerPerson ? 'Yes' : 'No'} />
                <Detail label="Max Capacity" value={pkg.availability.maxCapacity ? String(pkg.availability.maxCapacity) : 'Unlimited'} />
                <Detail label="Current Bookings" value={String(pkg.availability.currentBookings)} />
              </div>
            </CardContent>
          </Card>

          {pkg.itinerary.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Itinerary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {pkg.itinerary.map((day) => (
                  <div key={day.day} className="border-l-2 border-blue-200 pl-4 dark:border-blue-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Day {day.day}: {day.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{day.description}</p>
                    {day.activities.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {day.activities.map((a, i) => <li key={i} className="text-xs text-gray-600 dark:text-gray-400">• {a}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {pkg.inclusions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Inclusions</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {pkg.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="mt-0.5 text-green-500">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {pkg.exclusions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Exclusions</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {pkg.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="mt-0.5 text-red-500">✗</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Package"
        description={`Permanently delete "${pkg.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500">{label}</p><p className="font-medium text-gray-900 dark:text-gray-100">{value}</p></div>;
}
