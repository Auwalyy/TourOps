'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { reportsApi } from '@/services/api.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const { data: revenueData } = useQuery({
    queryKey: ['reports', 'revenue', startDate, endDate],
    queryFn: () => reportsApi.getRevenue({ startDate, endDate }).then((r) => r.data.data),
  });

  const { data: bookingData } = useQuery({
    queryKey: ['reports', 'bookings', startDate, endDate],
    queryFn: () => reportsApi.getBookings({ startDate, endDate }).then((r) => r.data.data),
  });

  const { data: outstanding } = useQuery({
    queryKey: ['reports', 'outstanding'],
    queryFn: () => reportsApi.getOutstanding().then((r) => r.data.data),
  });

  const chartData = MONTHS.map((month, i) => {
    const found = revenueData?.find((d: any) => d._id === `${currentYear}-${String(i + 1).padStart(2, '0')}`);
    return { month, revenue: found?.revenue || 0, outstanding: found?.outstanding || 0 };
  });

  async function exportCSV(type: 'invoices' | 'bookings') {
    try {
      const res = type === 'invoices'
        ? await reportsApi.exportInvoicesCSV({ startDate, endDate })
        : await reportsApi.exportBookingsCSV({ startDate, endDate });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${type}-${startDate}-${endDate}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Revenue, bookings, and outstanding balance reports"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV('invoices')}>
              <Download className="h-4 w-4" /> Invoices CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV('bookings')}>
              <Download className="h-4 w-4" /> Bookings CSV
            </Button>
          </div>
        }
      />

      {/* Date Range */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
        </div>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle>Monthly Revenue vs Outstanding</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#2563eb" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Booking Status Breakdown */}
        <Card>
          <CardHeader><CardTitle>Bookings by Status</CardTitle></CardHeader>
          <CardContent>
            {!bookingData?.length ? (
              <p className="text-sm text-gray-400">No data for selected period</p>
            ) : (
              <ul className="space-y-3">
                {bookingData.map((item: any) => (
                  <li key={item._id} className="flex items-center justify-between">
                    <StatusBadge status={item._id} />
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.count} bookings</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.totalValue || 0)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card>
          <CardHeader><CardTitle>Outstanding Invoices</CardTitle></CardHeader>
          <CardContent>
            {!outstanding?.length ? (
              <p className="text-sm text-gray-400">No outstanding invoices</p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {outstanding.slice(0, 8).map((inv: any) => {
                  const customer = inv.customerId as any;
                  return (
                    <li key={inv._id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer?.fullName || '—'}</p>
                        <p className="text-xs text-gray-500">{inv.invoiceNumber} · Due {inv.dueDate ? formatDate(inv.dueDate) : 'N/A'}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(inv.outstandingBalance, inv.currency)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
