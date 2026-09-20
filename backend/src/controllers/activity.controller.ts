/**
 * PRATYAKSH — Activity Controller
 *
 * GET /api/projects/:projectId/activities
 * GET /api/projects/:projectId/activities/:activityId
 *
 * The activity detail endpoint returns the full picture:
 *   - planned vs actual progress
 *   - variance
 *   - intrinsic activityStatus + dependencyRisk
 *   - execution updates linked to this activity
 *   - dependencies (predecessors + successors)
 *   - associated risks
 */
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Activity } from '../models/Activity';
import { Dependency } from '../models/Dependency';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { Risk } from '../models/Risk';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';

/** GET /api/projects/:projectId/activities */
export async function listActivities(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  const activities = await Activity.find({ projectId: new Types.ObjectId(projectId) })
    .sort({ activityCode: 1 })
    .lean();

  // Attach variance to each activity
  const enriched = activities.map((a) => ({
    ...a,
    variance: a.actualProgress - a.plannedProgress,
  }));

  sendSuccess(res, enriched);
}

/** GET /api/projects/:projectId/activities/:activityId */
export async function getActivity(req: Request, res: Response): Promise<void> {
  const { projectId, activityId } = req.params;

  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(activityId)) {
    sendBadRequest(res, 'Invalid projectId or activityId');
    return;
  }

  const pid = new Types.ObjectId(projectId);
  const aid = new Types.ObjectId(activityId);

  const activity = await Activity.findOne({ _id: aid, projectId: pid }).lean();
  if (!activity) {
    sendNotFound(res, 'Activity');
    return;
  }

  // Fetch predecessors
  const predecessorDeps = await Dependency.find({
    projectId: pid,
    successorActivityId: aid,
  }).lean();
  const predecessorIds = predecessorDeps.map((d) => d.predecessorActivityId);
  const predecessors = await Activity.find({ _id: { $in: predecessorIds } })
    .select('activityCode name activityStatus dependencyRisk')
    .lean();

  // Fetch successors
  const successorDeps = await Dependency.find({
    projectId: pid,
    predecessorActivityId: aid,
  }).lean();
  const successorIds = successorDeps.map((d) => d.successorActivityId);
  const successors = await Activity.find({ _id: { $in: successorIds } })
    .select('activityCode name activityStatus dependencyRisk')
    .lean();

  // Fetch execution updates
  const updates = await ExecutionUpdate.find({ projectId: pid, activityId: aid })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Fetch risks where this activity is the source OR impacted
  const risks = await Risk.find({
    projectId: pid,
    $or: [{ activityId: aid }, { impactedActivityIds: aid }],
  }).lean();

  sendSuccess(res, {
    ...activity,
    variance: activity.actualProgress - activity.plannedProgress,
    dependencies: {
      predecessors,
      successors,
    },
    executionUpdates: updates,
    risks,
  });
}
