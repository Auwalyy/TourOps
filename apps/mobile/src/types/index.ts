/** Mirrors the shapes the API returns. Kept deliberately narrow — only what
 *  the mobile screens read. */

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  role:
    | 'agency_owner'
    | 'system_admin'
    | 'travel_consultant'
    | 'visa_officer'
    | 'finance_officer'
    | 'customer_support'
    | 'customer';
  agencyId?: string;
}

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  passport?: { number?: string; expiryDate?: string };
  createdAt: string;
}

export interface TravelFile {
  _id: string;
  fileNumber: string;
  title?: string;
  status: string;
  customerId?: Customer | string;
  totalCost?: number;
  amountPaid?: number;
  departureDate?: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  bookingType: string;
  status: string;
  provider?: string;
  cost: number;
  currency?: string;
  amountPaid?: number;
  startDate?: string;
  customerId?: Customer | string;
  travelFileId?: { fileNumber?: string } | string;
}

export interface VisaApplication {
  _id: string;
  referenceNumber?: string;
  visaNumber?: string;
  destinationCountry?: string;
  visaType?: string;
  status: string;
  fees?: number;
  amountPaid?: number;
  dueDate?: string;
  customerId?: Customer | string;
}

export type IssuanceType = 'visa' | 'ticket' | 'other';

export interface VisaGroup {
  _id: string;
  groupNumber: string;
  name: string;
  partnerCompany?: string;
  destination?: string;
  travelDate?: string;
  notes?: string;
  status: 'open' | 'closed';
  entryCount?: number;
  entries?: VisaIssuance[];
}

export interface VisaIssuance {
  _id: string;
  groupId?: string;
  type: IssuanceType;
  travellerName: string;
  passportNumber: string;
  documentNumber?: string;
  purpose?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  notes?: string;
}

export interface DashboardKPIs {
  totalCustomers: number;
  activeBookings: number;
  pendingVisas: number;
  totalRevenue?: number;
  totalOutstanding?: number;
}

export interface Entitlements {
  maxUsers: number;
  packages: boolean;
  groups: boolean;
  reports: boolean;
  portal: boolean;
  branches: boolean;
  refunds: boolean;
  ai: boolean;
}

export type AccessState = 'trialing' | 'active' | 'grace' | 'locked' | 'suspended';

export interface SubscriptionStatus {
  state: AccessState;
  canWrite: boolean;
  plan: string;
  daysLeft: number;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  graceEndsAt?: string;
  entitlements?: Entitlements;
}

export interface Paginated<T> {
  data: T[];
  pagination?: { total: number; page: number; limit: number };
}
