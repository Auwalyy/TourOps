import api from '@/lib/api';

/** Mirrors apps/web/src/services/api.service.ts so call sites look the same
 *  in both apps. Only the endpoints the mobile screens use are listed. */

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const dashboardApi = {
  kpis: () => api.get('/dashboard/kpis'),
  recentActivity: () => api.get('/dashboard/activity'),
};

export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
};

export const travelFilesApi = {
  list: (params?: Record<string, unknown>) => api.get('/travel-files', { params }),
  getById: (id: string) => api.get(`/travel-files/${id}`),
  getBookings: (id: string) => api.get(`/travel-files/${id}/bookings`),
  listPayments: (id: string) => api.get(`/travel-files/${id}/payments`),
  addPayment: (id: string, data: Record<string, unknown>) =>
    api.post(`/travel-files/${id}/payments`, data),
};

export const bookingsApi = {
  list: (params?: Record<string, unknown>) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
};

export const visasApi = {
  list: (params?: Record<string, unknown>) => api.get('/visas', { params }),
  getById: (id: string) => api.get(`/visas/${id}`),
};

export const issuedVisasApi = {
  list: (params?: Record<string, unknown>) => api.get('/issued-visas', { params }),
  /** FormData: the file part must be { uri, name, type }, not a browser File. */
  create: (data: FormData) => api.post('/issued-visas', data, { headers: formDataHeaders }),
  update: (id: string, data: FormData) =>
    api.put(`/issued-visas/${id}`, data, { headers: formDataHeaders }),
  remove: (id: string) => api.delete(`/issued-visas/${id}`),
  groups: {
    list: (params?: Record<string, unknown>) => api.get('/issued-visas/groups', { params }),
    getById: (id: string) => api.get(`/issued-visas/groups/${id}`),
    create: (data: Record<string, unknown>) => api.post('/issued-visas/groups', data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/issued-visas/groups/${id}`, data),
  },
};

export const paymentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/payments', { params }),
  record: (data: Record<string, unknown>) => api.post('/payments', data),
  verify: (id: string) => api.patch(`/payments/${id}/verify`),
};

export const subscriptionApi = {
  status: () => api.get('/subscription'),
};

/** Let the platform set the multipart boundary itself. */
const formDataHeaders = { 'Content-Type': 'multipart/form-data' };
