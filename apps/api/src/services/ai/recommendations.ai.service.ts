import OpenAI from 'openai';
import { config } from '../../config';
import { TourPackage } from '../../models/TourPackage';
import { logger } from '../../utils/logger';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export const aiRecommendationService = {
  async getPackageRecommendations(agencyId: string, customerProfile: {
    budget?: number;
    currency?: string;
    travelPurpose?: string;
    nationality?: string;
    previousDestinations?: string[];
  }) {
    try {
      const packages = await TourPackage.find({ agencyId, status: 'active' })
        .select('title category destinations pricing duration tags')
        .lean();

      if (!packages.length) return { recommendations: [], reasoning: 'No active packages available.' };

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are a travel consultant. Based on this customer profile and available packages, recommend the top 3 most suitable packages.

Customer Profile:
- Budget: ${customerProfile.budget ? `${customerProfile.currency || 'USD'} ${customerProfile.budget}` : 'Not specified'}
- Travel Purpose: ${customerProfile.travelPurpose || 'Not specified'}
- Nationality: ${customerProfile.nationality || 'Not specified'}
- Previous Destinations: ${customerProfile.previousDestinations?.join(', ') || 'None'}

Available Packages:
${JSON.stringify(packages, null, 2)}

Respond in JSON: { "recommendations": [{ "packageId": string, "title": string, "reason": string, "matchScore": number }], "reasoning": string }`,
          },
        ],
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content || '{}';
      try {
        return JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      } catch {
        return { recommendations: [], reasoning: 'Unable to generate recommendations.' };
      }
    } catch (error) {
      logger.error('AI recommendations failed:', error);
      return { recommendations: [], reasoning: 'Recommendation service unavailable.' };
    }
  },

  async getSimilarPackages(agencyId: string, packageId: string) {
    const pkg = await TourPackage.findOne({ _id: packageId, agencyId }).lean();
    if (!pkg) return [];

    const similar = await TourPackage.find({
      agencyId,
      status: 'active',
      _id: { $ne: packageId },
      $or: [
        { category: pkg.category },
        { destinations: { $in: pkg.destinations } },
        { tags: { $in: pkg.tags } },
      ],
    })
      .limit(4)
      .lean();

    return similar;
  },
};
