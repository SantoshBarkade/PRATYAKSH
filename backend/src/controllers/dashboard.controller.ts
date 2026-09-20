import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess, sendBadRequest, sendError, sendNotFound } from '../utils/response';

/**
 * GET /api/projects/:projectId/dashboard
 */
export async function getProjectDashboard(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  try {
    const dashboardData = await dashboardService.getProjectDashboard(projectId);
    sendSuccess(res, dashboardData);
  } catch (error: any) {
    if (error.message === 'Project not found') {
      sendNotFound(res, 'Project');
    } else {
      sendError(res, error.message || 'Error fetching dashboard');
    }
  }
}
