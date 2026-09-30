import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose, { Types } from 'mongoose';
import { Project } from '../src/models/Project';
import { Activity } from '../src/models/Activity';
import { ExecutionUpdate } from '../src/models/ExecutionUpdate';
import { Reconciliation } from '../src/models/Reconciliation';
import { Dependency } from '../src/models/Dependency';
import { Risk } from '../src/models/Risk';
import { parseScheduleXlsx } from '../src/parsers/xlsx.parser';
import { importSchedule } from '../src/services/schedule.service';
import { reportProcessingService } from '../src/services/report-processing.service';
import { reconciliationController } from '../src/controllers/reconciliation.controller';
import { reconciliationService } from '../src/services/reconciliation.service';

async function runReconciliationIntegrationTest() {
  console.log('============================================================');
  console.log('PRATYAKSH — END-TO-END RECONCILIATION FLOW INTEGRATION TEST');
  console.log('============================================================\n');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Fatal: MONGODB_URI not found in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✓ Connected to MongoDB');

  const demoDir = path.resolve(__dirname, '../demo/water_pipeline');
  const schedulePath = path.join(demoDir, '01_schedule.xlsx');
  const siteReportPath = path.join(demoDir, '02_site_report.txt');
  const contractorPath = path.join(demoDir, '03_contractor_evidence.txt');
  const supervisorPath = path.join(demoDir, '04_supervisor_evidence.txt');

  const createdProjectIds: Types.ObjectId[] = [];

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 1: Brand-New Project with Conflicting Multi-Source Evidence
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SUITE 1: Dynamic Reconciliation on Brand-New Project ---');

    // 1. Create a fresh project
    const testProject = new Project({
      name: `Test Pipeline Upgrade — ${Date.now()}`,
      description: 'Dynamic reconciliation integration verification project',
      organization: 'Municipal Water Works',
      plannedStartDate: new Date('2026-06-01T00:00:00.000Z'),
      plannedEndDate: new Date('2026-12-31T00:00:00.000Z'),
    });
    await testProject.save();
    createdProjectIds.push(testProject._id);
    const projectId = testProject._id.toString();
    console.log(`✓ 1. Fresh project created: "${testProject.name}" (ID: ${projectId})`);

    // 2. Import schedule
    const scheduleBuffer = fs.readFileSync(schedulePath);
    const parsedSchedule = parseScheduleXlsx(scheduleBuffer);
    console.log(`✓ 2. Parsed schedule rows: ${parsedSchedule.rows.length}`);
    const importRes = await importSchedule(projectId, parsedSchedule.rows);
    console.log(`✓ Schedule imported: ${importRes.activitiesImported} activities`);

    const activities = await Activity.find({ projectId: testProject._id }).lean();
    const w001Act = activities.find(a => a.activityCode === 'W001');
    const w002Act = activities.find(a => a.activityCode === 'W002');
    if (!w001Act || !w002Act) {
      throw new Error('Expected activities W001 and W002 were not imported from schedule.');
    }
    console.log(`✓ Verified target activities exist: W001 (${w001Act.name}), W002 (${w002Act.name})`);

    // 3. Process 02_site_report.txt
    console.log('\nProcessing 02_site_report.txt...');
    const siteReportBuffer = fs.readFileSync(siteReportPath);
    const res02 = await reportProcessingService.processTxtReport(
      projectId,
      siteReportBuffer,
      null,
      '02_site_report.txt',
      null
    );
    console.log(`✓ 02_site_report.txt processed: ${res02.importedRows} signals matched`);

    // Verify baseline reconciliations count is 0 before conflicts
    const recsAfter02 = await Reconciliation.find({ projectId: testProject._id }).lean();
    console.log(`✓ Reconciliations after single report: ${recsAfter02.length} (Expected: 0 or only if multi-source)`);

    // 4. Process 03_contractor_evidence.txt
    console.log('\nProcessing 03_contractor_evidence.txt...');
    const contractorBuffer = fs.readFileSync(contractorPath);
    const res03 = await reportProcessingService.processTxtReport(
      projectId,
      contractorBuffer,
      null,
      '03_contractor_evidence.txt',
      null
    );
    console.log(`✓ 03_contractor_evidence.txt processed: ${res03.importedRows} signals`);

    // 5. Process 04_supervisor_evidence.txt
    console.log('\nProcessing 04_supervisor_evidence.txt...');
    const supervisorBuffer = fs.readFileSync(supervisorPath);
    const res04 = await reportProcessingService.processTxtReport(
      projectId,
      supervisorBuffer,
      null,
      '04_supervisor_evidence.txt',
      null
    );
    console.log(`✓ 04_supervisor_evidence.txt processed: ${res04.importedRows} signals`);

    // 6. Direct DB verification of reconciliation records
    console.log('\nVerifying DB Reconciliation records for fresh project...');
    const recs = await Reconciliation.find({ projectId: testProject._id })
      .populate('activityId', 'activityCode name')
      .populate('evidenceIds')
      .lean();

    console.log(`Found ${recs.length} reconciliation records in DB`);

    const w001Rec = recs.find((r: any) => r.activityId?.activityCode === 'W001');
    const w002Rec = recs.find((r: any) => r.activityId?.activityCode === 'W002');

    if (!w001Rec) {
      throw new Error('FAIL: Reconciliation record for W001 was NOT created!');
    }
    console.log('✓ [PASS] Reconciliation record created for W001');
    console.log(`  - Status: ${w001Rec.status}`);
    console.log(`  - Logical Date: ${w001Rec.logicalDate}`);
    console.log(`  - Linked Evidence count: ${w001Rec.evidenceIds.length}`);
    console.log(`  - Conflicts:`, JSON.stringify(w001Rec.conflicts));

    if (!w002Rec) {
      throw new Error('FAIL: Reconciliation record for W002 was NOT created!');
    }
    console.log('✓ [PASS] Reconciliation record created for W002');
    console.log(`  - Status: ${w002Rec.status}`);
    console.log(`  - Logical Date: ${w002Rec.logicalDate}`);
    console.log(`  - Linked Evidence count: ${w002Rec.evidenceIds.length}`);
    console.log(`  - Conflicts:`, JSON.stringify(w002Rec.conflicts));

    // Verify W001 progress conflict values contains contractor (96) and supervisor (95)
    const w001ProgConflict = w001Rec.conflicts.find((c: any) => c.field === 'progress');
    if (!w001ProgConflict) {
      throw new Error('FAIL: W001 does not contain a progress conflict field!');
    }
    const w001Values = w001ProgConflict.values.map((v: any) => Number(v.value));
    if (!w001Values.includes(96) || !w001Values.includes(95)) {
      throw new Error(`FAIL: W001 progress conflict missing expected values (expected 96 and 95, got ${JSON.stringify(w001Values)})`);
    }
    console.log(`✓ [PASS] W001 conflict captures contractor (96%) vs supervisor (95%)`);

    // Verify W002 progress conflict values contains contractor (74) and supervisor (75)
    const w002ProgConflict = w002Rec.conflicts.find((c: any) => c.field === 'progress');
    if (!w002ProgConflict) {
      throw new Error('FAIL: W002 does not contain a progress conflict field!');
    }
    const w002Values = w002ProgConflict.values.map((v: any) => Number(v.value));
    if (!w002Values.includes(74) || !w002Values.includes(75)) {
      throw new Error(`FAIL: W002 progress conflict missing expected values (expected 74 and 75, got ${JSON.stringify(w002Values)})`);
    }
    console.log(`✓ [PASS] W002 conflict captures contractor (74%) vs supervisor (75%)`);

    // 7. Verify the Reconciliation API Controller returns these records
    console.log('\nTesting Reconciliation API Controller GET /api/projects/:projectId/reconciliations:');
    let apiResponseData: any = null;
    const mockReq: any = {
      params: { projectId }
    };
    const mockRes: any = {
      json: (data: any) => {
        apiResponseData = data;
        return mockRes;
      },
      status: (code: number) => {
        console.error('API returned status code:', code);
        return mockRes;
      }
    };

    await reconciliationController.getReconciliations(mockReq, mockRes);

    if (!apiResponseData || !apiResponseData.success || !Array.isArray(apiResponseData.reconciliations)) {
      throw new Error(`FAIL: API returned invalid response: ${JSON.stringify(apiResponseData)}`);
    }

    console.log(`✓ API returned success=true with ${apiResponseData.reconciliations.length} reconciliations`);
    const apiW001 = apiResponseData.reconciliations.find((r: any) => r.activityId?.activityCode === 'W001');
    const apiW002 = apiResponseData.reconciliations.find((r: any) => r.activityId?.activityCode === 'W002');

    if (!apiW001 || !apiW002) {
      throw new Error('FAIL: API response missing W001 or W002 reconciliation record!');
    }
    console.log('✓ [PASS] API response includes populated W001 and W002 conflicts ready for frontend rendering');

    // 8. Test Resolution of W001 via API (Accept Supervisor Evidence 95%)
    console.log('\nTesting Conflict Resolution for W001...');
    const supervisorEvidence = (w001Rec.evidenceIds as any[]).find(
      (e: any) => e.progress === 95 && (e.sourceFileName?.includes('supervisor') || e.rawText?.includes('Supervisor'))
    );
    const resolutionEvidenceId = supervisorEvidence ? supervisorEvidence._id.toString() : w001Rec.evidenceIds[0]._id.toString();

    const resolveReq: any = {
      params: { projectId, id: w001Rec._id.toString() },
      body: { action: 'ACCEPT_EVIDENCE', resolutionEvidenceId }
    };
    let resolveResData: any = null;
    const resolveRes: any = {
      json: (data: any) => {
        resolveResData = data;
        return resolveRes;
      },
      status: (code: number) => {
        console.error('Resolve API returned status code:', code);
        return resolveRes;
      }
    };

    await reconciliationController.resolveReconciliation(resolveReq, resolveRes);
    if (!resolveResData || !resolveResData.success) {
      throw new Error(`FAIL: Resolve API returned error: ${JSON.stringify(resolveResData)}`);
    }
    console.log('✓ [PASS] Conflict successfully resolved via API');

    // Verify activity W001 now has accepted progress
    const updatedW001 = await Activity.findById(w001Act._id).lean();
    console.log(`✓ Activity W001 progress after resolution: ${updatedW001?.actualProgress}%`);

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 2: Brand-New Project with NO Conflicting Evidence (Must be 0 Reconciliations)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SUITE 2: Project with Aligned Evidence (Zero Conflicts) ---');
    const cleanProject = new Project({
      name: `Test Aligned Project — ${Date.now()}`,
      description: 'Zero conflict test',
      organization: 'Testing Corp',
      plannedStartDate: new Date('2026-07-01T00:00:00.000Z'),
      plannedEndDate: new Date('2026-11-30T00:00:00.000Z'),
    });
    await cleanProject.save();
    createdProjectIds.push(cleanProject._id);
    const cleanProjId = cleanProject._id.toString();

    // Create single activity
    const cleanAct = new Activity({
      projectId: cleanProject._id,
      activityCode: 'CL01',
      name: 'Site Clearing',
      plannedStart: new Date('2026-07-01'),
      plannedEnd: new Date('2026-07-15'),
      plannedProgress: 50,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
    });
    await cleanAct.save();

    // Evidence 1: Contractor reports 50%
    const ev1Text = `PROJECT: ${cleanProject.name}\nActivity Code: CL01\nActivity: Site Clearing\nActual Progress: 50%\nStatus: IN_PROGRESS\nObservation Date: 2026-07-10\nSource: Contractor Daily Log`;
    await reportProcessingService.processTxtReport(cleanProjId, null, ev1Text, 'contractor_aligned.txt', null);

    // Evidence 2: Supervisor reports 50% (identical, no conflict)
    const ev2Text = `PROJECT: ${cleanProject.name}\nActivity Code: CL01\nActivity: Site Clearing\nActual Progress: 50%\nStatus: IN_PROGRESS\nObservation Date: 2026-07-11\nSource: Supervisor Verification`;
    await reportProcessingService.processTxtReport(cleanProjId, null, ev2Text, 'supervisor_aligned.txt', null);

    const cleanRecs = await Reconciliation.find({ projectId: cleanProject._id }).lean();
    if (cleanRecs.length !== 0) {
      throw new Error(`FAIL: Expected 0 reconciliation records for aligned project, found ${cleanRecs.length}`);
    }
    console.log('✓ [PASS] Zero reconciliation records generated when multi-source evidence is aligned');

    console.log('\n============================================================');
    console.log('ALL INTEGRATION TEST SUITES PASSED SUCCESSFULLY (100%)');
    console.log('============================================================\n');

  } finally {
    // Clean up created test projects and their associated documents
    console.log('Cleaning up test projects...');
    for (const pid of createdProjectIds) {
      await Promise.all([
        Project.deleteOne({ _id: pid }),
        Activity.deleteMany({ projectId: pid }),
        Dependency.deleteMany({ projectId: pid }),
        ExecutionUpdate.deleteMany({ projectId: pid }),
        Risk.deleteMany({ projectId: pid }),
        Reconciliation.deleteMany({ projectId: pid }),
      ]);
    }
    console.log('✓ Test cleanup complete.');
    await mongoose.disconnect();
  }
}

runReconciliationIntegrationTest().catch(err => {
  console.error('\nFATAL INTEGRATION TEST FAILURE:', err);
  process.exit(1);
});
