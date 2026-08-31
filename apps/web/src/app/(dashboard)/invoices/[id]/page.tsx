'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { invoicesApi } from '@/services/api.service';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useState } from 'react';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.getById(id).then((r) => r.data.data),
  });

  const paymentMutation = useMutation({
    mutationFn: () => invoicesApi.recordPayment(id, { amount: Number(payAmount), method: payMethod, reference: payRef || undefined, paidAt: new Date().toISOString() }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      setPayAmount(''); setPayRef('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  async function downloadPDF() {
    try {
      const res = await invoicesApi.downloadPDF(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `invoice-${invoice?.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!invoice) return <p className="text-gray-500">Invoice not found.</p>;

  const customer = invoice.customerId as any;
  const lineItems = invoice.lineItems ?? [];
  const payments = invoice.payments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <Button variant="outline" onClick={downloadPDF}><Download className="h-4 w-4" /> PDF</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Customer" value={customer?.fullName || '—'} />
                <Detail label="Issued" value={formatDate(invoice.issuedAt)} />
                <Detail label="Due Date" value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'} />
                <Detail label="Currency" value={invoice.currency} />
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-500">Unit Price</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: { description: string; quantity: number; unitPrice: number; total: number }, i: number) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="py-2 text-right">{formatCurrency(item.total, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-sm">
                <Row label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
                {invoice.tax > 0 && <Row label={`Tax (${invoice.taxRate}%)`} value={formatCurrency(invoice.tax, invoice.currency)} />}
                {invoice.discount > 0 && <Row label="Discount" value={`-${formatCurrency(invoice.discount, invoice.currency)}`} />}
                <Row label="Total" value={formatCurrency(invoice.totalAmount, invoice.currency)} bold />
                <Row label="Amount Paid" value={formatCurrency(invoice.amountPaid, invoice.currency)} color="text-green-600" />
                <Row label="Outstanding" value={formatCurrency(invoice.outstandingBalance, invoice.currency)} color="text-red-600" bold />
              </div>
            </CardContent>
          </Card>

          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {payments.map((p: { amount: number; method: string; reference?: string; paidAt: string }, i: number) => (
                    <li key={i} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(p.amount, invoice.currency)}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.method.replace(/_/g, ' ')} {p.reference ? `· ${p.reference}` : ''}</p>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(p.paidAt)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {invoice.outstandingBalance > 0 && (
          <Card className="h-fit">
            <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Amount</Label>
                <Input type="number" min={0} max={invoice.outstandingBalance} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={`Max: ${invoice.outstandingBalance}`} />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Transaction ref" />
              </div>
              <Button className="w-full" disabled={!payAmount || Number(payAmount) <= 0} loading={paymentMutation.isPending} onClick={() => paymentMutation.mutate()}>
                Record Payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500">{label}</p><p className="font-medium text-gray-900 dark:text-gray-100">{value}</p></div>;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${color || 'text-gray-900 dark:text-gray-100'}`}>{value}</span>
    </div>
  );
}
