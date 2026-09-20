/**
 * PRATYAKSH — Shared TypeScript Types and Interfaces
 *
 * Central type definitions used across the application.
 * Keep domain types here to avoid circular imports.
 */
import { Types } from 'mongoose';

// ─── Activity Status ──────────────────────────────────────────────────────────

/**
 * Intrinsic execution status of an activity, derived from its own progress
 * and planned dates. Does NOT reflect upstream dependency delays.
 */
export type ActivityStatus = 'NOT_STARTED' | 'ON_TRACK' | 'DELAYED' | 'COMPLETED';

/**
 * Dependency-propagated risk for an activity. Reflects whether an upstream
 * predecessor being delayed puts this activity at risk — independent of its
 * own execution state.
 */
export type DependencyRisk = 'NONE' | 'AT_RISK' | 'POTENTIAL_RISK';

// ─── Dependency ───────────────────────────────────────────────────────────────

export type DependencyRelationship = 'FINISH_TO_START';

// ─── Execution Update ─────────────────────────────────────────────────────────

export type SourceType = 'PDF' | 'TXT' | 'XLSX' | 'TEXT';

/**
 * Processing lifecycle of a single execution update record.
 *
 * RECEIVED       → File/text accepted, not yet parsed
 * EXTRACTED      → LLM/parser extracted structured facts
 * MATCHED        → Execution event linked to a planned activity
 * REVIEW_REQUIRED → Matching score below AUTO threshold; needs human review
 * PROCESSED      → Progress calculated, risks recalculated, fully applied
 * FAILED         → Extraction or critical processing error
 */
export type ProcessingStatus =
  | 'RECEIVED'
  | 'EXTRACTED'
  | 'MATCHED'
  | 'REVIEW_REQUIRED'
  | 'UNMATCHED'
  | 'DISCARDED'
  | 'CONFLICT_REVIEW_REQUIRED'
  | 'PROCESSED'
  | 'FAILED';

// ─── Match Result ─────────────────────────────────────────────────────────────

export type MatchMethod = 'EXACT' | 'NORMALIZED_EXACT' | 'KEYWORD' | 'FUZZY' | 'SEMANTIC' | 'LLM_FALLBACK';
export type MatchDecision = 'AUTO_MATCH' | 'REVIEW_REQUIRED' | 'UNMATCHED' | 'MANUAL';

export interface MatchCandidate {
  activityId: string;
  activityCode: string;
  name: string;
  matchScore: number;
  matchMethod: MatchMethod;
}

export interface MatchResult {
  decision: MatchDecision;
  matchedActivityId?: string;
  matchedActivityCode?: string;
  matchedActivityName?: string;
  matchScore?: number;
  matchMethod?: MatchMethod;
  candidates: MatchCandidate[];
}

// ─── Extraction Result ────────────────────────────────────────────────────────

export type ExtractionStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'INCOMPLETE' | null;

export interface ExtractionResult {
  activity: string | null;
  date: string | null;
  progress: number | null;
  reason: string | null;
  status: ExtractionStatus;
  extractionConfidence: number;
  extractionMethod: 'LLM' | 'DETERMINISTIC_FALLBACK';
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export type RiskType = 'DOWNSTREAM_DELAY' | 'POTENTIAL_DOWNSTREAM_DELAY';
export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

// ─── Schedule Import ─────────────────────────────────────────────────────────

export interface RawScheduleRow {
  activityCode: string;
  activityName: string;
  plannedStart: string;
  plannedEnd: string;
  plannedProgress: number;
  dependency: string | null;
  description?: string;
}

// ─── API Response Helpers ────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Report Processing Result ─────────────────────────────────────────────────

export interface ReportProcessingResult {
  executionUpdateId: string;
  processingStatus: ProcessingStatus;
  extraction?: ExtractionResult;
  matchResult?: MatchResult;
  progressUpdate?: {
    activityId: string;
    activityCode: string;
    activityName: string;
    plannedProgress: number;
    actualProgress: number;
    variance: number;
    activityStatus: ActivityStatus;
    dependencyRisk: DependencyRisk;
  };
  risksGenerated?: number;
  message: string;
}

// ─── Mongoose ObjectId helper ─────────────────────────────────────────────────

export type ObjectId = Types.ObjectId;

// ─── Reconciliation ───────────────────────────────────────────────────────────

export type ReconciliationStatus = 'ALIGNED' | 'CONFLICT' | 'RESOLVED';
export type ReconciliationAction = 'ACCEPT_EVIDENCE' | 'KEEP_CURRENT_STATE';

export interface ConflictDetail {
  field: string;
  values: {
    evidenceId: string;
    value: any;
  }[];
}

