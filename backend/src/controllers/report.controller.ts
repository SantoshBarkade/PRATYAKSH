import { Request, Response } from 'express';
import { reportProcessingService } from '../services/report-processing.service';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { sendSuccess, sendError } from '../utils/response';
import { SourceType } from '../types';
import fs from 'fs';

export const uploadReport = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400);
  }

  const extension = req.file.originalname.split('.').pop()?.toLowerCase();
  let sourceType: SourceType;
  
  if (extension === 'pdf' || req.file.mimetype === 'application/pdf') {
    sourceType = 'PDF';
  } else if (extension === 'txt' || req.file.mimetype === 'text/plain') {
    sourceType = 'TXT';
  } else {
    return sendError(res, 'Unsupported file type. Only PDF and TXT are allowed.', 415);
  }

  try {
    const fileBuffer = fs.readFileSync(req.file.path);

    const result = await reportProcessingService.processReport(
      projectId,
      sourceType,
      fileBuffer,
      null,
      req.file.originalname,
      null
    );

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {
      console.warn('Failed to clean up uploaded file:', req.file.path);
    }

    sendSuccess(res, result, 201);
  } catch (err: any) {
    // Clean up uploaded file on error too
    try {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {}

    if (err.name === 'NotFoundError') {
      return sendError(res, err.message, 404);
    }
    if (err.name === 'ValidationError' || err.name === 'PdfExtractionError' || err.name === 'TxtExtractionError') {
      return sendError(res, err.message, 422);
    }
    console.error(err);
    sendError(res, 'Failed to process report upload', 500);
  }
};

export const submitTextReport = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { text, reportDate } = req.body;

  if (!text) {
    return sendError(res, 'Report text is required', 400);
  }

  try {
    const result = await reportProcessingService.processReport(
      projectId,
      'TEXT',
      null,
      text,
      null,
      reportDate || null
    );

    sendSuccess(res, result, 201);
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return sendError(res, err.message, 404);
    }
    if (err.name === 'ValidationError') {
      return sendError(res, err.message, 422);
    }
    console.error(err);
    sendError(res, 'Failed to process text report', 500);
  }
};

export const listReports = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    // Return all except rawText for list to save bandwidth
    const reports = await ExecutionUpdate.find({ projectId })
      .select('-rawText')
      .sort({ createdAt: -1 });
      
    sendSuccess(res, reports);
  } catch (err) {
    console.error(err);
    sendError(res, 'Failed to list reports', 500);
  }
};
