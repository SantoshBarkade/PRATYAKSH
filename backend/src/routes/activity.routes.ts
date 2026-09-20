import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { listActivities, getActivity } from '../controllers/activity.controller';
import { getActivityImpact } from '../controllers/risk.controller';

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/activities
router.get('/', asyncHandler(listActivities));

// GET /api/projects/:projectId/activities/:activityId
router.get('/:activityId', asyncHandler(getActivity));

// GET /api/projects/:projectId/activities/:activityId/impact
router.get('/:activityId/impact', asyncHandler(getActivityImpact));

export default router;
