import OpenAI from 'openai';
import { config } from '../../config';
import { dashboardService } from '../dashboard.service';
import { logger } from '../../utils/logger';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export const aiReportingService = {
  async generateBusinessSummary(agencyId: string): Promise<string> {
    try {
      const kpis = await dashboardService.getKPIs(agencyId);
      const year = new Date().getFullYear();
      const revenue = await dashboardService.getRevenueChart(agencyId, year);

      const prompt = `You are a business analyst for a travel agency. Based on this data, provide a concise business summary with insights and actionable recommendations:

KPIs:
- Total Active Customers: ${kpis.totalCustomers}
- Active Bookings: ${kpis.activeBookings}
- Pending Visa Applications: ${kpis.pendingVisas}
- Total Revenue: $${kpis.totalRevenue?.toLocaleString()}
- Outstanding Balance: $${kpis.totalOutstanding?.toLocaleString()}

Monthly Revenue Trend: ${JSON.stringify(revenue)}

Provide: 1) Business health summary 2) Key insights 3) Top 3 recommendations. Keep it concise and actionable.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      });

      return response.choices[0]?.message?.content || 'Unable to generate summary at this time.';
    } catch (error) {
      logger.error('AI business summary failed:', error);
      return 'AI reporting service is currently unavailable.';
    }
  },

  async getRevenueInsights(agencyId: string, revenueData: unknown[]): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Analyze this monthly revenue data for a travel agency and provide insights on trends, seasonality, and growth opportunities: ${JSON.stringify(revenueData)}. Be concise.`,
          },
        ],
        max_tokens: 400,
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('AI revenue insights failed:', error);
      return '';
    }
  },
};
