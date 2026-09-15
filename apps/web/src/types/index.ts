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

export type BookingType = 'flight' | 'hotel' | 'transport' | 'tour' | 'activity' | 'package' | 'other';

export type BookingStatus = 'draft' | 'pending' | 'reserved' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';

export interface BookingDetails {
  // Flight
  airline?: string;
  flightNumber?: string;
  departureLocation?: string;
  arrivalLocation?: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  returnDepartureDateTime?: string;
  returnArrivalDateTime?: string;
  ticketNumber?: string;
  pnr?: string;
  baggageAllowance?: string;
  seatNumber?: string;
  // Hotel
  hotelName?: string;
  hotelAddress?: string;
  city?: string;
  checkInDate?: string;
  checkOutDate?: string;
  roomType?: string;
  numberOfRooms?: number;
  numberOfNights?: number;
  guestCount?: number;
  // Transport
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDateTime?: string;
  // Tour / Activity
  tourName?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  numberOfParticipants?: number;
  // Shared
  providerName?: string;
  passengerCount?: number;
  bookingReference?: string;
  notes?: string;
}

export interface BookingStatusHistory {
  from: BookingStatus;
  to: BookingStatus;
  reason?: string;
  changedBy: User | string;
  changedAt: string;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  travelFileId: TravelFile | string;
  customerId: Customer | string;
  bookingType: BookingType;
  title: string;
  status: BookingStatus;
  statusHistory: BookingStatusHistory[];
  provider?: string;
  startDate?: string;
  endDate?: string;
  cost: number;
  currency: string;
  tourPackageId?: TourPackage | string;
  details: BookingDetails;
  documents: Array<{ documentId: Document | string; visibleToCustomer: boolean }>;
  createdBy: User | string;
  updatedBy?: User | string;
  createdAt: string;
  updatedAt: string;
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

export type TravelType = 'umrah' | 'hajj' | 'study_abroad' | 'tourist_visa' | 'business' | 'medical' | 'other';

export type TravelFileStatus =
  | 'draft'
  | 'open'
  | 'pending_payment'
  | 'awaiting_documents'
  | 'visa_processing'
  | 'ready_for_departure'
  | 'completed'
  | 'cancelled'
  | 'archived';

export interface TravelFileTask {
  _id: string;
  title: string;
  description?: string;
  assignedTo?: User | string;
  createdBy?: User | string;
  dueDate?: string;
  completedAt?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface TravelFileNote {
  _id: string;
  content: string;
  createdBy: User | string;
  visibility: 'internal' | 'shared';
  createdAt: string;
}

export interface TravelFileTimeline {
  _id: string;
  action: string;
  description: string;
  performedBy: User | string;
  performedAt: string;
  source?: string;
}

export interface PhysicalFile {
  physicalFileNumber?: string;
  cabinetLocation?: string;
  shelfLocation?: string;
  status: 'at_branch' | 'with_visa_officer' | 'sent_for_processing' | 'with_embassy' | 'returned' | 'archived';
  originalPassportReceived: boolean;
  passportReceivedDate?: string;
  passportReceivedBy?: User | string;
  passportReturnedDate?: string;
  passportReturnedBy?: User | string;
  staffResponsible?: User | string;
  notes?: string;
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
  departureDate?: string;
  returnDate?: string;
  departureGroup?: string;
  assignedConsultant?: User | string;
  assignedVisaOfficer?: User | string;
  status: TravelFileStatus;
  statusHistory: Array<{ _id: string; previousStatus: string; newStatus: string; changedBy: User | string; changedAt: string; reason?: string }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeline: TravelFileTimeline[];
  tasks: TravelFileTask[];
  notes: TravelFileNote[];
  physicalFile: PhysicalFile;
  totalCost: number;
  amountPaid: number;
  balance: number;
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
