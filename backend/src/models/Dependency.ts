/**
 * PRATYAKSH — Dependency Model
 *
 * Represents a directed dependency relationship between two activities.
 * V1 supports only FINISH_TO_START (predecessor must finish before
 * successor can start).
 *
 * Design note: Dependencies are stored as separate documents (not embedded
 * in Activity) to allow efficient graph traversal queries and to support
 * future relationship types (SS, FF, SF) without schema migration.
 */
import { Schema, model, Document, Types } from 'mongoose';
import type { DependencyRelationship } from '../types';

export interface IDependency extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  predecessorActivityId: Types.ObjectId;
  successorActivityId: Types.ObjectId;
  relationship: DependencyRelationship;
}

const DependencySchema = new Schema<IDependency>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    predecessorActivityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    successorActivityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    relationship: {
      type: String,
      enum: ['FINISH_TO_START'],
      default: 'FINISH_TO_START',
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Prevent duplicate dependency edges
DependencySchema.index(
  { projectId: 1, predecessorActivityId: 1, successorActivityId: 1 },
  { unique: true }
);

// Index for efficient successor lookup (given a predecessor)
DependencySchema.index({ projectId: 1, predecessorActivityId: 1 });
// Index for efficient predecessor lookup (given a successor)
DependencySchema.index({ projectId: 1, successorActivityId: 1 });

export const Dependency = model<IDependency>('Dependency', DependencySchema);
