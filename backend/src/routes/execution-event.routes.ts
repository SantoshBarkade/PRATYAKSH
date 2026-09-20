import { Router } from 'express';
import { submitExecutionEvent, listReviewQueue, resolveExecutionEvent } from '../controllers/execution-event.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/execution-events/review
router.get('/review', asyncHandler(listReviewQueue));

// POST /api/projects/:projectId/execution-events
router.post('/', asyncHandler(submitExecutionEvent));

// POST /api/projects/:projectId/execution-events/:executionUpdateId/resolve
router.post('/:executionUpdateId/resolve', asyncHandler(resolveExecutionEvent));

export default router;
