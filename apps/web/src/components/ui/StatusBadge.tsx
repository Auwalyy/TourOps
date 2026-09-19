import { Badge } from './Card';

/**
 * Statuses map onto five meanings, not seven decorative colours:
 *   default — not started / archived      accent  — in progress
 *   green   — done / money in             yellow  — waiting on someone
 *   red     — failed / overdue
 * Anything unmapped falls back to neutral rather than inventing a colour.
 */
const statusMap: Record<string, { label: string; variant: string }> = {
  // Not started / dormant
  draft: { label: 'Draft', variant: 'default' },
  inactive: { label: 'Inactive', variant: 'default' },
  archived: { label: 'Archived', variant: 'default' },
  enquiry: { label: 'Enquiry', variant: 'default' },

  // In progress
  reserved: { label: 'Reserved', variant: 'blue' },
  ticketed: { label: 'Ticketed', variant: 'blue' },
  quoted: { label: 'Quoted', variant: 'blue' },
  in_progress: { label: 'In Progress', variant: 'blue' },
  open: { label: 'Open', variant: 'blue' },
  sent: { label: 'Sent', variant: 'blue' },
  documents_submitted: { label: 'Docs Submitted', variant: 'blue' },
  appointment_scheduled: { label: 'Appointment Set', variant: 'blue' },
  under_review: { label: 'Under Review', variant: 'blue' },
  visa_processing: { label: 'Visa Processing', variant: 'blue' },

  // Waiting on someone
  pending: { label: 'Pending', variant: 'yellow' },
  requested: { label: 'Requested', variant: 'yellow' },
  documents_pending: { label: 'Docs Pending', variant: 'yellow' },
  pending_payment: { label: 'Pending Payment', variant: 'yellow' },
  awaiting_documents: { label: 'Awaiting Docs', variant: 'yellow' },
  partially_paid: { label: 'Part-paid', variant: 'yellow' },

  // Done / money in
  confirmed: { label: 'Confirmed', variant: 'green' },
  completed: { label: 'Completed', variant: 'green' },
  approved: { label: 'Approved', variant: 'green' },
  paid: { label: 'Paid', variant: 'green' },
  verified: { label: 'Verified', variant: 'green' },
  active: { label: 'Active', variant: 'green' },
  ready_for_departure: { label: 'Ready to Depart', variant: 'green' },

  // Failed / needs attention
  cancelled: { label: 'Cancelled', variant: 'red' },
  rejected: { label: 'Rejected', variant: 'red' },
  overdue: { label: 'Overdue', variant: 'red' },
  refunded: { label: 'Refunded', variant: 'red' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] || { label: status.replace(/_/g, ' '), variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
