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
  ],
  visa_officer: [
    'customers:read',
    'visas:read', 'visas:write',
    'documents:read', 'documents:write',
  ],
  finance_officer: [
    'payments:read', 'payments:write',
    'reports:read',
    'bookings:read',
    'customers:read',
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
