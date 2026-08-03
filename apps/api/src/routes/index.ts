import { Express } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import bookingRoutes from './booking.routes';
import visaRoutes from './visa.routes';
import packageRoutes from './package.routes';
import invoiceRoutes from './invoice.routes';
import documentRoutes from './document.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './user.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';
import aiRoutes from './ai.routes';

export function registerRoutes(app: Express): void {
  const API = '/api/v1';

  app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use(`${API}/auth`, authRoutes);
  app.use(`${API}/customers`, customerRoutes);
  app.use(`${API}/bookings`, bookingRoutes);
  app.use(`${API}/visas`, visaRoutes);
  app.use(`${API}/packages`, packageRoutes);
  app.use(`${API}/invoices`, invoiceRoutes);
  app.use(`${API}/documents`, documentRoutes);
  app.use(`${API}/dashboard`, dashboardRoutes);
  app.use(`${API}/users`, userRoutes);
  app.use(`${API}/notifications`, notificationRoutes);
  app.use(`${API}/reports`, reportRoutes);
  app.use(`${API}/ai`, aiRoutes);
}
