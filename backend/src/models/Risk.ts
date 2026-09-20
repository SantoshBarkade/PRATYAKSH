/**
 * PRATYAKSH — Risk Model
 *
 * Represents a detected downstream risk arising from a delayed activity.
 *
 * DESIGN: Risk records are RECOMPUTABLE. The risk service clears and
 * regenerates Risk documents for affected activities whenever upstream
 * activity states change. This prevents stale risk records.
 *
 * Risk types:
 *   DOWNSTREAM_DELAY     — direct successor of a DELAYED activity
 *   POTENTIAL_DOWNSTREAM_DELAY — 2+ hops downstream of a DELAYED activity
 */
import { Schema, model, Document, Types } from 'mongoose';
import type { RiskType, RiskSeverity, ActivityStatus } from '../types';

export interface IRisk extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  activityId: Types.ObjectId;           // The DELAYED/AT_RISK source activity
  targetActivityId: Types.ObjectId;     // The downstream impacted activity
  logicalKey: string;                   // Deterministic identity: projectId:sourceId:targetId:riskType
  status: 'OPEN' | 'RESOLVED';
  resolvedAt: Date | null;
  riskType: RiskType;
  severity: RiskSeverity;
  distance: number;                     // BFS distance from source
  path: Types.ObjectId[];               // Dependency path [source, ..., target]
  reason: string;
  impactedActivityIds: Types.ObjectId[]; // Legacy compatibility array (will contain [targetActivityId])
  confidence: number;                    // Prototype ranking score [0,1]
  
  // Source evidence
  sourceActivityStatus?: ActivityStatus | null;
  sourceVariance?: number | null;
  sourceActualProgress?: number | null;
  sourcePlannedProgressAtReportDate?: number | null;
  sourceReportDate?: Date | null;
  dependencyType?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const RiskSchema = new Schema<IRisk>(
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
      required: true,
      index: true,
    },
    targetActivityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
      index: true,
    },
    logicalKey: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED'],
      default: 'OPEN',
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    riskType: {
      type: String,
      enum: ['DOWNSTREAM_DELAY', 'POTENTIAL_DOWNSTREAM_DELAY'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      required: true,
    },
    distance: {
      type: Number,
      required: true,
      default: 1,
    },
    path: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Activity',
      }
    ],
    reason: {
      type: String,
      required: true,
    },
    impactedActivityIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Activity',
      },
    ],
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.9,
    },
    sourceActivityStatus: { type: String, default: null },
    sourceVariance: { type: Number, default: null },
    sourceActualProgress: { type: Number, default: null },
    sourcePlannedProgressAtReportDate: { type: Number, default: null },
    sourceReportDate: { type: Date, default: null },
    dependencyType: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

RiskSchema.index({ projectId: 1, activityId: 1 });
RiskSchema.index({ projectId: 1, targetActivityId: 1 });
RiskSchema.index({ projectId: 1, severity: 1 });

export const Risk = model<IRisk>('Risk', RiskSchema);
