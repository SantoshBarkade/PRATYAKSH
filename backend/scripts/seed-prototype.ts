import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { Project } from '../src/models/Project';
import { Activity } from '../src/models/Activity';
import { Dependency } from '../src/models/Dependency';
import { ExecutionUpdate } from '../src/models/ExecutionUpdate';
import { Risk } from '../src/models/Risk';
import { executionEventService } from '../src/services/execution-event.service';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[SEED] MONGODB_URI is not set. Check your .env file.');
  process.exit(1);
}

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

async function seedPrototype() {
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

  // =========================================================================
  // PROJECT 1: Mostly Healthy (On Track)
  // =========================================================================
  const p1 = await Project.create({
    name: 'Pune Ring Road Expansion — Package 02',
    organization: 'MSRDC',
    description: 'SIH PS26122 - 6-lane access controlled highway expansion.',
    plannedStartDate: d(2026, 6, 1),
    plannedEndDate: d(2026, 6, 30),
  });

  await Activity.insertMany([
    { projectId: p1._id, activityCode: 'P001', name: 'Land Acquisition', plannedStart: d(2026, 6, 1), plannedEnd: d(2026, 6, 10), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p1._id, activityCode: 'P002', name: 'Earthworks', plannedStart: d(2026, 6, 11), plannedEnd: d(2026, 6, 20), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p1._id, activityCode: 'P003', name: 'Paving', plannedStart: d(2026, 6, 21), plannedEnd: d(2026, 6, 30), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
  ]);

  const p1Acts = await Activity.find({ projectId: p1._id }).sort({ activityCode: 1 });
  await Dependency.insertMany([
    { projectId: p1._id, predecessorActivityId: p1Acts[0]._id, successorActivityId: p1Acts[1]._id, relationship: 'FINISH_TO_START' },
    { projectId: p1._id, predecessorActivityId: p1Acts[1]._id, successorActivityId: p1Acts[2]._id, relationship: 'FINISH_TO_START' },
  ]);

  await executionEventService.processStructuredEvent(p1._id.toString(), { activityCode: 'P001', reportDate: '2026-06-10T12:00:00Z', progress: 100, status: 'COMPLETED', remarks: 'Land acquisition finalized' }, 'demo.xlsx');
  await executionEventService.processStructuredEvent(p1._id.toString(), { activityCode: 'P002', reportDate: '2026-06-15T12:00:00Z', progress: 50, status: 'ON_TRACK', remarks: 'Halfway through earthworks' }, 'demo.xlsx');

  // =========================================================================
  // PROJECT 2: Delayed Predecessor & Downstream Risk (M4)
  // =========================================================================
  const p2 = await Project.create({
    name: 'Municipal Water Pipeline Upgrade — Zone 4',
    organization: 'Municipal Corp',
    description: 'Replacing century-old pipelines in dense urban zone.',
    plannedStartDate: d(2026, 1, 1),
    plannedEndDate: d(2026, 12, 31),
  });

  await Activity.insertMany([
    { projectId: p2._id, activityCode: 'W001', name: 'Utility Mapping', plannedStart: d(2026, 1, 1), plannedEnd: d(2026, 1, 31), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p2._id, activityCode: 'W002', name: 'Trenching', plannedStart: d(2026, 2, 1), plannedEnd: d(2026, 3, 31), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p2._id, activityCode: 'W003', name: 'Pipe Laying', plannedStart: d(2026, 4, 1), plannedEnd: d(2026, 6, 30), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
  ]);

  const p2Acts = await Activity.find({ projectId: p2._id }).sort({ activityCode: 1 });
  await Dependency.insertMany([
    { projectId: p2._id, predecessorActivityId: p2Acts[0]._id, successorActivityId: p2Acts[1]._id, relationship: 'FINISH_TO_START' },
    { projectId: p2._id, predecessorActivityId: p2Acts[1]._id, successorActivityId: p2Acts[2]._id, relationship: 'FINISH_TO_START' },
  ]);

  await executionEventService.processStructuredEvent(p2._id.toString(), { activityCode: 'W001', reportDate: '2026-02-15T12:00:00Z', progress: 100, status: 'COMPLETED', remarks: 'Utility mapping finally done (delayed by 15 days)' }, 'demo.xlsx');
  await executionEventService.processStructuredEvent(p2._id.toString(), { activityCode: 'W002', reportDate: '2026-04-15T12:00:00Z', progress: 40, status: 'DELAYED', remarks: 'Rock layer encountered, trenching severely delayed' }, 'demo.xlsx');


  // =========================================================================
  // PROJECT 3: Historical Evidence & Forecastable (M8)
  // =========================================================================
  const p3 = await Project.create({
    name: 'Urban Flyover Construction — Phase 1',
    organization: 'PWD',
    description: 'Flyover construction traversing major intersections.',
    plannedStartDate: d(2026, 3, 1),
    plannedEndDate: d(2026, 11, 30),
  });

  await Activity.insertMany([
    { projectId: p3._id, activityCode: 'F001', name: 'Piers Construction', plannedStart: d(2026, 3, 1), plannedEnd: d(2026, 6, 30), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p3._id, activityCode: 'F002', name: 'Deck Casting', plannedStart: d(2026, 7, 1), plannedEnd: d(2026, 11, 30), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
  ]);

  const p3Acts = await Activity.find({ projectId: p3._id }).sort({ activityCode: 1 });
  await Dependency.insertMany([
    { projectId: p3._id, predecessorActivityId: p3Acts[0]._id, successorActivityId: p3Acts[1]._id, relationship: 'FINISH_TO_START' },
  ]);

  await executionEventService.processStructuredEvent(p3._id.toString(), { activityCode: 'F001', reportDate: '2026-03-15T12:00:00Z', progress: 10, status: 'ON_TRACK', remarks: 'Early progress' }, 'demo.xlsx');
  await executionEventService.processStructuredEvent(p3._id.toString(), { activityCode: 'F001', reportDate: '2026-04-15T12:00:00Z', progress: 40, status: 'ON_TRACK', remarks: 'Steady progress' }, 'demo.xlsx');
  await executionEventService.processStructuredEvent(p3._id.toString(), { activityCode: 'F001', reportDate: '2026-05-15T12:00:00Z', progress: 75, status: 'ON_TRACK', remarks: 'Nearly done with piers' }, 'demo.xlsx');
  await executionEventService.processStructuredEvent(p3._id.toString(), { activityCode: 'F001', reportDate: '2026-06-15T12:00:00Z', progress: 95, status: 'ON_TRACK', remarks: 'Final touches' }, 'demo.xlsx');


  // =========================================================================
  // PROJECT 4: Review-Required / Conflict Scenario (M6/M7)
  // =========================================================================
  const p4 = await Project.create({
    name: 'Smart Drainage & Stormwater Upgrade — Sector 7',
    organization: 'Smart City Corp',
    description: 'Stormwater drain enhancements before monsoon season.',
    plannedStartDate: d(2026, 2, 1),
    plannedEndDate: d(2026, 5, 31),
  });

  await Activity.insertMany([
    { projectId: p4._id, activityCode: 'D001', name: 'Survey', plannedStart: d(2026, 2, 1), plannedEnd: d(2026, 2, 15), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p4._id, activityCode: 'D002', name: 'Excavation', plannedStart: d(2026, 2, 16), plannedEnd: d(2026, 3, 31), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
    { projectId: p4._id, activityCode: 'D003', name: 'Pipe Laying', plannedStart: d(2026, 4, 1), plannedEnd: d(2026, 5, 31), plannedProgress: 100, actualProgress: 0, activityStatus: 'NOT_STARTED', dependencyRisk: 'NONE' },
  ]);

  const p4Acts = await Activity.find({ projectId: p4._id }).sort({ activityCode: 1 });
  
  // 4a. Trigger M6 Review Required by providing an ambiguous activity name (no code, bad match)
  await executionEventService.processStructuredEvent(p4._id.toString(), { activityName: 'Unknown Digging Work', reportDate: '2026-02-20T12:00:00Z', progress: 20, remarks: 'Digging started' }, 'demo.xlsx');

  // 4b. Trigger M7 Conflict by providing two conflicting updates for the exact same date
  await executionEventService.processStructuredEvent(p4._id.toString(), { activityCode: 'D001', reportDate: '2026-02-10T12:00:00Z', progress: 40, status: 'ON_TRACK', remarks: 'Survey is 40% complete' }, 'contractor_report.xlsx');
  await executionEventService.processStructuredEvent(p4._id.toString(), { activityCode: 'D001', reportDate: '2026-02-10T12:00:00Z', progress: 90, status: 'ON_TRACK', remarks: 'Survey almost done' }, 'supervisor_report.xlsx');

  console.log('[SEED] Successfully seeded 4 prototype presentation projects with M1-M8 execution logic.');
  
  // Wait a second for background processing just in case
  setTimeout(async () => {
    await mongoose.disconnect();
    process.exit(0);
  }, 1000);
}

seedPrototype().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
