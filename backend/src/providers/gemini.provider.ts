import { GoogleGenAI, Type } from '@google/genai';
import { ExtractionProvider } from './extraction.provider';
import { ExtractionResult, ExtractionStatus } from '../types';
import { env } from '../config/env';

export class GeminiExtractionProvider implements ExtractionProvider {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.LLM_API_KEY });
  }

  async extract(text: string, context?: any): Promise<ExtractionResult> {
    const prompt = `You are a structured information extraction engine for infrastructure project site reports.
Extract only facts supported by the provided report.
Do not invent information.
Do not infer project schedule status.
Do not calculate delay.
Do not calculate variance.
Do not infer dependencies.
Do not assign schedule activity IDs.
Do not infer a percentage when no percentage is stated.
Do not invent a date.
If information is unavailable, return null.
Return only valid structured JSON.

FACT EXTRACTION ONLY.

Text to extract:
"${text}"
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        activity: { type: Type.STRING, nullable: true },
        date: { type: Type.STRING, nullable: true },
        progress: { type: Type.INTEGER, nullable: true },
        reason: { type: Type.STRING, nullable: true },
        status: { 
          type: Type.STRING, 
          enum: ['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'INCOMPLETE'],
          nullable: true 
        }
      }
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini extraction timed out after 4000ms')), 4000)
    );

    const callPromise = this.ai.interactions.create({
      model: 'gemini-3.7-flash',
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: responseSchema,
      },
      generation_config: {
        temperature: 0.1,
      }
    } as any);

    const interaction = await Promise.race([callPromise, timeoutPromise]);

    if (!interaction || !interaction.output_text) {
      throw new Error('Empty response from Gemini');
    }

    const data = JSON.parse(interaction.output_text);
    
    let confidence = 0.05; // Base confidence
    if (data.activity) confidence += 0.25;
    if (data.date) confidence += 0.20;
    if (data.progress !== null && data.progress !== undefined) confidence += 0.25;
    if (data.reason) confidence += 0.15;
    if (data.status) confidence += 0.10;

    return {
      activity: data.activity || null,
      date: data.date || null,
      progress: data.progress !== undefined && data.progress !== null ? Number(data.progress) : null,
      reason: data.reason || null,
      status: data.status as ExtractionStatus || null,
      extractionConfidence: Math.min(confidence, 1.0),
      extractionMethod: 'LLM'
    };
  }
}
