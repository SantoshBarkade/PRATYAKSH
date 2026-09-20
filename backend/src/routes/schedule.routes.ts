import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { uploadSchedule } from '../controllers/schedule.controller';

const router = Router({ mergeParams: true });

// POST /api/projects/:projectId/schedule/upload
router.post('/upload', uploadMiddleware, asyncHandler(uploadSchedule));

export default router;
