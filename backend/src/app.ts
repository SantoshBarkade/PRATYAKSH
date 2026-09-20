/**
 * PRATYAKSH — Express Application
 *
 * Sets up middleware, routes, and error handling.
 * Kept separate from server.ts to allow testing without starting the HTTP server.
 */
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import projectRoutes from './routes/project.routes';
import scheduleRoutes from './routes/schedule.routes';
import activityRoutes from './routes/activity.routes';
import { reportRoutes } from './routes/report.routes';
import executionEventRoutes from './routes/execution-event.routes';
import evidenceRoutes from './routes/evidence.routes';
import reconciliationRoutes from './routes/reconciliation.routes';
import riskRoutes from './routes/risk.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import forecastingRoutes from './routes/forecasting.routes';
import { validateObjectIdParam } from './middleware/validateObjectId';

const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logging (development) ───────────────────────────────────────────

if (!env.isProduction) {
  app.use((req, _res, next) => {
    console.log(`[INFRA LINK] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'infra-link-backend',
      description: 'Infrastructure Execution Intelligence — Planning-to-Execution Bridge',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Apply global route parameter validation
app.param('projectId', validateObjectIdParam);
app.param('activityId', validateObjectIdParam);
app.param('executionUpdateId', validateObjectIdParam);
app.param('id', validateObjectIdParam);

app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId', forecastingRoutes);
app.use('/api/projects/:projectId/schedule', scheduleRoutes);
app.use('/api/projects/:projectId/activities', activityRoutes);
app.use('/api/projects/:projectId/reports', reportRoutes);
app.use('/api/projects/:projectId/execution-events', executionEventRoutes);
app.use('/api/projects/:projectId/evidence', evidenceRoutes);
app.use('/api/projects/:projectId/reconciliations', reconciliationRoutes);
app.use('/api/projects/:projectId/risks', riskRoutes);

// ─── 404 + Error Handlers ─────────────────────────────────────────────────────

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
