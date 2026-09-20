import { ExtractionResult } from '../types';

export interface ExtractionProvider {
  extract(text: string, context?: any): Promise<ExtractionResult>;
}
