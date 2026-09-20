import { ExtractionResult } from '../types';
import { GeminiExtractionProvider } from '../providers/gemini.provider';
import { FallbackExtractionProvider } from '../providers/fallback.provider';
import { env } from '../config/env';

class ExtractionService {
  private geminiProvider: GeminiExtractionProvider | null = null;
  private fallbackProvider: FallbackExtractionProvider;

  constructor() {
    this.fallbackProvider = new FallbackExtractionProvider();
    if (env.hasLlmKey) {
      this.geminiProvider = new GeminiExtractionProvider();
    }
  }

  async extractReportData(text: string, context?: any): Promise<ExtractionResult> {
    if (process.env.EXTRACTION_PROVIDER !== 'fallback' && this.geminiProvider) {
      try {
        return await this.geminiProvider.extract(text, context);
      } catch (err) {
        console.warn('[EXTRACTION] Gemini extraction failed, falling back to deterministic extractor', err);
        // Fallthrough to fallback
      }
    }

    return await this.fallbackProvider.extract(text, context);
  }
}

export const extractionService = new ExtractionService();
