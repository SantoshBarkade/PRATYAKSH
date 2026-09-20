/**
 * PRATYAKSH — XLSX Schedule Parser
 *
 * Parses a project schedule from an Excel workbook into structured
 * RawScheduleRow objects ready for import into MongoDB.
 *
 * Supported column names (case-insensitive, flexible spacing):
 *   Activity Code / ActivityCode / Code / ID
 *   Activity Name / ActivityName / Name / Description
 *   Planned Start / PlannedStart / Start Date / Start
 *   Planned End   / PlannedEnd   / End Date   / Finish / End
 *   Planned Progress / PlannedProgress / Progress / % Complete
 *   Dependency / Dependencies / Predecessor / Predecessors
 *
 * The parser is intentionally tolerant of minor header variations
 * commonly found in infrastructure schedule exports.
 */
import * as XLSX from 'xlsx';
import { parseCellDate, formatDisplayDate } from '../utils/date.utils';
import type { RawScheduleRow } from '../types';

// ─── Header Aliases ───────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, keyof RawScheduleRow> = {
  // activityCode
  'activity code': 'activityCode',
  'activitycode': 'activityCode',
  'activity_code': 'activityCode',
  'code': 'activityCode',
  'id': 'activityCode',
  'activity id': 'activityCode',
  'activityid': 'activityCode',
  'wbs': 'activityCode',

  // activityName
  'activity name': 'activityName',
  'activityname': 'activityName',
  'activity_name': 'activityName',
  'name': 'activityName',
  'description': 'activityName',
  'task': 'activityName',
  'task name': 'activityName',

  // plannedStart
  'planned start': 'plannedStart',
  'plannedstart': 'plannedStart',
  'planned_start': 'plannedStart',
  'start date': 'plannedStart',
  'startdate': 'plannedStart',
  'start': 'plannedStart',
  'baseline start': 'plannedStart',

  // plannedEnd
  'planned end': 'plannedEnd',
  'plannedend': 'plannedEnd',
  'planned_end': 'plannedEnd',
  'end date': 'plannedEnd',
  'enddate': 'plannedEnd',
  'end': 'plannedEnd',
  'finish': 'plannedEnd',
  'planned finish': 'plannedEnd',
  'baseline finish': 'plannedEnd',

  // plannedProgress
  'planned progress': 'plannedProgress',
  'plannedprogress': 'plannedProgress',
  'planned_progress': 'plannedProgress',
  'progress': 'plannedProgress',
  '% complete': 'plannedProgress',
  '%complete': 'plannedProgress',
  'percent complete': 'plannedProgress',
  'completion %': 'plannedProgress',
  'planned %': 'plannedProgress',

  // dependency
  'dependency': 'dependency',
  'dependencies': 'dependency',
  'predecessor': 'dependency',
  'predecessors': 'dependency',
  'depends on': 'dependency',
};

// ─── Normalize header ─────────────────────────────────────────────────────────

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '').toLowerCase().trim();
}

// ─── Parse cell as number (progress) ─────────────────────────────────────────

function parseCellNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace('%', ''));
  if (isNaN(n)) return null;
  // If entered as a fraction (0–1), convert to percentage
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

// ─── Parse dependency string ──────────────────────────────────────────────────

function parseDependency(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s || s === '-' || s.toLowerCase() === 'none' || s.toLowerCase() === 'n/a') return null;
  return s.toUpperCase();
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export interface ParseScheduleResult {
  rows: RawScheduleRow[];
  errors: string[];
  warnings: string[];
}

export function parseScheduleXlsx(buffer: Buffer): ParseScheduleResult {
  const result: ParseScheduleResult = { rows: [], errors: [], warnings: [] };

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    result.errors.push('Failed to read XLSX file. Ensure the file is a valid Excel workbook.');
    return result;
  }

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    result.errors.push('The workbook contains no sheets.');
    return result;
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (rawRows.length < 2) {
    result.errors.push('Schedule sheet must have at least one header row and one data row.');
    return result;
  }

  // Map column index → field name
  const headerRow = rawRows[0] as unknown[];
  const colMap: Record<number, keyof RawScheduleRow> = {};

  for (let i = 0; i < headerRow.length; i++) {
    const normalized = normalizeHeader(headerRow[i]);
    const field = HEADER_MAP[normalized];
    if (field) {
      colMap[i] = field;
    }
  }

  // Validate required columns are present
  const presentFields = new Set(Object.values(colMap));
  const required: Array<keyof RawScheduleRow> = ['activityCode', 'activityName', 'plannedStart', 'plannedEnd'];
  for (const req of required) {
    if (!presentFields.has(req)) {
      result.errors.push(
        `Required column "${req}" not found. Check that headers match expected names (see .env.example for expected column list).`
      );
    }
  }

  if (result.errors.length > 0) return result;

  // Parse data rows
  for (let rowIdx = 1; rowIdx < rawRows.length; rowIdx++) {
    const row = rawRows[rowIdx] as unknown[];

    // Skip completely empty rows
    if (row.every((cell) => cell === null || cell === undefined || cell === '')) continue;

    const raw: Partial<Record<keyof RawScheduleRow, unknown>> = {};
    for (const [colIdxStr, field] of Object.entries(colMap)) {
      raw[field] = row[parseInt(colIdxStr, 10)];
    }

    // Validate activityCode
    const code = String(raw.activityCode ?? '').trim().toUpperCase();
    if (!code) {
      result.warnings.push(`Row ${rowIdx + 1}: Missing activityCode — skipping row.`);
      continue;
    }

    // Validate activityName
    const name = String(raw.activityName ?? '').trim();
    if (!name) {
      result.warnings.push(`Row ${rowIdx + 1} (${code}): Missing activityName — skipping row.`);
      continue;
    }

    // Parse dates
    const plannedStart = parseCellDate(raw.plannedStart);
    const plannedEnd = parseCellDate(raw.plannedEnd);

    if (!plannedStart) {
      result.warnings.push(`Row ${rowIdx + 1} (${code}): Cannot parse plannedStart "${raw.plannedStart}" — skipping row.`);
      continue;
    }
    if (!plannedEnd) {
      result.warnings.push(`Row ${rowIdx + 1} (${code}): Cannot parse plannedEnd "${raw.plannedEnd}" — skipping row.`);
      continue;
    }
    if (plannedEnd <= plannedStart) {
      result.warnings.push(
        `Row ${rowIdx + 1} (${code}): plannedEnd (${formatDisplayDate(plannedEnd)}) must be after plannedStart (${formatDisplayDate(plannedStart)}) — skipping row.`
      );
      continue;
    }

    // Parse progress (default to 100 if not provided, as schedule typically shows target)
    const plannedProgress = parseCellNumber(raw.plannedProgress) ?? 100;
    if (plannedProgress < 0 || plannedProgress > 100) {
      result.warnings.push(`Row ${rowIdx + 1} (${code}): plannedProgress ${plannedProgress} out of range [0,100] — defaulting to 100.`);
    }

    const dependency = parseDependency(raw.dependency);

    result.rows.push({
      activityCode: code,
      activityName: name,
      plannedStart: plannedStart.toISOString(),
      plannedEnd: plannedEnd.toISOString(),
      plannedProgress: Math.max(0, Math.min(100, plannedProgress)),
      dependency,
    });
  }

  if (result.rows.length === 0 && result.errors.length === 0) {
    result.errors.push('No valid activity rows found in the schedule.');
  }

  return result;
}
