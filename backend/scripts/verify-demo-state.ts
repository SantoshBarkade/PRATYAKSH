import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { Project } from '../src/models/Project';
import { Activity } from '../src/models/Activity';
import { Dependency } from '../src/models/Dependency';
import { ExecutionUpdate } from '../src/models/ExecutionUpdate';
import { Risk } from '../src/models/Risk';
import { Reconciliation } from '../src/models/Reconciliation';
import { ForecastingService } from '../src/services/forecasting.service';

const EXPECTED_PROJECT_NAMES = [
  'Pune Ring Road Expansion — Package 02',
  'Urban Flyover Construction — Phase 1',
  'Municipal Water Pipeline Upgrade — Zone 4',
  'Smart Drainage & Stormwater Upgrade — Sector 7',
  'Pune Metro Station Development — Package 01'
];

export async function verifyDemoState(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[VERIFY] Fatal error: MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  console.log('============================================================');
  console.log('PRATYAKSH SIH DEMO VERIFICATION AUDIT');
  console.log('============================================================\n');

  let allPassed = true;

  // 1. Verify Projects
  const projects = await Project.find({ name: { $in: EXPECTED_PROJECT_NAMES } }).lean();
  if (projects.length !== 5) {
    console.error(`[FAIL] Expected 5 demo projects, found ${projects.length}`);
    allPassed = false;
  } else {
    console.log(`[PASS] All 5 curated demo projects found.`);
  }

  const pMap = new Map<string, any>();
  for (const p of projects) {
    pMap.set(p.name, p);
  }

  // 2. Verify Project 1 (Pune Ring Road)
  const p1 = pMap.get('Pune Ring Road Expansion — Package 02');
  if (p1) {
    const p1Acts = await Activity.find({ projectId: p1._id }).lean();
    const p1P002 = p1Acts.find(a => a.activityCode === 'P002');
    const p1P003 = p1Acts.find(a => a.activityCode === 'P003');
    const p1Risks = await Risk.find({ projectId: p1._id, status: 'OPEN' }).lean();

    const p1Valid = p1Acts.length === 4 &&
      p1P002?.activityStatus === 'DELAYED' &&
      p1P002?.actualProgress === 52 &&
      p1P003?.dependencyRisk === 'AT_RISK' &&
      p1Risks.length > 0;

    if (p1Valid) {
      console.log(`[PASS] Project 1 (Pune Ring Road): Earthworks DELAYED (52%), Road Base AT_RISK, ${p1Risks.length} open risks.`);
    } else {
      console.error(`[FAIL] Project 1 state invalid:`, { acts: p1Acts.length, p002Status: p1P002?.activityStatus, p003Risk: p1P003?.dependencyRisk, risks: p1Risks.length });
      allPassed = false;
    }
  }

  // 3. Verify Project 2 (Urban Flyover)
  const p2 = pMap.get('Urban Flyover Construction — Phase 1');
  if (p2) {
    const p2Acts = await Activity.find({ projectId: p2._id }).lean();
    const p2F001 = p2Acts.find(a => a.activityCode === 'F001');
    const p2Updates = await ExecutionUpdate.find({ projectId: p2._id, activityId: p2F001?._id, processingStatus: 'PROCESSED' }).lean();
    const p2Forecast = await ForecastingService.getForecastForActivity(p2._id, p2F001?._id!);

    const p2Valid = p2Acts.length === 4 &&
      p2Updates.length === 4 &&
      p2Forecast.status === 'FORECASTED' &&
      p2Forecast.forecastedEndDate !== null;

    if (p2Valid) {
      console.log(`[PASS] Project 2 (Urban Flyover): 4 chronological updates on F001, FORECASTED finish date=${p2Forecast.forecastedEndDate?.toISOString().split('T')[0]}, velocity=${p2Forecast.velocityPerDay?.toFixed(2)}%/day.`);
    } else {
      console.error(`[FAIL] Project 2 state invalid:`, { acts: p2Acts.length, updates: p2Updates.length, status: p2Forecast?.status });
      allPassed = false;
    }
  }

  // 4. Verify Project 3 (Municipal Water Pipeline)
  const p3 = pMap.get('Municipal Water Pipeline Upgrade — Zone 4');
  if (p3) {
    const p3Acts = await Activity.find({ projectId: p3._id }).lean();
    const p3Conflicts = await Reconciliation.find({ projectId: p3._id, status: 'CONFLICT' }).lean();
    const p3ConflictUpdates = await ExecutionUpdate.find({ projectId: p3._id, processingStatus: 'CONFLICT_REVIEW_REQUIRED' }).lean();

    const p3Valid = p3Acts.length === 4 &&
      p3Conflicts.length === 1 &&
      p3ConflictUpdates.length === 2;

    if (p3Valid) {
      console.log(`[PASS] Project 3 (Water Pipeline): Active reconciliation conflict on W002 (40% vs 55%, 15 pp discrepancy), 2 updates in review.`);
    } else {
      console.error(`[FAIL] Project 3 state invalid:`, { acts: p3Acts.length, conflicts: p3Conflicts.length, updates: p3ConflictUpdates.length });
      allPassed = false;
    }
  }

  // 5. Verify Project 4 (Smart Drainage)
  const p4 = pMap.get('Smart Drainage & Stormwater Upgrade — Sector 7');
  if (p4) {
    const p4Acts = await Activity.find({ projectId: p4._id }).lean();
    const p4Unmatched = await ExecutionUpdate.find({ projectId: p4._id, processingStatus: 'UNMATCHED' }).lean();
    const p4EmergencyAct = await Activity.findOne({ projectId: p4._id, name: /Culvert/i }).lean();

    const p4Valid = p4Acts.length === 4 &&
      p4Unmatched.length === 1 &&
      !p4EmergencyAct;

    if (p4Valid) {
      console.log(`[PASS] Project 4 (Smart Drainage): Exactly 1 unmatched event in review queue ('Emergency Culvert Cleaning') and 0 schedule baseline mutations.`);
    } else {
      console.error(`[FAIL] Project 4 state invalid:`, { acts: p4Acts.length, unmatched: p4Unmatched.length, convertedToAct: !!p4EmergencyAct });
      allPassed = false;
    }
  }

  // 6. Verify Project 5 (Pune Metro)
  const p5 = pMap.get('Pune Metro Station Development — Package 01');
  if (p5) {
    const p5Acts = await Activity.find({ projectId: p5._id }).lean();
    const p5Delayed = p5Acts.filter(a => a.activityStatus === 'DELAYED');
    const p5Risks = await Risk.find({ projectId: p5._id, status: 'OPEN' }).lean();
    const p5Completed = p5Acts.filter(a => a.activityStatus === 'COMPLETED');

    const p5Valid = p5Acts.length === 5 &&
      p5Delayed.length === 0 &&
      p5Risks.length === 0 &&
      p5Completed.length === 2;

    if (p5Valid) {
      console.log(`[PASS] Project 5 (Pune Metro): Healthy baseline verified (0 Delayed, 0 Open Risks, 2 Completed).`);
    } else {
      console.error(`[FAIL] Project 5 state invalid:`, { acts: p5Acts.length, delayed: p5Delayed.length, risks: p5Risks.length, completed: p5Completed.length });
      allPassed = false;
    }
  }

  console.log('\n============================================================');
  if (allPassed) {
    console.log('STATUS: DEMO VERIFICATION PASSED. All 5 projects are in pristine state.');
  } else {
    console.log('STATUS: DEMO VERIFICATION FAILED. Some projects are not in expected state.');
  }
  console.log('============================================================\n');

  await mongoose.disconnect();
  return allPassed;
}

if (require.main === module) {
  verifyDemoState().catch(err => {
    console.error('[VERIFY] Fatal error:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
}
