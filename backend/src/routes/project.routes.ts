import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import {
  createProject,
  listProjects,
  getProject,
} from '../controllers/project.controller';
import { getProjectDashboard } from '../controllers/dashboard.controller';

const router = Router();

router.post('/', asyncHandler(createProject));
router.get('/', asyncHandler(listProjects));
router.get('/:projectId', asyncHandler(getProject));
router.get('/:projectId/dashboard', asyncHandler(getProjectDashboard));

export default router;
