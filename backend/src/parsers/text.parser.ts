import { ExecutionSignal, TxtExtractionResult } from '../types';

/**
 * Normalizes progress representation to a clean integer between 0 and 100.
 * Examples:
 *   "95%" -> 95
 *   "95 percent" -> 95
 *   "95 percent complete" -> 95
 *   "95.4%" -> 95
 *   "0.95" -> 95
 *   "100% complete" -> 100
 *   "completed" -> 100
 *   "not started" -> 0
 */
export function normalizeProgress(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (isNaN(value)) return null;
    if (value > 0 && value <= 1) return Math.round(value * 100);
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  const str = String(value).trim().toLowerCase();

  // 1. Explicit percentage or numeric string (e.g. "95%", "95 percent", "95 percent complete")
  const match = str.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
  if (match) {
    const parsed = parseFloat(match[1]);
    if (!isNaN(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }

  // 2. Standalone number or decimal (e.g. "95", "0.95")
  const numMatch = str.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const parsed = parseFloat(numMatch[1]);
    if (!isNaN(parsed)) {
      if (parsed > 0 && parsed <= 1) return Math.round(parsed * 100);
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }

  // 3. Word-based status/progress shorthands
  if (/\b(?:100% complete|is completed|was completed|completed|complete|finished)\b/.test(str)) {
    return 100;
  }
  if (/\b(?:not started)\b/.test(str)) {
    return 0;
  }

  return null;
}

/**
 * Normalizes execution status strings.
 */
export function normalizeStatus(rawStatus: string | null | undefined, progress: number | null): string {
  if (rawStatus) {
    const s = rawStatus.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (['COMPLETED', 'COMPLETE', 'FINISHED'].includes(s)) return 'COMPLETED';
    if (['IN_PROGRESS', 'ONGOING', 'PROGRESSING', 'INCOMPLETE'].includes(s)) return 'IN_PROGRESS';
    if (['DELAYED', 'BEHIND', 'AT_RISK'].includes(s)) return 'DELAYED';
    if (['VERIFIED'].includes(s)) return 'VERIFIED';
    if (['NOT_STARTED', 'UNSTARTED'].includes(s)) return 'NOT_STARTED';
    if (['ON_TRACK'].includes(s)) return 'ON_TRACK';
    return s;
  }

  if (progress !== null) {
    if (progress >= 100) return 'COMPLETED';
    if (progress > 0) return 'IN_PROGRESS';
    return 'NOT_STARTED';
  }

  return 'IN_PROGRESS';
}

/**
 * Normalizes dates to an ISO date string (YYYY-MM-DD) or formatted string.
 */
export function normalizeDate(rawDateStr: string | null | undefined): string | null {
  if (!rawDateStr) return null;
  const cleaned = rawDateStr.trim();
  
  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return cleaned;
}

/**
 * Basic TXT buffer parser.
 */
export const parseTxt = (buffer: Buffer): string => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Text buffer is empty');
  }

  // Parse as UTF-8 and strip BOM if present
  let text = buffer.toString('utf-8');
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // Normalize line breaks
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!text || text.trim().length === 0) {
    const error = new Error('No extractable text found in TXT file.');
    error.name = 'TxtExtractionError';
    throw error;
  }

  return text.trim();
};

/**
 * Helper to parse a single block or line into an ExecutionSignal.
 */
function parseBlockToSignal(
  block: string,
  docMetadata: { reportDate?: string | null; source?: string | null }
): ExecutionSignal | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let activityCode: string | null = null;
  let activityName: string | null = null;
  let actualProgress: number | null = null;
  let status: string | null = null;
  let observationDate: string | null = null;
  let reason: string | null = null;

  // 1. Try Line Variants First (e.g. single-line summary or line inside block)
  for (const line of lines) {
    // Variant 1: "F001 - Pile Foundation - 95% complete"
    const dashMatch = line.match(/^([A-Za-z0-9_-]+)\s*[-–—]\s*(.+?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(?:%|percent)(?:\s*(?:complete|progress))?/i);
    if (dashMatch) {
      activityCode = dashMatch[1].trim();
      activityName = dashMatch[2].trim();
      actualProgress = normalizeProgress(dashMatch[3]);
      break;
    }

    // Variant 2: "F001 | Pile Foundation | Progress: 95%" or "F001 | Pile Foundation | 95%"
    const pipeMatch = line.match(/^([A-Za-z0-9_-]+)\s*\|\s*(.+?)\s*\|\s*(?:Progress:\s*|Actual Progress:\s*)?(\d+(?:\.\d+)?)\s*(?:%|percent)?/i);
    if (pipeMatch) {
      activityCode = pipeMatch[1].trim();
      activityName = pipeMatch[2].trim();
      actualProgress = normalizeProgress(pipeMatch[3]);
      break;
    }

    // Variant 3: "Activity F001, Pile Foundation, actual progress 95 percent"
    const commaMatch = line.match(/^(?:Activity\s+)?([A-Za-z0-9_-]+)\s*,\s*(.+?)\s*,\s*(?:actual\s+progress\s+|progress\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent)?/i);
    if (commaMatch) {
      activityCode = commaMatch[1].trim();
      activityName = commaMatch[2].trim();
      actualProgress = normalizeProgress(commaMatch[3]);
      break;
    }

    // Variant 4: "Pile Foundation (F001) is 95% complete."
    const parenMatch = line.match(/^(.+?)\s*\(\s*([A-Za-z0-9_-]+)\s*\)\s*(?:is|has reached|at)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
    if (parenMatch) {
      activityName = parenMatch[1].trim();
      activityCode = parenMatch[2].trim();
      actualProgress = normalizeProgress(parenMatch[3]);
      break;
    }
  }

  // 2. Structured Key-Value Field Parsing within Block
  // Activity Code
  if (!activityCode) {
    const codeMatch = block.match(/(?:Activity\s*Code|Task\s*Code|Code|Activity\s*ID|ID)\s*[:=-]\s*([A-Za-z0-9_-]+)/i);
    if (codeMatch) {
      activityCode = codeMatch[1].trim();
    } else {
      // Fallback: look for parenthesized code like (F001)
      const pMatch = block.match(/\(\s*([A-Z]{1,4}[0-9]{3,4}|EMERGENCY-[0-9]+)\s*\)/i);
      if (pMatch) {
        activityCode = pMatch[1].trim();
      } else {
        // Fallback: standalone code token (e.g. F001, P002, EMERGENCY-01)
        const tokenMatch = block.match(/\b([A-Z]{1,4}[0-9]{3,4}|EMERGENCY-[0-9]+)\b/);
        if (tokenMatch) {
          activityCode = tokenMatch[1].trim();
        }
      }
    }
  }

  // Activity Name
  if (!activityName) {
    const nameMatch = block.match(/(?:Activity\s*Name|Task\s*Name|Work\s*Item)\s*[:=-]\s*([^\r\n,;|]+)/i);
    if (nameMatch) {
      activityName = nameMatch[1].trim();
    } else {
      const actMatch = block.match(/(?:^|\n)\s*Activity\s*[:=-]\s*([^\r\n,;|]+)/i);
      if (actMatch) {
        const val = actMatch[1].trim();
        // Ignore if it's just "1", "2" from "ACTIVITY 1"
        if (!/^\d+$/.test(val)) {
          activityName = val;
        }
      }
    }
  }

  // Actual Progress
  if (actualProgress === null) {
    const progMatch = block.match(/(?:Actual\s*Progress|Progress|Completion\s*%?|%?\s*Complete)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?/i);
    if (progMatch) {
      actualProgress = normalizeProgress(progMatch[1]);
    } else {
      const genericProg = block.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
      if (genericProg) {
        actualProgress = normalizeProgress(genericProg[1]);
      }
    }
  }

  // Status
  const statusMatch = block.match(/(?:Status|Activity\s*Status)\s*[:=-]\s*([A-Za-z_]+)/i);
  if (statusMatch) {
    status = normalizeStatus(statusMatch[1], actualProgress);
  } else {
    // Check if status keywords appear in block
    const kwMatch = block.match(/\b(COMPLETED|COMPLETE|IN_PROGRESS|IN PROGRESS|DELAYED|VERIFIED|ON_TRACK|NOT_STARTED)\b/i);
    if (kwMatch) {
      status = normalizeStatus(kwMatch[1], actualProgress);
    } else {
      status = normalizeStatus(null, actualProgress);
    }
  }

  // Observation Date / Report Date
  const dateMatch = block.match(/(?:Observation\s*Date|Report\s*Date|Execution\s*Date|Date)\s*[:=-]\s*([^\r\n]+)/i);
  if (dateMatch) {
    observationDate = normalizeDate(dateMatch[1]);
  } else {
    // Check for inline date pattern in block
    const inlineDate = block.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/);
    if (inlineDate) {
      observationDate = normalizeDate(inlineDate[1]);
    } else {
      // Inherit document-level date
      observationDate = normalizeDate(docMetadata.reportDate) || null;
    }
  }

  // Observation / Remarks / Reason
  const obsMatch = block.match(/(?:Observation|Remarks|Reason|Notes|Comments)\s*[:=-]\s*([^\r\n]+)/i);
  if (obsMatch) {
    reason = obsMatch[1].trim();
  } else {
    const delayReason = block.match(/(?:due to|because of|affected by|delayed by|caused by)\s+([^\r\n.]+)/i);
    if (delayReason) {
      reason = delayReason[1].trim();
    }
  }

  // If no progress found, but word completion mentioned
  if (actualProgress === null) {
    if (/\b(?:completed|complete|is complete|was completed)\b/i.test(block)) {
      actualProgress = 100;
      status = 'COMPLETED';
    } else if (/\b(?:not started)\b/i.test(block)) {
      actualProgress = 0;
      status = 'NOT_STARTED';
    }
  }

  // If neither code nor name was extracted, this block is not an execution signal
  if (!activityCode && !activityName) {
    return null;
  }

  // If progress is missing, we cannot update schedule progress
  if (actualProgress === null) {
    return null;
  }

  return {
    activityCode: activityCode ? activityCode.toUpperCase() : null,
    activityName: activityName || null,
    actualProgress,
    observationDate: observationDate || null,
    status: status || 'IN_PROGRESS',
    source: docMetadata.source || null,
    reason: reason || null,
    rawText: block.trim(),
    confidence: 1.0,
    extractionMethod: 'DETERMINISTIC_FALLBACK',
  };
}

/**
 * Extracts multiple execution signals from raw site report text.
 * Deterministic, robust, and requires zero external LLM dependencies.
 */
export function extractSignalsFromText(
  rawText: string,
  defaultSource?: string | null
): TxtExtractionResult {
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // 1. Extract Document-Level Metadata from Header
  const dateMatch = normalizedText.match(/(?:Report\s*Date|Observation\s*Date|Date)\s*[:=-]\s*([^\r\n]+)/i);
  const sourceMatch = normalizedText.match(/(?:Source)\s*[:=-]\s*([^\r\n]+)/i);
  const projectMatch = normalizedText.match(/(?:Project)\s*[:=-]\s*([^\r\n]+)/i);
  const orgMatch = normalizedText.match(/(?:Organization)\s*[:=-]\s*([^\r\n]+)/i);

  const documentMetadata = {
    project: projectMatch ? projectMatch[1].trim() : null,
    organization: orgMatch ? orgMatch[1].trim() : null,
    reportDate: dateMatch ? dateMatch[1].trim() : null,
    source: sourceMatch ? sourceMatch[1].trim() : (defaultSource || null),
  };

  const signals: ExecutionSignal[] = [];

  // 2. Identify Block Segmentation Strategy
  // Strategy A: Explicit "ACTIVITY 1", "ACTIVITY 2" or "TASK 1" headers
  const hasActivityHeaders = /(?:^|\n)\s*(?:ACTIVITY|TASK|WORK\s*ITEM|ITEM)\s+\d+\b/i.test(normalizedText);

  if (hasActivityHeaders) {
    const rawBlocks = normalizedText.split(/(?:^|\n)(?=\s*(?:ACTIVITY|TASK|WORK\s*ITEM|ITEM)\s+\d+\b)/i);
    for (const b of rawBlocks) {
      // Skip the header section before the first ACTIVITY block
      if (/^\s*(?:0\d\s+SITE|0\d\s+CONTRACTOR|0\d\s+SUPERVISOR|0\d\s+UNKNOWN|SITE\s*REPORT|EVIDENCE|PROJECT:)/i.test(b) &&
          !/Activity\s*Code/i.test(b)) {
        continue;
      }
      const sig = parseBlockToSignal(b, documentMetadata);
      if (sig) signals.push(sig);
    }
  }

  // Strategy B: Multiple "Activity Code:" entries
  if (signals.length === 0) {
    const codeMatches = normalizedText.match(/Activity\s*Code\s*[:=-]/gi);
    if (codeMatches && codeMatches.length > 1) {
      const rawBlocks = normalizedText.split(/(?:^|\n)(?=\s*Activity\s*Code\s*[:=-])/i);
      for (const b of rawBlocks) {
        const sig = parseBlockToSignal(b, documentMetadata);
        if (sig) signals.push(sig);
      }
    }
  }

  // Strategy C: Blank-line separated blocks (\n\s*\n)
  if (signals.length === 0) {
    const blocks = normalizedText.split(/\n\s*\n+/);
    if (blocks.length > 1) {
      for (const b of blocks) {
        const sig = parseBlockToSignal(b, documentMetadata);
        if (sig) signals.push(sig);
      }
    }
  }

  // Strategy D: Line-by-line check (e.g. single-line reports or bulleted entries)
  if (signals.length === 0) {
    const lines = normalizedText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('=') || trimmed.startsWith('-')) continue;
      const sig = parseBlockToSignal(trimmed, documentMetadata);
      if (sig) signals.push(sig);
    }
  }

  // Strategy E: Fallback to treating entire text as a single document/block
  if (signals.length === 0) {
    const sig = parseBlockToSignal(normalizedText, documentMetadata);
    if (sig) signals.push(sig);
  }

  return {
    signals,
    documentMetadata,
    rawText: normalizedText,
  };
}
