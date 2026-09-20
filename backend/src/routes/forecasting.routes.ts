import { Router } from 'express';
import {
  getActivityForecast,
  getProjectForecastSummary,
} from '../controllers/forecasting.controller';

const router = Router({ mergeParams: true }); // Access projectId from parent route

router.get('/forecast/summary', getProjectForecastSummary);
router.get('/activities/:activityId/forecast', getActivityForecast);

export default router;
