import OpenAI from 'openai';
import { config } from '../../config';
import { documentRepository } from '../../repositories/document.repository';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export const aiDocumentService = {
  async validateDocument(agencyId: string, documentId: string) {
    const doc = await documentRepository.findOne({ _id: documentId, agencyId });
    if (!doc) throw new NotFoundError('Document');

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a travel document validation expert. Analyze this ${doc.category} document and provide:
1. Whether it appears valid (true/false)
2. Any issues found (list)
3. Suggestions for improvement (list)
4. Whether it appears expired
5. Whether it appears to be a duplicate or low quality

Respond in JSON format: { "isValid": boolean, "issues": string[], "suggestions": string[], "isExpired": boolean, "isLowQuality": boolean }`,
              },
              {
                type: 'image_url',
                image_url: { url: doc.fileUrl, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      let result;
      try {
        result = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      } catch {
        result = { isValid: true, issues: [], suggestions: [], isExpired: false, isLowQuality: false };
      }

      await documentRepository.updateById(documentId, {
        aiValidation: {
          isValid: result.isValid,
          issues: result.issues || [],
          suggestions: result.suggestions || [],
          processedAt: new Date(),
        },
        ...(result.isExpired && { isExpired: true }),
      });

      return result;
    } catch (error) {
      logger.error('AI document validation failed:', error);
      throw new Error('Document validation service unavailable');
    }
  },

  async detectMissingDocuments(visaType: string, country: string, uploadedCategories: string[]) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `For a ${visaType} visa application to ${country}, the applicant has uploaded: ${uploadedCategories.join(', ')}.
What required documents are missing? Respond in JSON: { "missing": string[], "optional": string[] }`,
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '{}';
      try {
        return JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      } catch {
        return { missing: [], optional: [] };
      }
    } catch (error) {
      logger.error('AI missing document detection failed:', error);
      return { missing: [], optional: [] };
    }
  },
};
