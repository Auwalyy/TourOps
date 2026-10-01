import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { documentRepository } from '../../repositories/document.repository';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

function getGemini() {
  const key = (config as any).gemini?.apiKey || '';
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: config.gemini.model });
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

  /**
   * Reads a file holding several passports — a scanned PDF of a whole group,
   * or one photo with multiple data pages — and returns one row per traveller.
   *
   * Nothing is written to the database. An agency is creating customer
   * records from an OCR guess, so a person reviews and corrects the rows
   * before anything is saved.
   */
  async extractPassportBatch(
    fileBase64: string,
    mimeType: string
  ): Promise<Array<Record<string, unknown>>> {
    const model = getGemini();

    const prompt = [
      'This file contains one or more passport data pages.',
      'Extract every distinct passport you can find.',
      'Respond ONLY with valid JSON, no markdown, in exactly this shape:',
      '{ "travellers": [ { "firstName": string, "lastName": string, "passportNumber": string,',
      '"dateOfBirth": "YYYY-MM-DD", "expiryDate": "YYYY-MM-DD", "nationality": string,',
      '"gender": "male"|"female"|"other", "confidence": number } ] }',
      'Use null for any field you cannot read clearly. Never invent a passport number.',
      'confidence is 0 to 1, how sure you are of that row overall.',
      'If the file contains no passport, return { "travellers": [] }.',
    ].join('\n');

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: fileBase64 } },
    ]);

    const parsed = parseJSON(result.response.text());
    const rows: unknown = parsed?.travellers ?? parsed;
    if (!Array.isArray(rows)) return [];

    // Drop anything with no passport number — it cannot be matched to a
    // person, and a half-read row is worse than a missing one.
    return rows
      .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .filter((r) => typeof r.passportNumber === 'string' && r.passportNumber.trim().length > 3)
      .map((r) => ({
        ...r,
        passportNumber: String(r.passportNumber).toUpperCase().replace(/\s+/g, ''),
      }));
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
