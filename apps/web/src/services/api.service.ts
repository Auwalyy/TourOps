import api from '@/lib/api';
import { ApiResponse, PaginatedResponse } from '@/types';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  me: () => api.get('/auth/me'),
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  archive: (id: string) => api.patch(`/customers/${id}/archive`),
  delete: (id: string) => api.delete(`/customers/${id}`),
  findDuplicates: (email: string, phone: string) => api.get('/customers/duplicates', { params: { email, phone } }),
  merge: (primaryId: string, secondaryId: string) => api.post('/customers/merge', { primaryId, secondaryId }),
};

// ─── Bookings ────────────────────────────────────────────────────────────────
export const bookingsApi = {
  list: (params?: Record<string, unknown>) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: Record<string, unknown>) => api.post('/bookings', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/bookings/${id}`, data),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/bookings/${id}/status`, { status, note }),
  delete: (id: string) => api.delete(`/bookings/${id}`),
};

// ─── Visas ───────────────────────────────────────────────────────────────────
export const visasApi = {
  list: (params?: Record<string, unknown>) => api.get('/visas', { params }),
  getById: (id: string) => api.get(`/visas/${id}`),
  create: (data: Record<string, unknown>) => api.post('/visas', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/visas/${id}`, data),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/visas/${id}/status`, { status, note }),
  assignOfficer: (id: string, officerId: string) => api.patch(`/visas/${id}/assign`, { officerId }),
  scheduleAppointment: (id: string, data: Record<string, unknown>) =>
    api.patch(`/visas/${id}/appointment`, data),
  getUpcomingAppointments: () => api.get('/visas/appointments/upcoming'),
  delete: (id: string) => api.delete(`/visas/${id}`),
};

// ─── Packages ────────────────────────────────────────────────────────────────
export const packagesApi = {
  list: (params?: Record<string, unknown>) => api.get('/packages', { params }),
  getById: (id: string) => api.get(`/packages/${id}`),
  create: (data: Record<string, unknown>) => api.post('/packages', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/packages/${id}`, data),
  delete: (id: string) => api.delete(`/packages/${id}`),
};

// ─── Invoices ────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params?: Record<string, unknown>) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => api.post('/invoices', data),
  recordPayment: (id: string, data: Record<string, unknown>) => api.post(`/invoices/${id}/payments`, data),
  downloadPDF: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  getFinancialSummary: () => api.get('/invoices/summary'),
};

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/documents', { params }),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (formData: FormData) =>
    api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadForTravelFile: (travelFileId: string, formData: FormData) => {
    formData.append('travelFileId', travelFileId);
    return api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadVersion: (id: string, formData: FormData) =>
    api.post(`/documents/${id}/version`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/documents/${id}`),
  getExpiringSoon: (days?: number) => api.get('/documents/expiring', { params: { days } }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getRevenueChart: (year?: number) => api.get('/dashboard/revenue-chart', { params: { year } }),
  getUpcomingAppointments: () => api.get('/dashboard/upcoming-appointments'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  listStaff: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  invite: (data: Record<string, unknown>) => api.post('/users/invite', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.patch(`/users/${id}/deactivate`),
  updateProfile: (data: Record<string, unknown>) => api.put('/users/profile', data),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  getRevenue: (params?: Record<string, unknown>) => api.get('/reports/revenue', { params }),
  getBookings: (params?: Record<string, unknown>) => api.get('/reports/bookings', { params }),
  getOutstanding: () => api.get('/reports/outstanding'),
  exportInvoicesCSV: (params?: Record<string, unknown>) =>
    api.get('/reports/export/invoices', { params, responseType: 'blob' }),
  exportBookingsCSV: (params?: Record<string, unknown>) =>
    api.get('/reports/export/bookings', { params, responseType: 'blob' }),
};

// ─── Public Portal ───────────────────────────────────────────────────────────
export const portalApi = {
  trackFile: (fileNumber: string) => api.get(`/portal/track/${fileNumber}`),
};

export const aiApi = {
  extractPassport: (formData: FormData) =>
    api.post('/ai/passport/extract', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  validateDocument: (id: string) => api.post(`/ai/documents/${id}/validate`),
  detectMissingDocuments: (data: Record<string, unknown>) => api.post('/ai/documents/missing', data),
  getBusinessSummary: () => api.get('/ai/reports/summary'),
  getPackageRecommendations: (data: Record<string, unknown>) =>
    api.post('/ai/recommendations/packages', data),
  getSimilarPackages: (id: string) => api.get(`/ai/recommendations/similar/${id}`),
};

// ─── Travel Files ─────────────────────────────────────────────────────────────
export const travelFilesApi = {
  list: (params?: Record<string, unknown>) => api.get('/travel-files', { params }),
  getById: (id: string) => api.get(`/travel-files/${id}`),
  create: (data: Record<string, unknown>) => api.post('/travel-files', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/travel-files/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/travel-files/${id}/status`, { status, reason }),
  addTask: (id: string, data: Record<string, unknown>) => api.post(`/travel-files/${id}/tasks`, data),
  updateTask: (id: string, taskId: string, data: Record<string, unknown>) =>
    api.patch(`/travel-files/${id}/tasks/${taskId}`, data),
  addPayment: (id: string, data: Record<string, unknown>) => api.post(`/travel-files/${id}/payments`, data),
  addNote: (id: string, content: string, visibility?: 'internal' | 'shared') =>
    api.post(`/travel-files/${id}/notes`, { content, visibility }),
  linkDocument: (id: string, documentId: string) => api.post(`/travel-files/${id}/documents`, { documentId }),
  linkInvoice: (id: string, invoiceId: string) => api.post(`/travel-files/${id}/invoices`, { invoiceId }),
  updatePhysicalFile: (id: string, data: Record<string, unknown>) =>
    api.patch(`/travel-files/${id}/physical-file`, data),
  getHealth: (id: string) => api.get(`/travel-files/${id}/health`),
  statusSummary: () => api.get('/travel-files/summary'),
  attentionRequired: () => api.get('/travel-files/attention'),
  delete: (id: string) => api.delete(`/travel-files/${id}`),
};
