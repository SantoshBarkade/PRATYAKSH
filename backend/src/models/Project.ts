/**
 * PRATYAKSH — Project Model
 *
 * Represents a top-level infrastructure project.
 * All activities, dependencies, execution updates, and risks
 * are scoped to a project via `projectId`.
 */
import { Schema, model, Document, Types } from 'mongoose';

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  organization: string;
  description: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name must be 200 characters or fewer'],
    },
    organization: {
      type: String,
      required: [true, 'Organization is required'],
      trim: true,
      maxlength: [200, 'Organization must be 200 characters or fewer'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    plannedStartDate: {
      type: Date,
      required: [true, 'Planned start date is required'],
    },
    plannedEndDate: {
      type: Date,
      required: [true, 'Planned end date is required'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Validation: end must be after start
ProjectSchema.pre('validate', function (next) {
  if (this.plannedEndDate <= this.plannedStartDate) {
    next(new Error('plannedEndDate must be after plannedStartDate'));
  } else {
    next();
  }
});

export const Project = model<IProject>('Project', ProjectSchema);
