export type UserRole =
  | 'agency_owner'
  | 'system_admin'
  | 'travel_consultant'
  | 'visa_officer'
  | 'finance_officer'
  | 'customer_support'
  | 'customer';

export type Permission =
  | 'customers:read'
  | 'customers:write'
  | 'customers:delete'
  | 'visas:read'
  | 'visas:write'
  | 'visas:delete'
  | 'bookings:read'
  | 'bookings:write'
  | 'bookings:delete'
  | 'packages:read'
  | 'packages:write'
  | 'packages:delete'
  | 'payments:read'
  | 'payments:write'
  | 'payments:delete'
  | 'refunds:read'
  | 'refunds:write'
  | 'refunds:approve'
  | 'branches:read'
  | 'branches:write'
  | 'reports:read'
  | 'documents:read'
  | 'documents:write'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'settings:read'
  | 'settings:write';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  agency_owner: [
    'customers:read', 'customers:write', 'customers:delete',
    'visas:read', 'visas:write', 'visas:delete',
    'bookings:read', 'bookings:write', 'bookings:delete',
    'packages:read', 'packages:write', 'packages:delete',
    'payments:read', 'payments:write', 'payments:delete',
    'refunds:read', 'refunds:write', 'refunds:approve',
    'branches:read', 'branches:write',
    'reports:read', 'documents:read', 'documents:write',
    'users:read', 'users:write', 'users:delete',
    'settings:read', 'settings:write',
  ],
  system_admin: [
    'customers:read', 'customers:write', 'customers:delete',
    'visas:read', 'visas:write', 'visas:delete',
    'bookings:read', 'bookings:write', 'bookings:delete',
    'packages:read', 'packages:write', 'packages:delete',
    'payments:read', 'payments:write', 'payments:delete',
    'refunds:read', 'refunds:write', 'refunds:approve',
    'branches:read', 'branches:write',
    'reports:read', 'documents:read', 'documents:write',
    'users:read', 'users:write', 'users:delete',
    'settings:read', 'settings:write',
  ],
  travel_consultant: [
    'customers:read', 'customers:write',
    'bookings:read', 'bookings:write',
    'packages:read',
    'documents:read', 'documents:write',
    'visas:read',
    'branches:read',
  ],
  visa_officer: [
    'customers:read',
    'visas:read', 'visas:write',
    'documents:read', 'documents:write',
  ],
  // Can record, verify and request — but approving a payout stays with the
  // owner, so no one person can both raise and release a refund.
  finance_officer: [
    'payments:read', 'payments:write',
    'refunds:read', 'refunds:write',
    'reports:read',
    'bookings:read',
    'customers:read',
    'branches:read',
  ],
  customer_support: [
    'customers:read', 'customers:write',
    'bookings:read',
    'visas:read',
    'documents:read',
  ],
  customer: [
    'bookings:read',
    'visas:read',
    'documents:read', 'documents:write',
    'payments:read',
  ],
};
