export type UserRole =
  | 'agency_owner'
  | 'system_admin'
  | 'travel_consultant'
  | 'visa_officer'
  | 'finance_officer'
  | 'customer_support'
  | 'customer';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: UserRole;
  agencyId?: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Agency {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  logo?: string;
  subscription: { plan: string; status: string; expiresAt?: string };
  settings: { currency: string; timezone: string; dateFormat: string };
}

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  nationality?: string;
  gender?: string;
  dateOfBirth?: string;
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  notes: string;
  passport?: { number?: string; expiryDate?: string; issuedCountry?: string };
  address?: { city?: string; country?: string };
  assignedTo?: User;
  createdAt: string;
}

export type BookingStatus = 'enquiry' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';

export interface Booking {
  _id: string;
  referenceNumber: string;
  customerId: Customer | string;
  packageId?: TourPackage | string;
  assignedTo?: User;
  bookingType: 'package' | 'visa' | 'custom';
  status: BookingStatus;
  statusHistory: Array<{ status: BookingStatus; changedAt: string; note?: string }>;
  travelDate?: string;
  returnDate?: string;
  numberOfTravelers: number;
  totalAmount: number;
  currency: string;
  notes: string;
  createdAt: string;
}

export type VisaStatus =
  | 'draft'
  | 'documents_pending'
  | 'documents_submitted'
  | 'appointment_scheduled'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface VisaApplication {
  _id: string;
  customerId: Customer | string;
  assignedOfficer?: User;
  visaType: string;
  destinationCountry: string;
  purposeOfTravel: string;
  status: VisaStatus;
  statusHistory: Array<{ status: VisaStatus; changedAt: string; note?: string }>;
  appointment?: { date?: string; time?: string; location?: string; confirmationNumber?: string };
  embassy?: { name?: string; address?: string };
  dueDate?: string;
  fees?: number;
  referenceNumber?: string;
  notes: string;
  createdAt: string;
}

export interface TourPackage {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: 'tour' | 'hajj_umrah' | 'study_abroad' | 'visa' | 'custom';
  destinations: string[];
  duration: { days: number; nights: number };
  pricing: { basePrice: number; currency: string; pricePerPerson: boolean; discountedPrice?: number };
  inclusions: string[];
  exclusions: string[];
  itinerary: Array<{ day: number; title: string; description: string; activities: string[] }>;
  gallery: string[];
  coverImage?: string;
  availability: { maxCapacity?: number; currentBookings: number; startDate?: string; endDate?: string };
  status: 'draft' | 'active' | 'inactive' | 'archived';
  tags: string[];
  createdAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerId: Customer | string;
  bookingId?: Booking | string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  currency: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  dueDate?: string;
  payments: Array<{ amount: number; method: string; paidAt: string; reference?: string }>;
  notes?: string;
  issuedAt: string;
  createdAt: string;
}

export interface Document {
  _id: string;
  name: string;
  originalName: string;
  category: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  expiryDate?: string;
  isExpired: boolean;
  version: number;
  customerId?: Customer | string;
  uploadedBy: User | string;
  aiValidation?: { isValid?: boolean; issues?: string[]; suggestions?: string[]; processedAt?: string };
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'booking' | 'visa' | 'payment' | 'appointment' | 'document' | 'system';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type TravelType = 'umrah' | 'hajj' | 'study_abroad' | 'tourist_visa' | 'business' | 'medical';

export type TravelFileStatus =
  | 'open'
  | 'pending_payment'
  | 'awaiting_documents'
  | 'visa_processing'
  | 'ready_for_departure'
  | 'completed'
  | 'cancelled';

export interface TravelFileTask {
  _id: string;
  title: string;
  assignedTo?: User | string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done';
  notes?: string;
  createdAt: string;
}

export interface TravelFileNote {
  _id: string;
  content: string;
  createdBy: User | string;
  createdAt: string;
}

export interface TravelFileTimeline {
  _id: string;
  action: string;
  description: string;
  performedBy: User | string;
  performedAt: string;
}

export interface TravelFile {
  _id: string;
  fileNumber: string;
  customerId: Customer | string;
  travelType: TravelType;
  packageId?: TourPackage | string;
  bookingId?: Booking | string;
  visaApplicationId?: VisaApplication | string;
  destination: string;
  departureGroup?: string;
  assignedConsultant?: User | string;
  assignedVisaOfficer?: User | string;
  status: TravelFileStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeline: TravelFileTimeline[];
  tasks: TravelFileTask[];
  notes: TravelFileNote[];
  invoiceIds: Invoice[];
  documentIds: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DashboardKPIs {
  totalCustomers: number;
  activeBookings: number;
  pendingVisas: number;
  totalRevenue: number;
  totalOutstanding: number;
  bookingStatusCounts: Array<{ _id: string; count: number }>;
  visaStatusCounts: Array<{ _id: string; count: number }>;
}
