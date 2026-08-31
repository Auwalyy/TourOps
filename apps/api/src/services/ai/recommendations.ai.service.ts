import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { TourPackage } from '../../models/TourPackage';
import { logger } from '../../utils/logger';

function getGemini() {
  const key = (config as any).gemini?.apiKey || '';
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-3.6-flash' });
}

function parseJSON(text: string): any {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return null;
  }
}

export const aiRecommendationService = {
  async getPackageRecommendations(agencyId: string, customerProfile: {
    budget?: number; currency?: string; travelPurpose?: string;
    nationality?: string; previousDestinations?: string[];
  }) {
    try {
      const packages = await TourPackage.find({ agencyId, status: 'active' })
        .select('title category destinations pricing duration tags').lean();

      if (!packages.length) return { recommendations: [], reasoning: 'No active packages available.' };

      const model = getGemini();
      const prompt = `You are a travel consultant. Based on this customer profile and available packages, recommend the top 3 most suitable packages.\n\nCustomer Profile:\n- Budget: ${customerProfile.budget ? `${customerProfile.currency || 'NGN'} ${customerProfile.budget}` : 'Not specified'}\n- Travel Purpose: ${customerProfile.travelPurpose || 'Not specified'}\n- Nationality: ${customerProfile.nationality || 'Not specified'}\n- Previous Destinations: ${customerProfile.previousDestinations?.join(', ') || 'None'}\n\nAvailable Packages:\n${JSON.stringify(packages, null, 2)}\n\nRespond in JSON only, no markdown: { "recommendations": [{ "packageId": string, "title": string, "reason": string, "matchScore": number }], "reasoning": string }`;

      const result = await model.generateContent(prompt);
      return parseJSON(result.response.text()) || { recommendations: [], reasoning: 'Unable to generate recommendations.' };
    } catch (error) {
      logger.error('AI recommendations failed:', error);
      return { recommendations: [], reasoning: 'Recommendation service unavailable.' };
    }
  },

  async getSimilarPackages(agencyId: string, packageId: string) {
    const pkg = await TourPackage.findOne({ _id: packageId, agencyId }).lean();
    if (!pkg) return [];
    return TourPackage.find({
      agencyId, status: 'active', _id: { $ne: packageId },
      $or: [{ category: pkg.category }, { destinations: { $in: pkg.destinations } }, { tags: { $in: pkg.tags } }],
    }).limit(4).lean();
  },
};
