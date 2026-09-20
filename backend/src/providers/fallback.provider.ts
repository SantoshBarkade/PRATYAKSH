import { ExtractionProvider } from './extraction.provider';
import { ExtractionResult, ExtractionStatus } from '../types';

export class FallbackExtractionProvider implements ExtractionProvider {
  async extract(text: string, context?: any): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      activity: null,
      date: null,
      progress: null,
      reason: null,
      status: null,
      extractionConfidence: 0,
      extractionMethod: 'DETERMINISTIC_FALLBACK'
    };

    let confidence = 0;

    // Progress extraction
    const progressMatch = text.match(/(\d+)\s*(?:%|percent)/i);
    if (progressMatch) {
      const p = parseInt(progressMatch[1], 10);
      if (p >= 0 && p <= 100) {
        result.progress = p;
        confidence += 0.25;
      }
    } else if (text.match(/\b(?:completed|is complete|was completed)\b/i)) {
      result.progress = 100;
      confidence += 0.25;
    }

    // Status extraction
    if (text.match(/\b(?:completed|complete)\b/i)) {
      result.status = 'COMPLETED';
      confidence += 0.10;
    } else if (text.match(/\b(?:ongoing|in progress|progressing)\b/i)) {
      result.status = 'IN_PROGRESS';
      confidence += 0.10;
    } else if (text.match(/\b(?:not started)\b/i)) {
      result.status = 'NOT_STARTED';
      confidence += 0.10;
    } else if (text.match(/\b(?:incomplete)\b/i)) {
      result.status = 'INCOMPLETE';
      confidence += 0.10;
    }

    // Reason extraction
    const reasonMatch = text.match(/(?:due to|because of|affected by|delayed by|caused by)\s+([^.,]+)/i);
    if (reasonMatch) {
      result.reason = reasonMatch[1].trim();
      confidence += 0.15;
    }

    // Date extraction
    const dateMatch = text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{0,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4})\b/i);
    if (dateMatch) {
      let rawDate = dateMatch[1].trim();
      // If date lacks year, but we have a context (e.g. project plannedStartDate)
      // We will handle normalization in the orchestration service, but we can return raw date here.
      result.date = rawDate;
      confidence += 0.20;
    }

    // Activity extraction
    let activityMatch = text.match(/(?:activity|task|package|work item)\s*[:=-]?\s*([^,|.\n]+?)(?:\s*[|;,]|\s*progress|\s*is|\s*has|\s*was|\s*at|\s*reached|\s*completed|\s*\d+%|$)/i);
    if (!activityMatch) {
      activityMatch = text.match(/\b([A-Z]\d{3,4}(?:\s+[^,|.\n]+?)?)(?:\s*[|;,]|\s*progress|\s*is|\s*has|\s*was|\s*at|\s*reached|\s*completed|\s*\d+%|$)/i);
    }
    if (!activityMatch) {
      activityMatch = text.match(/^([^,.]+?)\s+(?:work|execution|is|has|was|at|progressed|reached|completed)\b/i);
    }

    if (activityMatch && activityMatch[1]) {
      result.activity = activityMatch[1].trim();
      confidence += 0.25;
    }

    result.extractionConfidence = Math.min(confidence, 1.0);

    return result;
  }
}
