/**
 * PRATYAKSH — Standardised API Response Helpers
 *
 * All Express route handlers should use these helpers to ensure
 * consistent response shape across the entire API.
 *
 * Success:  { success: true,  data: <payload> }
 * Error:    { success: false, message: <string>, code?: <string> }
 */
import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code?: string
): void {
  const body: { success: false; message: string; code?: string } = {
    success: false,
    message,
  };
  if (code) body.code = code;
  res.status(statusCode).json(body);
}

/** Convenience for 404 Not Found */
export function sendNotFound(res: Response, resource = 'Resource'): void {
  sendError(res, `${resource} not found`, 404, 'NOT_FOUND');
}

/** Convenience for 400 Bad Request */
export function sendBadRequest(res: Response, message: string): void {
  sendError(res, message, 400, 'BAD_REQUEST');
}

/** Convenience for 422 Unprocessable Entity */
export function sendUnprocessable(res: Response, message: string): void {
  sendError(res, message, 422, 'UNPROCESSABLE');
}
