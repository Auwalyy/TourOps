'use client';
import { useQuery } from '@tanstack/react-query';
import { visasApi } from '@/services/api.service';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

export default function PortalVisasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'visas', 'all'],
    queryFn: () => visasApi.list({ limit: 50 }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Visa Applications</h1>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : !data?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-gray-400">No visa applications found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((v: any) => (
            <Card key={v._id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{v.destinationCountry} — {v.visaType}</p>
                    <p className="text-sm text-gray-500">Purpose: {v.purposeOfTravel}</p>
                    {v.referenceNumber && <p className="font-mono text-xs text-gray-400">{v.referenceNumber}</p>}
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                {v.appointment?.date && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Appointment Scheduled</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      {formatDate(v.appointment.date)} {v.appointment.time ? `at ${v.appointment.time}` : ''}
                      {v.appointment.location ? ` — ${v.appointment.location}` : ''}
                    </p>
                  </div>
                )}
                <div className="mt-3">
                  <p className="mb-1 text-xs text-gray-500">Progress</p>
                  <div className="flex gap-1">
                    {['draft', 'documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review', 'approved'].map((step) => {
                      const steps = ['draft', 'documents_pending', 'documents_submitted', 'appointment_scheduled', 'under_review', 'approved'];
                      const currentIdx = steps.indexOf(v.status);
                      const stepIdx = steps.indexOf(step);
                      return (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-full ${stepIdx <= currentIdx ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
