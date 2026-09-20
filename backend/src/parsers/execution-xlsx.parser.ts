import * as XLSX from 'xlsx';
import { parseCellDate, formatDisplayDate, getLogicalDateString } from '../utils/date.utils';

export interface RawExecutionRow {
  activityCode: string;
  activityName: string;
  reportDate: string;
  logicalDate: string;
  progress: number;
  status: string | null;
  remarks: string | null;
}

export interface ParseExecutionResult {
  rows: RawExecutionRow[];
  errors: string[];
  warnings: string[];
}

const HEADER_MAP: Record<string, keyof RawExecutionRow> = {
  'activity code': 'activityCode',
  'activitycode': 'activityCode',
  'code': 'activityCode',
  'id': 'activityCode',

  'activity name': 'activityName',
  'activityname': 'activityName',
  'name': 'activityName',

  'date': 'reportDate',
  'report date': 'reportDate',
  'execution date': 'reportDate',

  'progress': 'progress',
  '% complete': 'progress',
  'completion %': 'progress',
  'actual progress': 'progress',

  'status': 'status',
  'activity status': 'status',
  
  'remarks': 'remarks',
  'notes': 'remarks',
  'comments': 'remarks',
};

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '').toLowerCase().trim();
}

function parseCellNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace('%', ''));
  if (isNaN(n)) return null;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

export function parseExecutionXlsx(buffer: Buffer): ParseExecutionResult {
  const result: ParseExecutionResult = { rows: [], errors: [], warnings: [] };

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    result.errors.push('Failed to read XLSX file.');
    return result;
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    result.errors.push('Workbook contains no sheets.');
    return result;
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (rawRows.length < 2) {
    result.errors.push('Sheet must have header and at least one data row.');
    return result;
  }

  const headerRow = rawRows[0] as unknown[];
  const colMap: Record<number, keyof RawExecutionRow> = {};

  for (let i = 0; i < headerRow.length; i++) {
    const normalized = normalizeHeader(headerRow[i]);
    const field = HEADER_MAP[normalized];
    if (field) colMap[i] = field;
  }

  const presentFields = new Set(Object.values(colMap));
  const required: Array<keyof RawExecutionRow> = ['activityCode', 'reportDate', 'progress'];
  for (const req of required) {
    if (!presentFields.has(req)) {
      result.errors.push(`Required column "${req}" not found.`);
    }
  }

  if (result.errors.length > 0) return result;

  for (let rowIdx = 1; rowIdx < rawRows.length; rowIdx++) {
    const row = rawRows[rowIdx] as unknown[];
    if (row.every((cell) => cell === null || cell === undefined || cell === '')) continue;

    const raw: Partial<Record<keyof RawExecutionRow, unknown>> = {};
    for (const [colIdxStr, field] of Object.entries(colMap)) {
      raw[field] = row[parseInt(colIdxStr, 10)];
    }

    const code = String(raw.activityCode ?? '').trim().toUpperCase();
    if (!code) {
      result.warnings.push(`Row ${rowIdx + 1}: Missing activityCode.`);
      continue;
    }

    const name = String(raw.activityName ?? '').trim();

    const reportDate = parseCellDate(raw.reportDate);
    if (!reportDate) {
      result.warnings.push(`Row ${rowIdx + 1}: Invalid date.`);
      continue;
    }

    const progress = parseCellNumber(raw.progress);
    if (progress === null || progress < 0 || progress > 100) {
      result.warnings.push(`Row ${rowIdx + 1}: Invalid progress [0-100].`);
      continue;
    }

    const status = raw.status ? String(raw.status).trim() : null;
    const remarks = raw.remarks ? String(raw.remarks).trim() : null;

    result.rows.push({
      activityCode: code,
      activityName: name,
      reportDate: reportDate.toISOString(),
      logicalDate: getLogicalDateString(reportDate),
      progress,
      status,
      remarks,
    });
  }

  return result;
}
