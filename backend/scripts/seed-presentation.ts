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

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

async function seedPresentation() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('[SEED] Connected to MongoDB.');

  // CLEAR THE DATABASE COMPLETELY
  console.log('[SEED] Wiping database collections...');
  await Project.deleteMany({});
  await Activity.deleteMany({});
  await Dependency.deleteMany({});
  await ExecutionUpdate.deleteMany({});
  await Risk.deleteMany({});
  console.log('[SEED] Database wiped clean.');

  // PROJECT 1: Oil India Pipeline Expansion (Based on original demo but more realistic)
  const p1 = await Project.create({
    name: 'Oil India Pipeline Expansion',
    organization: 'Oil India Limited',
    description: 'SIH PS26122 - Pipeline expansion traversing complex terrain in Assam.',
    plannedStartDate: d(2026, 6, 1),
    plannedEndDate: d(2026, 6, 30),
  });

  const p1_acts = await Activity.insertMany([
    { projectId: p1._id, activityCode: 'A001', name: 'Land Acquisition', plannedStart: d(2026, 6, 1), plannedEnd: d(2026, 6, 10), plannedProgress: 100, actualProgress: 100, activityStatus: 'COMPLETED' },
    { projectId: p1._id, activityCode: 'A002', name: 'Trenching', plannedStart: d(2026, 6, 11), plannedEnd: d(2026, 6, 20), plannedProgress: 80, actualProgress: 60, activityStatus: 'DELAYED' },
    { projectId: p1._id, activityCode: 'A003', name: 'Pipeline Laying', plannedStart: d(2026, 6, 21), plannedEnd: d(2026, 6, 25), plannedProgress: 0, actualProgress: 0, activityStatus: 'NOT_STARTED' },
    { projectId: p1._id, activityCode: 'A004', name: 'Testing & Commissioning', plannedStart: d(2026, 6, 26), plannedEnd: d(2026, 6, 30), plannedProgress: 0, actualProgress: 0, activityStatus: 'NOT_STARTED' },
  ]);

  await Dependency.insertMany([
    { projectId: p1._id, predecessorActivityId: p1_acts[0]._id, successorActivityId: p1_acts[1]._id, relationship: 'FINISH_TO_START' },
    { projectId: p1._id, predecessorActivityId: p1_acts[1]._id, successorActivityId: p1_acts[2]._id, relationship: 'FINISH_TO_START' },
    { projectId: p1._id, predecessorActivityId: p1_acts[2]._id, successorActivityId: p1_acts[3]._id, relationship: 'FINISH_TO_START' },
  ]);

  await Risk.create({
    projectId: p1._id,
    activityId: p1_acts[1]._id,
    targetActivityId: p1_acts[2]._id,
    severity: 'HIGH',
    status: 'OPEN',
    distance: 1,
    path: ['A002', 'A003'],
    reason: 'Trenching is delayed, risking the start of Pipeline Laying.'
  });

  // PROJECT 2: NHAI Expressway Bridge Construction (On Track)
  const p2 = await Project.create({
    name: 'NHAI Expressway Bridge Construction',
    organization: 'NHAI',
    description: 'Construction of 4-lane bridge over Godavari River.',
    plannedStartDate: d(2026, 1, 1),
    plannedEndDate: d(2026, 12, 31),
  });

  const p2_acts = await Activity.insertMany([
    { projectId: p2._id, activityCode: 'B001', name: 'Foundation Piling', plannedStart: d(2026, 1, 1), plannedEnd: d(2026, 3, 31), plannedProgress: 100, actualProgress: 100, activityStatus: 'COMPLETED' },
    { projectId: p2._id, activityCode: 'B002', name: 'Piers Construction', plannedStart: d(2026, 4, 1), plannedEnd: d(2026, 7, 31), plannedProgress: 50, actualProgress: 55, activityStatus: 'ON_TRACK' },
    { projectId: p2._id, activityCode: 'B003', name: 'Girder Launching', plannedStart: d(2026, 8, 1), plannedEnd: d(2026, 10, 31), plannedProgress: 0, actualProgress: 0, activityStatus: 'NOT_STARTED' },
  ]);

  await Dependency.insertMany([
    { projectId: p2._id, predecessorActivityId: p2_acts[0]._id, successorActivityId: p2_acts[1]._id, relationship: 'FINISH_TO_START' },
    { projectId: p2._id, predecessorActivityId: p2_acts[1]._id, successorActivityId: p2_acts[2]._id, relationship: 'FINISH_TO_START' },
  ]);

  // PROJECT 3: Mumbai Metro Line 3 Underground Section (Critical)
  const p3 = await Project.create({
    name: 'Mumbai Metro Line 3 Underground',
    organization: 'MMRC',
    description: 'Underground tunneling from CST to Churchgate.',
    plannedStartDate: d(2026, 3, 1),
    plannedEndDate: d(2026, 11, 30),
  });

  const p3_acts = await Activity.insertMany([
    { projectId: p3._id, activityCode: 'M001', name: 'TBM Assembly', plannedStart: d(2026, 3, 1), plannedEnd: d(2026, 4, 15), plannedProgress: 100, actualProgress: 90, activityStatus: 'DELAYED' },
    { projectId: p3._id, activityCode: 'M002', name: 'Tunneling Phase 1', plannedStart: d(2026, 4, 16), plannedEnd: d(2026, 8, 30), plannedProgress: 60, actualProgress: 20, activityStatus: 'AT_RISK' },
    { projectId: p3._id, activityCode: 'M003', name: 'Station Box Excavation', plannedStart: d(2026, 9, 1), plannedEnd: d(2026, 11, 30), plannedProgress: 0, actualProgress: 0, activityStatus: 'NOT_STARTED' },
  ]);

  await Dependency.insertMany([
    { projectId: p3._id, predecessorActivityId: p3_acts[0]._id, successorActivityId: p3_acts[1]._id, relationship: 'FINISH_TO_START' },
    { projectId: p3._id, predecessorActivityId: p3_acts[1]._id, successorActivityId: p3_acts[2]._id, relationship: 'FINISH_TO_START' },
  ]);

  await Risk.create({
    projectId: p3._id,
    activityId: p3_acts[1]._id,
    targetActivityId: p3_acts[2]._id,
    severity: 'CRITICAL',
    status: 'OPEN',
    distance: 1,
    path: ['M002', 'M003'],
    reason: 'Geological surprises slowing TBM progress, severe cascading delay expected.'
  });

  // PROJECT 4: NTPC Solar Park Substation (Completed/Almost Complete)
  const p4 = await Project.create({
    name: 'NTPC Solar Park Substation',
    organization: 'NTPC',
    description: 'Grid connectivity substation for 500MW solar park.',
    plannedStartDate: d(2026, 1, 1),
    plannedEndDate: d(2026, 5, 31),
  });

  const p4_acts = await Activity.insertMany([
    { projectId: p4._id, activityCode: 'S001', name: 'Site Clearance', plannedStart: d(2026, 1, 1), plannedEnd: d(2026, 1, 31), plannedProgress: 100, actualProgress: 100, activityStatus: 'COMPLETED' },
    { projectId: p4._id, activityCode: 'S002', name: 'Transformer Erection', plannedStart: d(2026, 2, 1), plannedEnd: d(2026, 4, 30), plannedProgress: 100, actualProgress: 100, activityStatus: 'COMPLETED' },
    { projectId: p4._id, activityCode: 'S003', name: 'Grid Sync', plannedStart: d(2026, 5, 1), plannedEnd: d(2026, 5, 31), plannedProgress: 100, actualProgress: 95, activityStatus: 'ON_TRACK' },
  ]);

  await Dependency.insertMany([
    { projectId: p4._id, predecessorActivityId: p4_acts[0]._id, successorActivityId: p4_acts[1]._id, relationship: 'FINISH_TO_START' },
    { projectId: p4._id, predecessorActivityId: p4_acts[1]._id, successorActivityId: p4_acts[2]._id, relationship: 'FINISH_TO_START' },
  ]);

  console.log('[SEED] Successfully seeded 4 prototype presentation projects.');
  await mongoose.disconnect();
  process.exit(0);
}

seedPresentation().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
