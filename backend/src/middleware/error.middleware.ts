/**
 * PRATYAKSH — Centralised Error Handling Middleware
 *
 * Catches all errors passed via next(err) or thrown by async handlers.
 * Never exposes stack traces to clients in production.
 * Logs all errors internally.
 */
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { sendError } from '../utils/response';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'An unexpected error occurred';
  const code = err.code;

  // Internal logging — always log full error
  console.error('[PRATYAKSH] Error:', {
    method: req.method,
    path: req.path,
    statusCode,
    message,
    code,
    stack: env.isProduction ? '[hidden in production]' : err.stack,
  });

  sendError(res, message, statusCode, code);
}

/**
 * Wraps an async route handler to forward errors to the error middleware.
 * Usage: router.get('/path', asyncHandler(myController))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/**
 * 404 handler — registered after all routes.
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
}
