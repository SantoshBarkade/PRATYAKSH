import { Schema, model, Document, Types } from 'mongoose';
import type { ReconciliationStatus, ReconciliationAction, ConflictDetail } from '../types';

export interface IReconciliation extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  activityId: Types.ObjectId;
  logicalDate: string;
  status: ReconciliationStatus;
  evidenceIds: Types.ObjectId[];
  conflicts: ConflictDetail[];
  resolvedAt: Date | null;
  resolutionEvidenceId: Types.ObjectId | null;
  resolutionAction: ReconciliationAction | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConflictDetailSchema = new Schema(
  {
    field: { type: String, required: true },
    values: [
      {
        evidenceId: { type: Schema.Types.ObjectId, ref: 'ExecutionUpdate', required: true },
        value: { type: Schema.Types.Mixed }, // mixed to support dates, progress, status strings
      },
    ],
  },
  { _id: false }
);

const ReconciliationSchema = new Schema<IReconciliation>(
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
    logicalDate: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ALIGNED', 'CONFLICT', 'RESOLVED'],
      required: true,
      index: true,
    },
    evidenceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ExecutionUpdate',
      },
    ],
    conflicts: [ConflictDetailSchema],
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionEvidenceId: {
      type: Schema.Types.ObjectId,
      ref: 'ExecutionUpdate',
      default: null,
    },
    resolutionAction: {
      type: String,
      enum: ['ACCEPT_EVIDENCE', 'KEEP_CURRENT_STATE', null],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ReconciliationSchema.index({ projectId: 1, activityId: 1 });

export const Reconciliation = model<IReconciliation>('Reconciliation', ReconciliationSchema);
