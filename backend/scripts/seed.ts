/**
 * PRATYAKSH — Demo Seed Script
 *
 * Creates the canonical SIH PS26122 demo scenario:
 *
 *   Project: Oil India Demo Infrastructure Project
 *
 *   Activities:
 *     A001 Foundation    01-Jun-2026 → 10-Jun-2026  (planned 100%)
 *     A002 Pillars       11-Jun-2026 → 20-Jun-2026  (planned 100%)
 *     A003 Beams         21-Jun-2026 → 25-Jun-2026  (planned 100%)
 *     A004 Road Surface  26-Jun-2026 → 30-Jun-2026  (planned 100%)
 *     A005 Drainage      15-Jun-2026 → 22-Jun-2026  (planned 100%)
 *
 *   Dependencies:
 *     A001 → A002   (Foundation must finish before Pillars can start)
 *     A002 → A003
 *     A003 → A004
 *     A001 → A005   (Foundation must finish before Drainage can start)
 *
 * Run: npm run seed
 * This will DELETE and recreate the demo project each time.
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { Project } from '../src/models/Project';
import { Activity } from '../src/models/Activity';
import { Dependency } from '../src/models/Dependency';
import { ExecutionUpdate } from '../src/models/ExecutionUpdate';
import { Risk } from '../src/models/Risk';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[SEED] MONGODB_URI is not set. Check your .env file.');
  process.exit(1);
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_PROJECT_NAME = 'Oil India Demo Infrastructure Project';

interface SeedActivity {
  code: string;
  name: string;
  start: Date;
  end: Date;
}

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const ACTIVITIES: SeedActivity[] = [
  { code: 'A001', name: 'Foundation',    start: d(2026, 6, 1),  end: d(2026, 6, 10) },
  { code: 'A002', name: 'Pillars',       start: d(2026, 6, 11), end: d(2026, 6, 20) },
  { code: 'A003', name: 'Beams',         start: d(2026, 6, 21), end: d(2026, 6, 25) },
  { code: 'A004', name: 'Road Surface',  start: d(2026, 6, 26), end: d(2026, 6, 30) },
  { code: 'A005', name: 'Drainage',      start: d(2026, 6, 15), end: d(2026, 6, 22) },
];

// predecessor → successor pairs (by code)
const DEPENDENCY_PAIRS: [string, string][] = [
  ['A001', 'A002'],
  ['A002', 'A003'],
  ['A003', 'A004'],
  ['A001', 'A005'],
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  await mongoose.connect(MONGODB_URI as string);
  console.log('[SEED] Connected to MongoDB.');

  // Remove existing demo project(s)
  const existing = await Project.find({ name: DEMO_PROJECT_NAME });
  for (const proj of existing) {
    const pid = proj._id;
    await Promise.all([
      Activity.deleteMany({ projectId: pid }),
      Dependency.deleteMany({ projectId: pid }),
      ExecutionUpdate.deleteMany({ projectId: pid }),
      Risk.deleteMany({ projectId: pid }),
      Project.deleteOne({ _id: pid }),
    ]);
    console.log(`[SEED] Removed existing demo project: ${pid}`);
  }

  // Create project
  const project = await Project.create({
    name: DEMO_PROJECT_NAME,
    organization: 'Oil India Limited',
    description:
      'SIH 2026 PS26122 canonical demo project for PRATYAKSH Infrastructure Execution Intelligence prototype.',
    plannedStartDate: d(2026, 6, 1),
    plannedEndDate: d(2026, 6, 30),
  });

  console.log(`[SEED] Created project: ${project._id} — ${project.name}`);

  // Create activities
  const activityMap = new Map<string, mongoose.Types.ObjectId>();

  for (const a of ACTIVITIES) {
    const doc = await Activity.create({
      projectId: project._id,
      activityCode: a.code,
      name: a.name,
      description: '',
      plannedStart: a.start,
      plannedEnd: a.end,
      plannedProgress: 100,
      actualProgress: 0,
      actualStart: null,
      actualEnd: null,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE',
    });
    activityMap.set(a.code, doc._id as mongoose.Types.ObjectId);
    console.log(`[SEED]   Activity: ${a.code} — ${a.name}`);
  }

  // Create dependencies
  for (const [predCode, succCode] of DEPENDENCY_PAIRS) {
    const predId = activityMap.get(predCode);
    const succId = activityMap.get(succCode);
    if (!predId || !succId) {
      console.warn(`[SEED]   Skipping dep ${predCode}→${succCode}: activity not found`);
      continue;
    }
    await Dependency.create({
      projectId: project._id,
      predecessorActivityId: predId,
      successorActivityId: succId,
      relationship: 'FINISH_TO_START',
    });
    console.log(`[SEED]   Dependency: ${predCode} → ${succCode}`);
  }

  console.log('\n[SEED] ✅ Demo seed complete!');
  console.log(`[SEED] Project ID: ${project._id}`);
  console.log('[SEED] Use this ID in your API calls or set it in your frontend .env\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
