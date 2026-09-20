/**
 * PRATYAKSH — Schedule Service
 *
 * Orchestrates the import of a project schedule from parsed XLSX rows:
 *   1. Validate project exists
 *   2. Clear existing schedule (re-import strategy)
 *   3. Create Activity documents
 *   4. Create Dependency documents
 *   5. Return import summary
 *
 * RE-IMPORT STRATEGY:
 * A project schedule upload replaces the existing schedule entirely.
 * This is intentional for the prototype — it avoids stale data and
 * makes demo resets trivial. A production system would need versioning.
 */
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { Activity, IActivity } from '../models/Activity';
import { Dependency } from '../models/Dependency';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { Risk } from '../models/Risk';
import type { RawScheduleRow } from '../types';

export interface ScheduleImportResult {
  activitiesImported: number;
  dependenciesImported: number;
  skippedDependencies: string[];
  warnings: string[];
}

export async function importSchedule(
  projectId: string,
  rows: RawScheduleRow[]
): Promise<ScheduleImportResult> {
  const result: ScheduleImportResult = {
    activitiesImported: 0,
    dependenciesImported: 0,
    skippedDependencies: [],
    warnings: [],
  };

  // Validate project
  const pid = new Types.ObjectId(projectId);
  const project = await Project.findById(pid);
  if (!project) throw new Error(`Project ${projectId} not found`);

  // Clear existing schedule data for this project (re-import)
  await Promise.all([
    Activity.deleteMany({ projectId: pid }),
    Dependency.deleteMany({ projectId: pid }),
    ExecutionUpdate.deleteMany({ projectId: pid }),
    Risk.deleteMany({ projectId: pid }),
  ]);

  // Check for duplicate activityCodes in the import payload
  const codeCounts: Record<string, number> = {};
  for (const row of rows) {
    codeCounts[row.activityCode] = (codeCounts[row.activityCode] ?? 0) + 1;
  }
  const duplicateCodes = Object.entries(codeCounts)
    .filter(([, count]) => count > 1)
    .map(([code]) => code);

  if (duplicateCodes.length > 0) {
    result.warnings.push(
      `Duplicate activityCodes found in import: ${duplicateCodes.join(', ')}. Only the first occurrence of each will be imported.`
    );
  }

  // Insert Activities (first pass — no deps yet)
  const seenCodes = new Set<string>();
  const activityDocs: IActivity[] = [];

  for (const row of rows) {
    if (seenCodes.has(row.activityCode)) continue;
    seenCodes.add(row.activityCode);

    const doc = new Activity({
      projectId: pid,
      activityCode: row.activityCode,
      name: row.activityName,
      description: row.description ?? '',
      plannedStart: new Date(row.plannedStart),
      plannedEnd: new Date(row.plannedEnd),
      plannedProgress: row.plannedProgress,
      actualProgress: 0,
      actualStart: null,
      actualEnd: null,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE',
    });

    await doc.save();
    activityDocs.push(doc);
    result.activitiesImported++;
  }

  // Build code → ObjectId lookup map
  const codeToId = new Map<string, Types.ObjectId>();
  for (const doc of activityDocs) {
    codeToId.set(doc.activityCode, doc._id as Types.ObjectId);
  }

  // Insert Dependencies (second pass)
  const depEdges = new Set<string>(); // Deduplicate

  for (const row of rows) {
    if (!row.dependency) continue;

    // Support comma/semicolon-separated predecessor lists
    const predecessorCodes = row.dependency
      .split(/[,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    for (const predCode of predecessorCodes) {
      const predId = codeToId.get(predCode);
      const succId = codeToId.get(row.activityCode);

      if (!predId) {
        result.skippedDependencies.push(
          `${row.activityCode} → ${predCode}: predecessor "${predCode}" not found in imported activities`
        );
        continue;
      }

      if (!succId) continue; // shouldn't happen

      const edgeKey = `${predId}-${succId}`;
      if (depEdges.has(edgeKey)) continue;
      depEdges.add(edgeKey);

      await Dependency.create({
        projectId: pid,
        predecessorActivityId: predId,
        successorActivityId: succId,
        relationship: 'FINISH_TO_START',
      });

      result.dependenciesImported++;
    }
  }

  if (result.skippedDependencies.length > 0) {
    result.warnings.push(
      `${result.skippedDependencies.length} dependency reference(s) skipped due to missing activities.`
    );
  }

  return result;
}
