import { Request, Response, NextFunction } from 'express';
import { ForecastingService } from '../services/forecasting.service';

/**
 * GET /api/projects/:projectId/activities/:activityId/forecast
 */
export const getActivityForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, activityId } = req.params;
    const forecast = await ForecastingService.getForecastForActivity(projectId, activityId);

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:projectId/forecast/summary
 */
export const getProjectForecastSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const forecasts = await ForecastingService.getProjectForecast(projectId);

    res.status(200).json({
      success: true,
      data: forecasts,
    });
  } catch (error) {
    next(error);
  }
};
