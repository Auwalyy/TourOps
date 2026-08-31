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
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `You are a travel document validation expert. Analyze this ${doc.category} document and provide:\n1. Whether it appears valid (true/false)\n2. Any issues found (list)\n3. Suggestions for improvement (list)\n4. Whether it appears expired\n5. Whether it appears to be a duplicate or low quality\n\nRespond in JSON format only, no markdown: { "isValid": boolean, "issues": string[], "suggestions": string[], "isExpired": boolean, "isLowQuality": boolean }` },
            { type: 'image_url', image_url: { url: doc.fileUrl, detail: 'high' } },
          ],
        }],
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      let parsed;
      try { parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '')); }
      catch { parsed = { isValid: true, issues: [], suggestions: [], isExpired: false, isLowQuality: false }; }

      await documentRepository.updateById(documentId, {
        aiValidation: { isValid: parsed.isValid, issues: parsed.issues || [], suggestions: parsed.suggestions || [], processedAt: new Date() },
        ...(parsed.isExpired && { isExpired: true }),
      });

      return parsed;
    } catch (error) {
      logger.error('AI document validation failed:', error);
      throw new Error('Document validation service unavailable');
    }
  },

  async extractPassport(imageBase64: string, mimeType: string) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Extract the following fields from this passport image and respond ONLY with valid JSON, no markdown:\n{ "firstName": string, "lastName": string, "fullName": string, "passportNumber": string, "dateOfBirth": "YYYY-MM-DD", "expiryDate": "YYYY-MM-DD", "nationality": string, "gender": "male"|"female"|"other" }\nIf a field is not visible, use null.` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
          ],
        }],
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content || '{}';
      try { return JSON.parse(content.replace(/```json\n?|\n?```/g, '')); }
      catch { return {}; }
    } catch (error) {
      logger.error('Passport extraction failed:', error);
      throw new Error('Passport extraction service unavailable');
    }
  },

  async detectMissingDocuments(visaType: string, country: string, uploadedCategories: string[]) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: `For a ${visaType} visa application to ${country}, the applicant has uploaded: ${uploadedCategories.join(', ')}.\nWhat required documents are missing? Respond in JSON only, no markdown: { "missing": string[], "optional": string[] }` }],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '{}';
      try { return JSON.parse(content.replace(/```json\n?|\n?```/g, '')); }
      catch { return { missing: [], optional: [] }; }
    } catch (error) {
      logger.error('AI missing document detection failed:', error);
      return { missing: [], optional: [] };
    }
  },
};
