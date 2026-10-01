'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileDown, ReceiptText } from 'lucide-react';
import { receiptsApi } from '@/services/api.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Receipts raised against this travel file.
 *
 * These are issued automatically the moment a payment is verified, so a
 * customer never has to ask — this panel is where staff find one to send on.
 */
export function FileReceipts({ travelFileId }: { travelFileId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['receipts', { travelFileId }],
    queryFn: () => receiptsApi.list({ travelFileId, limit: 50 }).then((r) => r.data.data),
  });

  const download = useMutation({
    mutationFn: async (receipt: { _id: string; receiptNumber: string }) => {
      const res = await receiptsApi.downloadPDF(receipt._id);
      return { blob: res.data, name: receipt.receiptNumber };
    },
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error('Could not download that receipt'),
  });

  const receipts = (data || []) as Array<{
    _id: string;
    receiptNumber: string;
    amount: number;
    paidAt: string;
    method: string;
    description?: string;
  }>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipts ({receipts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : !receipts.length ? (
          <div className="py-6 text-center">
            <ReceiptText className="mx-auto mb-2 h-7 w-7 text-neutral-300" strokeWidth={1.5} />
            <p className="text-sm text-neutral-500">No receipts yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-neutral-400">
              One is raised automatically each time a payment on this file is verified.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-50">
            {receipts.map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-blue-600">{r.receiptNumber}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(r.paidAt)} · {r.method.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-green-600">+{formatCurrency(r.amount)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={download.isPending}
                    onClick={() => download.mutate(r)}
                  >
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
