'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Mail, Phone, Globe, Calendar } from 'lucide-react';
import { customersApi, bookingsApi, visasApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import { CustomerFormModal } from '@/components/features/customers/CustomerFormModal';

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div>
        <span className="text-gray-500">{label}: </span>
        <span className="text-gray-900 dark:text-gray-100">{value}</span>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getById(id).then((r) => r.data.data),
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings', { customerId: id }],
    queryFn: () => bookingsApi.list({ customerId: id, limit: 5 }).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: visas } = useQuery({
    queryKey: ['visas', { customerId: id }],
    queryFn: () => visasApi.list({ customerId: id, limit: 5 }).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (!customer) return <p className="text-gray-500">Customer not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.fullName}</h1>
          <StatusBadge status={customer.status} />
        </div>
        <Button variant="outline" onClick={() => setShowEdit(true)}>
          <Edit className="h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={customer.email} />
            <InfoRow icon={Phone} label="Phone" value={customer.phone} />
            <InfoRow icon={Globe} label="Nationality" value={customer.nationality} />
            <InfoRow icon={Calendar} label="Date of Birth" value={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : undefined} />
            {customer.passport?.number && (
              <InfoRow
                icon={Globe}
                label="Passport"
                value={`${customer.passport.number}${customer.passport.expiryDate ? ` (exp: ${formatDate(customer.passport.expiryDate)})` : ''}`}
              />
            )}
            {customer.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {customer.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {customer.notes && <p className="pt-2 text-sm text-gray-500">{customer.notes}</p>}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
            <CardContent>
              {!bookings?.length ? (
                <p className="text-sm text-gray-400">No bookings yet</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {bookings.map((b: any) => (
                    <li key={b._id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.referenceNumber}</p>
                        <p className="text-xs text-gray-500">{b.bookingType} · {formatDate(b.createdAt)}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Visa Applications</CardTitle></CardHeader>
            <CardContent>
              {!visas?.length ? (
                <p className="text-sm text-gray-400">No visa applications</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {visas.map((v: any) => (
                    <li key={v._id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {v.destinationCountry} — {v.visaType}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(v.createdAt)}</p>
                      </div>
                      <StatusBadge status={v.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showEdit && (
        <CustomerFormModal open={showEdit} onClose={() => setShowEdit(false)} customer={customer} />
      )}
    </div>
  );
}
