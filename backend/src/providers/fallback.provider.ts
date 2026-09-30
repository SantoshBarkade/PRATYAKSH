import { ExtractionProvider } from './extraction.provider';
import { ExtractionResult, ExtractionStatus, ExecutionSignal } from '../types';
import { extractSignalsFromText } from '../parsers/text.parser';

export class FallbackExtractionProvider implements ExtractionProvider {
  /**
   * Extracts all execution signals present in the given text.
   */
  async extractSignals(text: string, context?: any): Promise<ExecutionSignal[]> {
    const parseResult = extractSignalsFromText(text, context?.sourceFileName || null);
    return parseResult.signals;
  }

  /**
   * Backwards-compatible single-signal extraction method.
   */
  async extract(text: string, context?: any): Promise<ExtractionResult> {
    const parseResult = extractSignalsFromText(text, context?.sourceFileName || null);
    
    if (parseResult.signals.length > 0) {
      const first = parseResult.signals[0];
      return {
        activity: first.activityCode || first.activityName,
        date: first.observationDate,
        progress: first.actualProgress,
        reason: first.reason || null,
        status: (first.status as ExtractionStatus) || null,
        extractionConfidence: first.confidence ?? 1.0,
        extractionMethod: 'DETERMINISTIC_FALLBACK'
      };
    }

    // Secondary fallback heuristics for unstructured fragments
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
    const progressMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
    if (progressMatch) {
      const p = parseFloat(progressMatch[1]);
      if (p >= 0 && p <= 100) {
        result.progress = Math.round(p);
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
    const reasonMatch = text.match(/(?:due to|because of|affected by|delayed by|caused by)\s+([^.,\n]+)/i);
    if (reasonMatch) {
      result.reason = reasonMatch[1].trim();
      confidence += 0.15;
    }

    // Date extraction
    const dateMatch = text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}-\d{2}-\d{2})\b/i);
    if (dateMatch) {
      result.date = dateMatch[1].trim();
      confidence += 0.20;
    }

    // Activity extraction
    let activityMatch = text.match(/(?:activity\s*code|activity\s*name|activity|task|package|work item)\s*[:=-]?\s*([^,|.\n]+?)(?:\s*[|;,]|\s*progress|\s*is|\s*has|\s*was|\s*at|\s*reached|\s*completed|\s*\d+%|$)/i);
    if (!activityMatch) {
      activityMatch = text.match(/\b([A-Z]\d{3,4}(?:\s+[^,|.\n]+?)?)(?:\s*[|;,]|\s*progress|\s*is|\s*has|\s*was|\s*at|\s*reached|\s*completed|\s*\d+%|$)/i);
    }
    if (!activityMatch) {
      activityMatch = text.match(/^([^,.]+?)\s+(?:work|execution|is|has|was|at|progressed|reached|completed)\b/i);
    }

    if (activityMatch && activityMatch[1]) {
      const act = activityMatch[1].trim();
      if (!/^\d+$/.test(act)) {
        result.activity = act;
        confidence += 0.25;
      }
    }

    result.extractionConfidence = Math.min(confidence, 1.0);
    return result;
  }
}
