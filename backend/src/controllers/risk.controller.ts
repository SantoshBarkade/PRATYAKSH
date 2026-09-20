import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { riskService } from '../services/risk.service';
import { Risk } from '../models/Risk';
import { Activity } from '../models/Activity';
import { sendSuccess, sendBadRequest, sendNotFound, sendError } from '../utils/response';

/** POST /api/projects/:projectId/risks/recalculate */
export async function recalculateRisks(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  try {
    const summary = await riskService.propagateRisks(projectId);
    sendSuccess(res, summary);
  } catch (error: any) {
    sendError(res, error.message || 'Error recalculating risks');
  }
}

/** GET /api/projects/:projectId/risks */
export async function getRisks(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const statusParam = req.query.status as string; // OPEN, RESOLVED, ALL

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  const query: any = { projectId: new Types.ObjectId(projectId) };

  if (statusParam === 'OPEN') {
    query.status = 'OPEN';
  } else if (statusParam === 'RESOLVED') {
    query.status = 'RESOLVED';
  } else if (statusParam !== 'ALL') {
    // Default to OPEN
    query.status = 'OPEN';
  }

  try {
    const risks = await Risk.find(query).sort({ severity: 1, distance: 1 }).lean();
    sendSuccess(res, risks);
  } catch (error: any) {
    sendError(res, error.message || 'Error fetching risks');
  }
}

/** GET /api/projects/:projectId/risks/summary */
export async function getRiskSummary(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  try {
    const openRisks = await Risk.find({ projectId: new Types.ObjectId(projectId), status: 'OPEN' }).lean();
    
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    const affectedActivities = new Set<string>();

    for (const r of openRisks) {
      if (r.severity === 'HIGH') high++;
      else if (r.severity === 'MEDIUM') medium++;
      else if (r.severity === 'LOW') low++;
      
      affectedActivities.add(r.targetActivityId.toString());
    }

    sendSuccess(res, {
      activeRiskCount: openRisks.length,
      critical,
      high,
      medium,
      low,
      affectedActivityCount: affectedActivities.size,
      graphWarnings: [] // Warnings are only retrieved during recalculation execution.
    });
  } catch (error: any) {
    sendError(res, error.message || 'Error summarizing risks');
  }
}

/** GET /api/projects/:projectId/activities/:activityId/impact */
export async function getActivityImpact(req: Request, res: Response): Promise<void> {
  const { projectId, activityId } = req.params;

  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(activityId)) {
    sendBadRequest(res, 'Invalid projectId or activityId');
    return;
  }

  try {
    const pid = new Types.ObjectId(projectId);
    const aid = new Types.ObjectId(activityId);

    const activity = await Activity.findOne({ _id: aid, projectId: pid }).lean();
    if (!activity) {
      sendNotFound(res, 'Activity');
      return;
    }

    const openRisks = await Risk.find({ projectId: pid, targetActivityId: aid, status: 'OPEN' }).lean();

    sendSuccess(res, {
      activityId: activity.activityCode,
      dependencyRisk: activity.dependencyRisk,
      risks: openRisks.map(r => ({
        sourceActivityId: r.activityId,
        severity: r.severity,
        distance: r.distance,
        path: r.path,
        reason: r.reason
      }))
    });
  } catch (error: any) {
    sendError(res, error.message || 'Error fetching activity impact');
  }
}
