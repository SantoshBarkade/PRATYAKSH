import fs from 'fs';
import path from 'path';
import { reportProcessingService } from '../src/services/report-processing.service';
import { Project } from '../src/models/Project';
import { Activity } from '../src/models/Activity';
import { ExecutionUpdate } from '../src/models/ExecutionUpdate';
import { matchingService } from '../src/services/matching.service';
import { Types } from 'mongoose';

// Ensure mock or in-memory project behavior for standalone testing without network dependencies
async function runIntegrationTest() {
  console.log('============================================================');
  console.log('PRATYAKSH / INFRA LINK — ENDPOINT INTEGRATION TEST');
  console.log('============================================================\n');

  const urbanFlyoverId = new Types.ObjectId('6ab02bea0f6f7019e710e660');
  const puneRingRoadId = new Types.ObjectId('6ab02be80f6f7019e710e602');

  const mockUrbanFlyoverProject = {
    _id: urbanFlyoverId,
    name: 'Urban Flyover Construction — Phase 1',
    plannedStartDate: new Date('2026-03-01T00:00:00.000Z'),
    plannedEndDate: new Date('2026-12-31T00:00:00.000Z'),
  };

  const mockPuneRingRoadProject = {
    _id: puneRingRoadId,
    name: 'Pune Ring Road Expansion — Package 02',
    plannedStartDate: new Date('2026-05-01T00:00:00.000Z'),
    plannedEndDate: new Date('2026-08-31T00:00:00.000Z'),
  };

  const urbanFlyoverActivities = [
    { _id: new Types.ObjectId(), activityCode: 'F001', name: 'Pile Foundation', projectId: urbanFlyoverId },
    { _id: new Types.ObjectId(), activityCode: 'F002', name: 'Pier Construction', projectId: urbanFlyoverId },
    { _id: new Types.ObjectId(), activityCode: 'F003', name: 'Deck Slab Preparation', projectId: urbanFlyoverId },
    { _id: new Types.ObjectId(), activityCode: 'F004', name: 'Approach Road', projectId: urbanFlyoverId },
    { _id: new Types.ObjectId(), activityCode: 'F005', name: 'Drainage Works', projectId: urbanFlyoverId },
  ];

  const puneRingRoadActivities = [
    { _id: new Types.ObjectId(), activityCode: 'P001', name: 'Land Acquisition', projectId: puneRingRoadId },
    { _id: new Types.ObjectId(), activityCode: 'P002', name: 'Earthworks', projectId: puneRingRoadId },
    { _id: new Types.ObjectId(), activityCode: 'P003', name: 'Road Base Preparation', projectId: puneRingRoadId },
    { _id: new Types.ObjectId(), activityCode: 'P004', name: 'Paving', projectId: puneRingRoadId },
  ];

  // Intercept Project.findById
  (Project as any).findById = async (id: any) => {
    const idStr = id.toString();
    if (idStr === urbanFlyoverId.toString()) return mockUrbanFlyoverProject;
    if (idStr === puneRingRoadId.toString()) return mockPuneRingRoadProject;
    return mockUrbanFlyoverProject;
  };

  // Intercept Activity.find, findById, findOne
  (Activity as any).find = async (filter: any) => {
    if (filter?.projectId?.toString() === puneRingRoadId.toString()) {
      return puneRingRoadActivities;
    }
    return urbanFlyoverActivities;
  };
  (Activity as any).findById = async (id: any) => {
    const all = [...urbanFlyoverActivities, ...puneRingRoadActivities];
    const found = all.find(a => a._id.toString() === id?.toString());
    if (found) {
      return {
        ...found,
        save: async function () { return this; }
      };
    }
    return null;
  };
  (Activity as any).findOne = async (filter: any) => {
    return urbanFlyoverActivities[0];
  };

  (ExecutionUpdate.prototype as any).save = async function () {
    if (!this._id) this._id = new Types.ObjectId();
    return this;
  };
  (ExecutionUpdate as any).find = async () => [];
  (ExecutionUpdate as any).findOne = async () => null;
  (ExecutionUpdate as any).findById = async () => null;

  // Intercept Dependency and Risk to prevent buffering
  const { Dependency } = require('../src/models/Dependency');
  const { Risk } = require('../src/models/Risk');
  const { Reconciliation } = require('../src/models/Reconciliation');
  (Dependency as any).find = async () => [];
  (Risk as any).find = async () => [];
  (Risk as any).deleteMany = async () => ({ deletedCount: 0 });
  (Reconciliation as any).find = async () => [];
  (Reconciliation as any).findOne = async () => null;

  const reportsDir = path.resolve(__dirname, '../demo/reports');

  // ─── TEST 1: 02_site_report.txt (Urban Flyover) ────────────────────────────
  console.log('1. Testing 02_site_report.txt for Urban Flyover:');
  const buffer02 = fs.readFileSync(path.join(reportsDir, '02_site_report.txt'));
  const res02 = await reportProcessingService.processTxtReport(
    urbanFlyoverId.toString(),
    buffer02,
    null,
    '02_site_report.txt',
    null
  );

  console.log(`   • importedRows: ${res02.importedRows}`);
  console.log(`   • matched: ${res02.result.matchedActivities}, unmatched: ${res02.result.unmatchedActivities}`);
  console.log(`   • extractionMethod: ${res02.result.extractionMethod}`);
  for (const ev of res02.results) {
    console.log(`     - [${ev.activityCode}] actualProgress: ${ev.actualProgress}% | status: ${ev.processingStatus} | matchScore: ${ev.matching?.matchScore}`);
  }

  if (res02.importedRows === 5 && res02.results[0]?.actualProgress === 95 && res02.results[0]?.activityCode === 'F001') {
    console.log('   ✓ [PASS] 02_site_report.txt produces 5 signals with F001 -> 95%');
  } else {
    console.error('   ✗ [FAIL] 02_site_report.txt did not produce expected signals');
    process.exit(1);
  }

  // ─── TEST 2: 03_contractor_evidence.txt ────────────────────────────────────
  console.log('\n2. Testing 03_contractor_evidence.txt for Urban Flyover:');
  const buffer03 = fs.readFileSync(path.join(reportsDir, '03_contractor_evidence.txt'));
  const res03 = await reportProcessingService.processTxtReport(
    urbanFlyoverId.toString(),
    buffer03,
    null,
    '03_contractor_evidence.txt',
    null
  );
  console.log(`   • importedRows: ${res03.importedRows}`);
  for (const ev of res03.results) {
    console.log(`     - [${ev.activityCode}] actualProgress: ${ev.actualProgress}% | status: ${ev.processingStatus}`);
  }
  if (res03.importedRows === 2 && res03.results[0]?.actualProgress === 96 && res03.results[1]?.actualProgress === 74) {
    console.log('   ✓ [PASS] 03_contractor_evidence.txt produces 2 signals (F001 -> 96%, F002 -> 74%)');
  } else {
    console.error('   ✗ [FAIL] 03_contractor_evidence.txt failed');
    process.exit(1);
  }

  // ─── TEST 3: 04_supervisor_evidence.txt ────────────────────────────────────
  console.log('\n3. Testing 04_supervisor_evidence.txt for Urban Flyover:');
  const buffer04 = fs.readFileSync(path.join(reportsDir, '04_supervisor_evidence.txt'));
  const res04 = await reportProcessingService.processTxtReport(
    urbanFlyoverId.toString(),
    buffer04,
    null,
    '04_supervisor_evidence.txt',
    null
  );
  console.log(`   • importedRows: ${res04.importedRows}`);
  for (const ev of res04.results) {
    console.log(`     - [${ev.activityCode}] actualProgress: ${ev.actualProgress}% | status: ${ev.processingStatus}`);
  }
  if (res04.importedRows === 2 && res04.results[0]?.actualProgress === 95 && res04.results[1]?.actualProgress === 75) {
    console.log('   ✓ [PASS] 04_supervisor_evidence.txt produces 2 signals (F001 -> 95%, F002 -> 75%)');
  } else {
    console.error('   ✗ [FAIL] 04_supervisor_evidence.txt failed');
    process.exit(1);
  }

  // ─── TEST 4: 05_unknown_field_memo.txt (Pune Ring Road) ───────────────────
  console.log('\n4. Testing 05_unknown_field_memo.txt for Pune Ring Road:');
  const buffer05 = fs.readFileSync(path.join(reportsDir, '05_unknown_field_memo.txt'));
  const res05 = await reportProcessingService.processTxtReport(
    puneRingRoadId.toString(),
    buffer05,
    null,
    '05_unknown_field_memo.txt',
    null
  );
  console.log(`   • importedRows: ${res05.importedRows}`);
  console.log(`   • matched: ${res05.result.matchedActivities}, unmatched: ${res05.result.unmatchedActivities}`);
  for (const ev of res05.results) {
    console.log(`     - [${ev.activityCode}] actualProgress: ${ev.actualProgress}% | processingStatus: ${ev.processingStatus} | matchingDecision: ${ev.matchingDecision}`);
  }
  if (res05.importedRows === 1 && res05.results[0]?.activityCode === 'EMERGENCY-01' && res05.results[0]?.processingStatus === 'UNMATCHED') {
    console.log('   ✓ [PASS] 05_unknown_field_memo.txt produces 1 signal (EMERGENCY-01 -> 20%) routed to UNMATCHED');
  } else {
    console.error('   ✗ [FAIL] 05_unknown_field_memo.txt failed');
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('ALL 4 DEMO FILES VERIFIED END-TO-END WITH EXPECTED SIGNALS');
  console.log('============================================================\n');
}

runIntegrationTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
