import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { documentRepository } from '../../repositories/document.repository';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

function getGemini() {
  const key = (config as any).gemini?.apiKey || '';
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-1.5-flash' });
}

function parseJSON(text: string): any {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return null;
  }
}

export const aiDocumentService = {
  async validateDocument(agencyId: string, documentId: string) {
    const doc = await documentRepository.findOne({ _id: documentId, agencyId });
    if (!doc) throw new NotFoundError('Document');

    try {
      const model = getGemini();
      const prompt = `You are a travel document validation expert. Analyze this ${doc.category} document image and respond ONLY with valid JSON, no markdown:\n{ "isValid": boolean, "issues": string[], "suggestions": string[], "isExpired": boolean, "isLowQuality": boolean }`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'image/jpeg', data: doc.fileUrl } },
      ]);

      const parsed = parseJSON(result.response.text()) || {
        isValid: true, issues: [], suggestions: [], isExpired: false, isLowQuality: false,
      };

      await documentRepository.updateById(documentId, {
        aiValidation: { isValid: parsed.isValid, issues: parsed.issues || [], suggestions: parsed.suggestions || [], processedAt: new Date() },
        ...(parsed.isExpired && { isExpired: true }),
      });

      return parsed;
    } catch (error) {
      logger.error('AI document validation failed:', error);
      return { isValid: null, issues: [], suggestions: ['AI validation unavailable'], isExpired: false, isLowQuality: false };
    }
  },

  async extractPassport(imageBase64: string, mimeType: string) {
    try {
      const model = getGemini();
      const prompt = `Extract the following fields from this passport image and respond ONLY with valid JSON, no markdown:\n{ "firstName": string, "lastName": string, "passportNumber": string, "dateOfBirth": "YYYY-MM-DD", "expiryDate": "YYYY-MM-DD", "nationality": string, "gender": "male"|"female"|"other" }\nIf a field is not visible or unclear, use null.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: imageBase64 } },
      ]);

      return parseJSON(result.response.text()) || {};
    } catch (error) {
      logger.error('Passport extraction failed:', error);
      throw error; // re-throw so controller can return proper error to frontend
    }
  },

  async detectMissingDocuments(visaType: string, country: string, uploadedCategories: string[]) {
    try {
      const model = getGemini();
      const prompt = `For a ${visaType} visa application to ${country}, the applicant has uploaded: ${uploadedCategories.join(', ')}.\nWhat required documents are missing? Respond in JSON only, no markdown: { "missing": string[], "optional": string[] }`;
      const result = await model.generateContent(prompt);
      return parseJSON(result.response.text()) || { missing: [], optional: [] };
    } catch (error) {
      logger.error('AI missing document detection failed:', error);
      return { missing: [], optional: [] };
    }
  },
};
