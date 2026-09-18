import { Badge } from './Card';

export type FeePaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'no_fee';

/** Paid/unpaid is derived from the fee and what's actually been received. */
export function getPaymentStatus(item: { fees?: number; amountPaid?: number }): FeePaymentStatus {
  const fees = item.fees || 0;
  const paid = item.amountPaid || 0;
  if (fees <= 0) return 'no_fee';
  if (paid <= 0) return 'unpaid';
  if (paid >= fees) return 'paid';
  return 'partially_paid';
}

const CONFIG: Record<FeePaymentStatus, { label: string; variant: string }> = {
  paid: { label: 'Paid', variant: 'green' },
  partially_paid: { label: 'Part-paid', variant: 'yellow' },
  unpaid: { label: 'Unpaid', variant: 'red' },
  no_fee: { label: 'No fee set', variant: 'default' },
};

export function PaymentStatusBadge({ item }: { item: { fees?: number; amountPaid?: number } }) {
  const { label, variant } = CONFIG[getPaymentStatus(item)];
  return <Badge variant={variant}>{label}</Badge>;
}
