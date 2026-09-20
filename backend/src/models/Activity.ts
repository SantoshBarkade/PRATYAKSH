/**
 * PRATYAKSH — Activity Model
 *
 * Represents a single planned schedule activity (typically L5/L6 level).
 *
 * KEY DESIGN DECISION:
 * - `activityStatus`  = intrinsic execution state (derived from own progress + dates)
 * - `dependencyRisk`  = upstream propagated risk (not the activity's own fault)
 *
 * These are kept separate so that a delayed upstream predecessor does NOT
 * corrupt the intrinsic execution record of a downstream activity.
 *
 * PLANNED PROGRESS NOTE:
 * In V1, plannedProgress is the value supplied in the imported schedule
 * (typically 0 or 100, indicating not started / target completion).
 * Future versions may derive time-phased planned progress from baseline dates.
 */
import { Schema, model, Document, Types } from 'mongoose';
import type { ActivityStatus, DependencyRisk } from '../types';

export interface IActivity extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  activityCode: string;        // Unique within project (e.g., "A001")
  name: string;                // Human-readable name (e.g., "Foundation")
  description: string;
  plannedStart: Date;
  plannedEnd: Date;
  plannedProgress: number;     // 0–100, from schedule import
  actualProgress: number;      // 0–100, updated from execution reports
  actualStart: Date | null;
  actualEnd: Date | null;
  activityStatus: ActivityStatus;
  dependencyRisk: DependencyRisk;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    activityCode: {
      type: String,
      required: [true, 'activityCode is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Activity name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    plannedStart: {
      type: Date,
      required: [true, 'plannedStart is required'],
    },
    plannedEnd: {
      type: Date,
      required: [true, 'plannedEnd is required'],
    },
    plannedProgress: {
      type: Number,
      required: true,
      min: [0, 'plannedProgress must be >= 0'],
      max: [100, 'plannedProgress must be <= 100'],
      default: 0,
    },
    actualProgress: {
      type: Number,
      min: [0, 'actualProgress must be >= 0'],
      max: [100, 'actualProgress must be <= 100'],
      default: 0,
    },
    actualStart: {
      type: Date,
      default: null,
    },
    actualEnd: {
      type: Date,
      default: null,
    },
    activityStatus: {
      type: String,
      enum: ['NOT_STARTED', 'ON_TRACK', 'DELAYED', 'COMPLETED'],
      default: 'NOT_STARTED',
    },
    dependencyRisk: {
      type: String,
      enum: ['NONE', 'AT_RISK', 'POTENTIAL_RISK'],
      default: 'NONE',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound unique index: activityCode must be unique within a project
ActivitySchema.index({ projectId: 1, activityCode: 1 }, { unique: true });
// Index for name-based lookups during matching
ActivitySchema.index({ projectId: 1, name: 1 });

export const Activity = model<IActivity>('Activity', ActivitySchema);
