'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Trash2, User, CreditCard, FileText, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { receiptsApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useState } from 'react';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', card: 'Card',
  mobile_money: 'Mobile Money', other: 'Other',
};

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipts', id],
    queryFn: () => receiptsApi.getById(id).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => receiptsApi.delete(id),
    onSuccess: () => { toast.success('Receipt deleted'); router.push('/receipts'); },
    onError: () => toast.error('Failed to delete receipt'),
  });

  async function downloadPDF() {
    try {
      const res = await receiptsApi.downloadPDF(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${receipt?.receiptNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!receipt) return <p className="text-neutral-500">Receipt not found.</p>;

  const customer = receipt.customerId as any;
  const issuedBy = receipt.issuedBy as any;
  const invoice = receipt.invoiceId as any;
  const travelFile = receipt.travelFileId as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{receipt.receiptNumber}</h1>
          <p className="text-sm text-neutral-500">{formatDate(receipt.paidAt)}</p>
        </div>
        <Button variant="outline" onClick={downloadPDF}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Big amount card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">Amount Received</p>
        <p className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {formatCurrency(receipt.amount, receipt.currency)}
        </p>
        <p className="mt-2 text-sm capitalize text-neutral-500">{METHOD_LABELS[receipt.method] || receipt.method}</p>
        {receipt.reference && <p className="mt-1 text-xs text-neutral-400">Ref: {receipt.reference}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <CardTitle>Customer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Detail label="Name" value={customer?.fullName || `${customer?.firstName} ${customer?.lastName}`} />
            {customer?.email && <Detail label="Email" value={customer.email} />}
            {customer?.phone && <Detail label="Phone" value={customer.phone} />}
          </CardContent>
        </Card>

        {/* Payment details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <CardTitle>Payment Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Detail label="Receipt #" value={receipt.receiptNumber} />
            <Detail label="Amount" value={formatCurrency(receipt.amount, receipt.currency)} />
            <Detail label="Method" value={METHOD_LABELS[receipt.method] || receipt.method} />
            {receipt.reference && <Detail label="Reference" value={receipt.reference} />}
            <Detail label="Date" value={formatDate(receipt.paidAt)} />
            {issuedBy && <Detail label="Issued By" value={`${issuedBy.firstName} ${issuedBy.lastName}`} />}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{receipt.description}</p>
            {receipt.notes && (
              <div className="mt-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 mb-1">Notes</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{receipt.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked records */}
        {(invoice || travelFile) && (
          <Card>
            <CardHeader><CardTitle>Linked Records</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {invoice && (
                <div className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400">Invoice</p>
                    <p className="font-mono text-sm font-bold text-blue-600">{invoice.invoiceNumber}</p>
                  </div>
                </div>
              )}
              {travelFile && (
                <div className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
                  <FolderKanban className="h-4 w-4 text-neutral-500 shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400">Travel File</p>
                    <p className="font-mono text-sm font-bold text-neutral-600">{travelFile.fileNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Receipt"
        description={`Permanently delete receipt ${receipt.receiptNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-400 shrink-0">{label}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-100 text-right">{value}</span>
    </div>
  );
}
