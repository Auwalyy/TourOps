'use client';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { invoicesApi } from '@/services/api.service';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function PortalInvoicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'invoices', 'all'],
    queryFn: () => invoicesApi.list({ limit: 50 }).then((r) => r.data.data),
  });

  async function downloadPDF(id: string, invoiceNumber: string) {
    try {
      const res = await invoicesApi.downloadPDF(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Invoices</h1>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : !data?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-gray-400">No invoices found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((inv: any) => (
            <Card key={inv._id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-mono text-sm font-medium text-blue-600">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">
                    Issued: {formatDate(inv.issuedAt)}
                    {inv.dueDate ? ` · Due: ${formatDate(inv.dueDate)}` : ''}
                  </p>
                  {inv.outstandingBalance > 0 && (
                    <p className="text-xs font-medium text-red-600">
                      Outstanding: {formatCurrency(inv.outstandingBalance, inv.currency)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(inv.totalAmount, inv.currency)}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <button
                    onClick={() => downloadPDF(inv._id, inv.invoiceNumber)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
