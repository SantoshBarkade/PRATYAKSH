import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { sendBadRequest } from '../utils/response';

/**
 * Validates that specific route parameters are valid MongoDB ObjectIds.
 * If invalid, returns 400 Bad Request instead of throwing a 500 error during DB queries.
 */
export function validateObjectIdParam(req: Request, res: Response, next: NextFunction, value: string, name: string): void {
  if (!Types.ObjectId.isValid(value)) {
    sendBadRequest(res, `Invalid ObjectId format for parameter: ${name}`);
    return;
  }
  next();
}
