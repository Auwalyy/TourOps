import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { dashboardService } from '../dashboard.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

function getGemini() {
  const key = (config as any).gemini?.apiKey || '';
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: config.gemini.model });
}

export const aiReportingService = {
  async generateBusinessSummary(agencyId: string): Promise<string> {
    try {
      const kpis = await dashboardService.getKPIs(agencyId);
      const revenue = await dashboardService.getRevenueChart(agencyId, new Date().getFullYear());

      const model = getGemini();
      const prompt = `You are a business analyst for a travel agency. Based on this data, provide a concise business summary with insights and actionable recommendations:\n\nKPIs:\n- Total Active Customers: ${kpis.totalCustomers}\n- Active Bookings: ${kpis.activeBookings}\n- Pending Visa Applications: ${kpis.pendingVisas}\n- Total Revenue: ₦${kpis.totalRevenue?.toLocaleString()}\n- Outstanding Balance: ₦${kpis.totalOutstanding?.toLocaleString()}\n\nMonthly Revenue Trend: ${JSON.stringify(revenue)}\n\nProvide: 1) Business health summary 2) Key insights 3) Top 3 recommendations. Keep it concise and actionable.`;

      const result = await model.generateContent(prompt);
      return result.response.text() || 'Unable to generate summary at this time.';
    } catch (error) {
      // Surface *why* it failed. Returning a bland "unavailable" string as if
      // it were the summary hid a wrong model name for weeks.
      logger.error('AI business summary failed:', error);
      const reason = (error as Error)?.message || '';
      if (reason.includes('GEMINI_API_KEY')) {
        throw new AppError('AI insights are not configured. Add GEMINI_API_KEY on the server.', 503);
      }
      throw new AppError(`AI insights are unavailable right now: ${reason.slice(0, 200)}`, 503);
    }
  },

  async getRevenueInsights(_agencyId: string, revenueData: unknown[]): Promise<string> {
    try {
      const model = getGemini();
      const prompt = `Analyze this monthly revenue data for a travel agency and provide insights on trends, seasonality, and growth opportunities: ${JSON.stringify(revenueData)}. Be concise.`;
      const result = await model.generateContent(prompt);
      return result.response.text() || '';
    } catch (error) {
      logger.error('AI revenue insights failed:', error);
      return '';
    }
  },
};
