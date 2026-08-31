import OpenAI from 'openai';
import { config } from '../../config';
import { dashboardService } from '../dashboard.service';
import { logger } from '../../utils/logger';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export const aiReportingService = {
  async generateBusinessSummary(agencyId: string): Promise<string> {
    try {
      const kpis = await dashboardService.getKPIs(agencyId);
      const revenue = await dashboardService.getRevenueChart(agencyId, new Date().getFullYear());

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: `You are a business analyst for a travel agency. Based on this data, provide a concise business summary with insights and actionable recommendations:\n\nKPIs:\n- Total Active Customers: ${kpis.totalCustomers}\n- Active Bookings: ${kpis.activeBookings}\n- Pending Visa Applications: ${kpis.pendingVisas}\n- Total Revenue: $${kpis.totalRevenue?.toLocaleString()}\n- Outstanding Balance: $${kpis.totalOutstanding?.toLocaleString()}\n\nMonthly Revenue Trend: ${JSON.stringify(revenue)}\n\nProvide: 1) Business health summary 2) Key insights 3) Top 3 recommendations. Keep it concise and actionable.` }],
        max_tokens: 600,
      });

      return response.choices[0]?.message?.content || 'Unable to generate summary at this time.';
    } catch (error) {
      logger.error('AI business summary failed:', error);
      return 'AI reporting service is currently unavailable.';
    }
  },

  async getRevenueInsights(_agencyId: string, revenueData: unknown[]): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: `Analyze this monthly revenue data for a travel agency and provide insights on trends, seasonality, and growth opportunities: ${JSON.stringify(revenueData)}. Be concise.` }],
        max_tokens: 400,
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('AI revenue insights failed:', error);
      return '';
    }
  },
};
