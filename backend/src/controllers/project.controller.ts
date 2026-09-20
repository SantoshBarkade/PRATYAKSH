/**
 * PRATYAKSH — Project Controller
 *
 * Handles HTTP requests for Project resources.
 * Business logic lives in the service layer — this controller
 * only handles request parsing, validation, and response formatting.
 */
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { Activity } from '../models/Activity';
import { parseCellDate } from '../utils/date.utils';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';

/** POST /api/projects */
export async function createProject(req: Request, res: Response): Promise<void> {
  const { name, organization, description, plannedStartDate, plannedEndDate } = req.body;

  if (!name || !organization || !plannedStartDate || !plannedEndDate) {
    sendBadRequest(res, 'Required fields: name, organization, plannedStartDate, plannedEndDate');
    return;
  }

  const startDate = parseCellDate(plannedStartDate);
  const endDate = parseCellDate(plannedEndDate);

  if (!startDate) {
    sendBadRequest(res, `Cannot parse plannedStartDate: "${plannedStartDate}"`);
    return;
  }
  if (!endDate) {
    sendBadRequest(res, `Cannot parse plannedEndDate: "${plannedEndDate}"`);
    return;
  }

  try {
    const project = await Project.create({
      name: name.trim(),
      organization: organization.trim(),
      description: (description ?? '').trim(),
      plannedStartDate: startDate,
      plannedEndDate: endDate,
    });

    sendSuccess(res, project, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create project';
    sendError(res, message, 400);
  }
}

/** GET /api/projects */
export async function listProjects(req: Request, res: Response): Promise<void> {
  const projects = await Project.find({}).sort({ createdAt: -1 }).lean();
  sendSuccess(res, projects);
}

/** GET /api/projects/:projectId */
export async function getProject(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    sendNotFound(res, 'Project');
    return;
  }

  // Attach activity summary
  const activityCount = await Activity.countDocuments({ projectId: project._id });
  sendSuccess(res, { ...project, activityCount });
}
