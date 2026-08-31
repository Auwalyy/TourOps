import { Badge } from './Card';

const statusMap: Record<string, { label: string; variant: string }> = {
  // Booking
  enquiry: { label: 'Enquiry', variant: 'default' },
  quoted: { label: 'Quoted', variant: 'blue' },
  confirmed: { label: 'Confirmed', variant: 'green' },
  in_progress: { label: 'In Progress', variant: 'purple' },
  completed: { label: 'Completed', variant: 'green' },
  cancelled: { label: 'Cancelled', variant: 'red' },
  refunded: { label: 'Refunded', variant: 'orange' },
  // Visa
  draft: { label: 'Draft', variant: 'default' },
  documents_pending: { label: 'Docs Pending', variant: 'yellow' },
  documents_submitted: { label: 'Docs Submitted', variant: 'blue' },
  appointment_scheduled: { label: 'Appointment', variant: 'purple' },
  under_review: { label: 'Under Review', variant: 'orange' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
  // Invoice
  sent: { label: 'Sent', variant: 'blue' },
  partially_paid: { label: 'Partial', variant: 'yellow' },
  paid: { label: 'Paid', variant: 'green' },
  overdue: { label: 'Overdue', variant: 'red' },
  // Travel File
  open: { label: 'Open', variant: 'blue' },
  pending_payment: { label: 'Pending Payment', variant: 'yellow' },
  awaiting_documents: { label: 'Awaiting Docs', variant: 'orange' },
  visa_processing: { label: 'Visa Processing', variant: 'purple' },
  ready_for_departure: { label: 'Ready to Depart', variant: 'green' },
  // Customer
  active: { label: 'Active', variant: 'green' },
  inactive: { label: 'Inactive', variant: 'default' },
  archived: { label: 'Archived', variant: 'default' },
  // Package
  'active-pkg': { label: 'Active', variant: 'green' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
