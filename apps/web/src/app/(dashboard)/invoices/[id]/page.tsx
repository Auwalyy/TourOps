'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { invoicesApi, refundsApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
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
  const [showRefund, setShowRefund] = useState(false);
  const [refund, setRefund] = useState({ amount: '', reason: '', method: 'bank_transfer' });

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.getById(id).then((r) => r.data.data),
  });

  const { data: payments } = useQuery({
    queryKey: ['invoices', id, 'payments'],
    queryFn: () => invoicesApi.listPayments(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: () => invoicesApi.recordPayment(id, { amount: Number(payAmount), method: payMethod, reference: payRef || undefined, paidAt: new Date().toISOString() }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      qc.invalidateQueries({ queryKey: ['invoices', id, 'payments'] });
      setPayAmount(''); setPayRef('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const { data: refunds } = useQuery({
    queryKey: ['refunds', { invoiceId: id }],
    queryFn: () => refundsApi.list({ invoiceId: id }).then((r) => r.data.data),
    enabled: !!id,
  });

  const refundMutation = useMutation({
    mutationFn: () => refundsApi.request({
      invoiceId: id,
      amount: Number(refund.amount),
      reason: refund.reason,
      method: refund.method,
    }),
    onSuccess: () => {
      toast.success('Refund requested — awaiting approval');
      setShowRefund(false);
      setRefund({ amount: '', reason: '', method: 'bank_transfer' });
      qc.invalidateQueries({ queryKey: ['refunds'] });
      qc.invalidateQueries({ queryKey: ['invoices', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to request refund'),
  });

  const refundActionMutation = useMutation({
    mutationFn: ({ refundId, action, value }: { refundId: string; action: 'approve' | 'reject' | 'complete'; value?: string }) =>
      action === 'approve'
        ? refundsApi.approve(refundId)
        : action === 'reject'
        ? refundsApi.reject(refundId, value || 'Rejected')
        : refundsApi.complete(refundId, value),
    onSuccess: () => {
      toast.success('Refund updated');
      qc.invalidateQueries({ queryKey: ['refunds'] });
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      qc.invalidateQueries({ queryKey: ['invoices', id, 'payments'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update refund'),
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

  async function downloadReceipt(paymentId?: string) {
    try {
      const res = await invoicesApi.downloadReceipt(id, paymentId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `receipt-${invoice?.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download receipt'); }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!invoice) return <p className="text-neutral-500">Invoice not found.</p>;

  const customer = invoice.customerId as any;
  const lineItems = invoice.lineItems ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{invoice.invoiceNumber}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <Button variant="outline" onClick={downloadPDF}><Download className="h-4 w-4" /> Invoice PDF</Button>
        {invoice.amountPaid > 0 && (
          <>
            <Button variant="outline" onClick={() => downloadReceipt()}><Receipt className="h-4 w-4" /> Receipt PDF</Button>
            <Button variant="outline" onClick={() => setShowRefund(true)}>
              <RotateCcw className="h-4 w-4" /> Refund
            </Button>
          </>
        )}
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
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="py-2 text-left text-xs font-semibold text-neutral-500">Description</th>
                    <th className="py-2 text-right text-xs font-semibold text-neutral-500">Qty</th>
                    <th className="py-2 text-right text-xs font-semibold text-neutral-500">Unit Price</th>
                    <th className="py-2 text-right text-xs font-semibold text-neutral-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: { description: string; quantity: number; unitPrice: number; total: number }, i: number) => (
                    <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800">
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

          {payments && payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-neutral-50 dark:divide-neutral-800">
                  {payments.map((p: any) => (
                    <li key={p._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${p.status === 'rejected' ? 'text-neutral-400 line-through' : 'text-neutral-900 dark:text-neutral-100'}`}>
                            {formatCurrency(p.amount, invoice.currency)}
                          </p>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-neutral-500 capitalize">{p.method.replace(/_/g, ' ')} {p.reference ? `· ${p.reference}` : ''}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {p.status === 'verified' && (
                          <button
                            onClick={() => downloadReceipt(p._id)}
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
                          >
                            Receipt
                          </button>
                        )}
                        <span className="text-xs text-neutral-400">{formatDate(p.paidAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {refunds && refunds.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Refunds</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-neutral-50 dark:divide-neutral-800">
                  {refunds.map((r: any) => (
                    <li key={r._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {formatCurrency(r.amount, invoice.currency)}
                          </p>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-neutral-500">{r.reason}</p>
                        <p className="text-xs text-neutral-400">
                          Requested {formatDate(r.createdAt)}
                          {r.approvedBy && ` · Approved by ${r.approvedBy.firstName} ${r.approvedBy.lastName}`}
                          {r.reference && ` · Ref: ${r.reference}`}
                        </p>
                        {r.rejectionReason && <p className="text-xs text-red-500">Rejected: {r.rejectionReason}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {r.status === 'requested' && (
                          <>
                            <Button size="sm" onClick={() => refundActionMutation.mutate({ refundId: r._id, action: 'approve' })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              const reason = window.prompt('Why is this refund being rejected?');
                              if (reason?.trim()) refundActionMutation.mutate({ refundId: r._id, action: 'reject', value: reason.trim() });
                            }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <Button size="sm" onClick={() => {
                            const ref = window.prompt('Payout reference (optional)') || undefined;
                            refundActionMutation.mutate({ refundId: r._id, action: 'complete', value: ref });
                          }}>
                            Mark Paid Out
                          </Button>
                        )}
                      </div>
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

      <Modal open={showRefund} onClose={() => setShowRefund(false)} title="Request Refund" size="sm">
        <div className="space-y-4 p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatCurrency(invoice.amountPaid, invoice.currency)} has been received on this invoice
            {invoice.totalRefunded ? `, ${formatCurrency(invoice.totalRefunded, invoice.currency)} already refunded` : ''}.
            A refund must be approved before it can be paid out.
          </p>
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              min={0}
              max={invoice.amountPaid}
              value={refund.amount}
              onChange={(e) => setRefund((r) => ({ ...r, amount: e.target.value }))}
              placeholder={`Max: ${invoice.amountPaid}`}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={refund.method} onChange={(e) => setRefund((r) => ({ ...r, method: e.target.value }))}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Visa rejected, customer cancelled the trip"
              value={refund.reason}
              onChange={(e) => setRefund((r) => ({ ...r, reason: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRefund(false)}>Cancel</Button>
            <Button
              disabled={!Number(refund.amount) || !refund.reason.trim()}
              loading={refundMutation.isPending}
              onClick={() => refundMutation.mutate()}
            >
              Request Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-neutral-500">{label}</p><p className="font-medium text-neutral-900 dark:text-neutral-100">{value}</p></div>;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${color || 'text-neutral-900 dark:text-neutral-100'}`}>{value}</span>
    </div>
  );
}
