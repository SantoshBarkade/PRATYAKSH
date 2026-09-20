/**
 * PRATYAKSH — Schedule Controller
 *
 * Handles XLSX schedule upload and import pipeline:
 *   1. Receive uploaded .xlsx file via Multer
 *   2. Pass buffer to xlsx.parser
 *   3. Delegate to schedule.service for DB import
 *   4. Return import summary
 */
import { Request, Response } from 'express';
import fs from 'fs';
import { Types } from 'mongoose';
import { parseScheduleXlsx } from '../parsers/xlsx.parser';
import { importSchedule } from '../services/schedule.service';
import { sendSuccess, sendBadRequest, sendError, sendNotFound } from '../utils/response';
import { Project } from '../models/Project';

/** POST /api/projects/:projectId/schedule/upload */
export async function uploadSchedule(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  if (!Types.ObjectId.isValid(projectId)) {
    sendBadRequest(res, 'Invalid projectId');
    return;
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    sendNotFound(res, 'Project');
    return;
  }

  if (!req.file) {
    sendBadRequest(res, 'No file uploaded. Please upload a .xlsx schedule file.');
    return;
  }

  const filePath = req.file.path;

  try {
    const buffer = fs.readFileSync(filePath);
    const parseResult = parseScheduleXlsx(buffer);

    if (parseResult.errors.length > 0) {
      sendError(
        res,
        `Schedule parsing failed: ${parseResult.errors.join('; ')}`,
        422,
        'PARSE_ERROR'
      );
      return;
    }

    const importResult = await importSchedule(projectId, parseResult.rows);

    sendSuccess(res, {
      message: 'Schedule imported successfully.',
      activitiesImported: importResult.activitiesImported,
      dependenciesImported: importResult.dependenciesImported,
      parserWarnings: parseResult.warnings,
      importWarnings: importResult.warnings,
      skippedDependencies: importResult.skippedDependencies,
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import schedule';
    sendError(res, message, 500);
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Non-critical cleanup failure
    }
  }
}
