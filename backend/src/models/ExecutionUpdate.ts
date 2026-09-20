/**
 * PRATYAKSH — ExecutionUpdate Model
 *
 * Represents a single parsed execution event from a site report.
 * Every field that was extracted from the raw source is preserved
 * to ensure full auditability.
 *
 * AUDITABILITY GUARANTEE:
 * Given an ExecutionUpdate document, the system can always answer:
 *   - What was the raw source text?
 *   - How was the data extracted (LLM vs deterministic)?
 *   - What activity was matched and how confident was the match?
 *   - What was the extraction confidence?
 *   - When was this update processed?
 *
 * PROCESSING STATUS LIFECYCLE:
 * RECEIVED → EXTRACTED → MATCHED → PROCESSED
 *                      ↘ REVIEW_REQUIRED  (low match confidence)
 *         ↘ FAILED       (extraction error or parse failure)
 */
import { Schema, model, Document, Types } from 'mongoose';
import type { SourceType, ProcessingStatus, MatchMethod, MatchDecision } from '../types';

export interface IExecutionUpdate extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  activityId: Types.ObjectId | null;      // null if REVIEW_REQUIRED or UNMATCHED

  // Source provenance
  sourceType: SourceType;
  sourceFileName: string | null;
  reportDate: Date | null;
  logicalDate: string | null;
  rawText: string;

  // Extraction results
  extractedActivity: string | null;
  progress: number | null;
  reason: string | null;
  extractedStatus: string | null;
  extractionConfidence: number;
  extractionMethod: 'LLM' | 'DETERMINISTIC_FALLBACK';

  // Matching results
  matchScore: number | null;
  matchMethod: MatchMethod | null;
  matchingDecision: MatchDecision | null;

  // Processing state
  processingStatus: ProcessingStatus;
  processingError: string | null;

  createdAt: Date;
}

const ExecutionUpdateSchema = new Schema<IExecutionUpdate>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      default: null,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['PDF', 'TXT', 'XLSX', 'TEXT'],
      required: true,
    },
    sourceFileName: {
      type: String,
      default: null,
    },
    reportDate: {
      type: Date,
      default: null,
    },
    logicalDate: {
      type: String,
      default: null,
    },
    rawText: {
      type: String,
      required: true,
    },
    extractedActivity: {
      type: String,
      default: null,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    extractedStatus: {
      type: String,
      default: null,
    },
    extractionConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    extractionMethod: {
      type: String,
      enum: ['LLM', 'DETERMINISTIC_FALLBACK'],
      required: true,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    matchMethod: {
      type: String,
      enum: ['EXACT', 'NORMALIZED_EXACT', 'KEYWORD', 'FUZZY', 'SEMANTIC', 'LLM_FALLBACK', null],
      default: null,
    },
    matchingDecision: {
      type: String,
      enum: ['AUTO_MATCH', 'REVIEW_REQUIRED', 'UNMATCHED', 'MANUAL', null],
      default: null,
    },
    processingStatus: {
      type: String,
      enum: ['RECEIVED', 'EXTRACTED', 'MATCHED', 'REVIEW_REQUIRED', 'UNMATCHED', 'DISCARDED', 'CONFLICT_REVIEW_REQUIRED', 'PROCESSED', 'FAILED'],
      default: 'RECEIVED',
    },
    processingError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

ExecutionUpdateSchema.index({ projectId: 1, createdAt: -1 });
ExecutionUpdateSchema.index({ projectId: 1, processingStatus: 1 });

export const ExecutionUpdate = model<IExecutionUpdate>('ExecutionUpdate', ExecutionUpdateSchema);
