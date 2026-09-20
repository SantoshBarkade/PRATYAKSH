import { Request, Response } from 'express';
import { executionEventService } from '../services/execution-event.service';
import { sendSuccess, sendError } from '../utils/response';

export const submitExecutionEvent = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { text, reportDate } = req.body;

  if (!text) {
    return sendError(res, 'Event text is required', 400);
  }

  try {
    const result = await executionEventService.processEvent(
      projectId,
      text,
      reportDate || null
    );

    sendSuccess(res, result, 201);
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return sendError(res, err.message, 404);
    }
    if (err.name === 'ValidationError') {
      return sendError(res, err.message, 422);
    }
    console.error(err);
    sendError(res, 'Failed to process execution event', 500);
  }
};

export const listReviewQueue = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const queue = await executionEventService.listReviewQueue(projectId);
    sendSuccess(res, queue);
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return sendError(res, err.message, 422);
    }
    console.error(err);
    sendError(res, 'Failed to fetch review queue', 500);
  }
};

export const resolveExecutionEvent = async (req: Request, res: Response) => {
  const { projectId, executionUpdateId } = req.params;
  const { action, activityId } = req.body;

  if (action === 'MATCH' && !activityId) {
    return sendError(res, 'activityId is required for MATCH action', 400);
  }

  try {
    const result = await executionEventService.resolveExecutionEvent(
      projectId,
      executionUpdateId,
      action,
      activityId
    );

    sendSuccess(res, result, 200);
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return sendError(res, err.message, 404);
    }
    if (err.name === 'ValidationError') {
      return sendError(res, err.message, 422);
    }
    console.error(err);
    sendError(res, 'Failed to resolve execution event', 500);
  }
};
