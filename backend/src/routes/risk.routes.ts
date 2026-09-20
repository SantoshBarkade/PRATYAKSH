import { Router } from 'express';
import { recalculateRisks, getRisks, getRiskSummary, getActivityImpact } from '../controllers/risk.controller';

const router = Router({ mergeParams: true }); // Need mergeParams to access :projectId from parent

// These routes assume they are mounted at /api/projects/:projectId/risks
router.post('/recalculate', recalculateRisks);
router.get('/', getRisks);
router.get('/summary', getRiskSummary);

export default router;
