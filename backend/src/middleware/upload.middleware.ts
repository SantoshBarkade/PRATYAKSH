/**
 * PRATYAKSH — File Upload Middleware
 *
 * Multer v2 configuration for accepting schedule and site report uploads.
 * Accepts: .xlsx, .pdf, .txt
 * Storage: disk (uploads/ directory)
 * Size limit: configurable via UPLOAD_MAX_SIZE_MB env var
 *
 * NOTE: Multer v2 uses named exports only (no default factory export).
 */
import { diskStorage, MulterError } from 'multer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, RequestHandler } from 'express';
import { env } from '../config/env';

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safe}`);
  },
});

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls', '.pdf', '.txt']);

const ALLOWED_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'text/plain',
  'application/octet-stream',
]);

/** Multer field name used for all file uploads */
export const UPLOAD_FIELD = 'file';

const upload = multer({
  storage,
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new MulterError('LIMIT_UNEXPECTED_FILE', `Unsupported file type: ${ext}. Allowed: .xlsx, .pdf, .txt`));
    }
  },
});

/** Single-file upload middleware for the `file` field. */
export const uploadMiddleware: RequestHandler = upload.single(UPLOAD_FIELD) as RequestHandler;
