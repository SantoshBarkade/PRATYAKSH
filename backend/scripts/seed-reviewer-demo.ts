import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose, { Types } from 'mongoose';
import { Project } from '../src/models/Project';
import { Activity } from '../src/models/Activity';
import { Dependency } from '../src/models/Dependency';
import { ExecutionUpdate } from '../src/models/ExecutionUpdate';
import { Risk } from '../src/models/Risk';
import { Reconciliation } from '../src/models/Reconciliation';
import { executionEventService } from '../src/services/execution-event.service';
import { ForecastingService } from '../src/services/forecasting.service';
import { riskService } from '../src/services/risk.service';

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

async function seedReviewerDemo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[RESET & SEED] Fatal error: MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;

  console.log('============================================================');
  console.log('INFRA LINK — REVIEWER DEMO DATABASE RESET & CURATED SEED');
  console.log('============================================================');
  console.log(`Connected to target host: ${host}`);
  console.log(`Target database: ${dbName}`);
  console.log('Target collections to clear: projects, activities, dependencies, executionupdates, risks, reconciliations');
  console.log('============================================================');

  // Pre-reset counts
  const [
    preProjects,
    preActivities,
    preDependencies,
    preExecution,
    preRisks,
    preReconciliations
  ] = await Promise.all([
    Project.countDocuments(),
    Activity.countDocuments(),
    Dependency.countDocuments(),
    ExecutionUpdate.countDocuments(),
    Risk.countDocuments(),
    Reconciliation.countDocuments()
  ]);

  console.log('PRE-RESET DOCUMENT COUNTS:');
  console.log(`  Projects:            ${preProjects}`);
  console.log(`  Activities:          ${preActivities}`);
  console.log(`  Dependencies:        ${preDependencies}`);
  console.log(`  Execution Updates:   ${preExecution}`);
  console.log(`  Risks:               ${preRisks}`);
  console.log(`  Reconciliations:     ${preReconciliations}`);
  console.log('------------------------------------------------------------');

  console.log('[RESET] Executing safe deletion of project-related collections...');
  await Project.deleteMany({});
  await Activity.deleteMany({});
  await Dependency.deleteMany({});
  await ExecutionUpdate.deleteMany({});
  await Risk.deleteMany({});
  await Reconciliation.deleteMany({});

  // Clean legacy test collections if present in database
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const colNames = collections.map(c => c.name);
    if (colNames.includes('scheduleactivities')) {
      await mongoose.connection.db.collection('scheduleactivities').deleteMany({});
      console.log('[RESET] Cleared legacy collection: scheduleactivities');
    }
    if (colNames.includes('reports')) {
      await mongoose.connection.db.collection('reports').deleteMany({});
      console.log('[RESET] Cleared legacy collection: reports');
    }
  }
  console.log('[RESET] Collections successfully reset to 0.');
  console.log('============================================================\n');

  // =========================================================================
  // PROJECT 1: Pune Ring Road Expansion — Package 02
  // PURPOSE: Demonstrate the core INFRA LINK planning-to-execution bridge.
  // Land Acquisition (100%) -> Earthworks (DELAYED) -> Road Base (AT RISK) -> Paving
  // =========================================================================
  console.log('[SEED] Creating Project 1: Pune Ring Road Expansion — Package 02...');
  const p1 = await Project.create({
    name: 'Pune Ring Road Expansion — Package 02',
    organization: 'MSRDC',
    description: '6-lane access-controlled western bypass corridor linking NH-48 and SH-27.',
    plannedStartDate: d(2026, 5, 1),
    plannedEndDate: d(2026, 8, 31),
  });

  const p1Activities = await Activity.insertMany([
    {
      projectId: p1._id,
      activityCode: 'P001',
      name: 'Land Acquisition',
      description: 'Right-of-way acquisition and resettlement clearance for Package 02 corridor',
      plannedStart: d(2026, 5, 1),
      plannedEnd: d(2026, 5, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p1._id,
      activityCode: 'P002',
      name: 'Earthworks',
      description: 'Embankment formation, subgrade cutting, and compaction from Ch. 12+000 to 24+000',
      plannedStart: d(2026, 6, 1),
      plannedEnd: d(2026, 6, 20),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p1._id,
      activityCode: 'P003',
      name: 'Road Base Preparation',
      description: 'Wet Mix Macadam (WMM) base course laying and granular sub-base layer',
      plannedStart: d(2026, 6, 21),
      plannedEnd: d(2026, 7, 15),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p1._id,
      activityCode: 'P004',
      name: 'Paving',
      description: 'Dense Bituminous Macadam (DBM) and Bituminous Concrete wearing course',
      plannedStart: d(2026, 7, 16),
      plannedEnd: d(2026, 8, 15),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    }
  ]);

  const p1Map = new Map(p1Activities.map(a => [a.activityCode, a._id]));
  await Dependency.insertMany([
    { projectId: p1._id, predecessorActivityId: p1Map.get('P001')!, successorActivityId: p1Map.get('P002')!, relationship: 'FINISH_TO_START' },
    { projectId: p1._id, predecessorActivityId: p1Map.get('P002')!, successorActivityId: p1Map.get('P003')!, relationship: 'FINISH_TO_START' },
    { projectId: p1._id, predecessorActivityId: p1Map.get('P003')!, successorActivityId: p1Map.get('P004')!, relationship: 'FINISH_TO_START' },
  ]);

  // Evidence for Project 1: P001 finishes at 100%
  await executionEventService.processStructuredEvent(p1._id.toString(), {
    activityCode: 'P001',
    reportDate: '2026-05-30T12:00:00Z',
    progress: 100,
    status: 'COMPLETED',
    remarks: '100% of ROW acquired and handed over to contractor without encumbrance'
  }, 'row_clearance_signoff.xlsx');

  // Evidence for Project 1: P002 has multiple dated observations showing it is behind plan
  await executionEventService.processStructuredEvent(p1._id.toString(), {
    activityCode: 'P002',
    reportDate: '2026-06-05T12:00:00Z',
    progress: 20,
    status: 'ON_TRACK',
    remarks: 'Initial clearing, grubbing and topsoil stripping'
  }, 'earthworks_weekly_log_w1.xlsx');

  await executionEventService.processStructuredEvent(p1._id.toString(), {
    activityCode: 'P002',
    reportDate: '2026-06-15T12:00:00Z',
    progress: 38,
    status: 'DELAYED',
    remarks: 'Hard rock formation encountered in cutting zone Km 14+200; blasting clearance delayed'
  }, 'earthworks_weekly_log_w2.xlsx');

  await executionEventService.processStructuredEvent(p1._id.toString(), {
    activityCode: 'P002',
    reportDate: '2026-06-25T12:00:00Z',
    progress: 52,
    status: 'DELAYED',
    remarks: 'Earthworks lagging behind schedule; excavator breakdown and heavy unseasonal monsoon shower'
  }, 'earthworks_weekly_log_w3.xlsx');

  // Re-verify risks for P1
  await riskService.propagateRisks(p1._id.toString());
  console.log('[SEED] Project 1 created with delayed Earthworks and propagated downstream risks.\n');


  // =========================================================================
  // PROJECT 2: Urban Flyover Construction — Phase 1
  // PURPOSE: Demonstrate deterministic forecast capability.
  // F001 Piers Construction with 4 chronological monotonically increasing updates.
  // =========================================================================
  console.log('[SEED] Creating Project 2: Urban Flyover Construction — Phase 1...');
  const p2 = await Project.create({
    name: 'Urban Flyover Construction — Phase 1',
    organization: 'PWD',
    description: 'Elevated 4-lane grade separator across busy arterial intersections.',
    plannedStartDate: d(2026, 3, 1),
    plannedEndDate: d(2026, 12, 31),
  });

  const p2Activities = await Activity.insertMany([
    {
      projectId: p2._id,
      activityCode: 'F001',
      name: 'Piers Construction',
      description: 'Foundation piles, pile caps, and RCC pier columns P1 through P14',
      plannedStart: d(2026, 3, 1),
      plannedEnd: d(2026, 6, 30),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p2._id,
      activityCode: 'F002',
      name: 'Deck Casting',
      description: 'Prestressed concrete girder launching and in-situ deck slab casting',
      plannedStart: d(2026, 7, 1),
      plannedEnd: d(2026, 9, 30),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p2._id,
      activityCode: 'F003',
      name: 'Approach Slab',
      description: 'Reinforced concrete approach transition slabs at North and South abutments',
      plannedStart: d(2026, 10, 1),
      plannedEnd: d(2026, 11, 15),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p2._id,
      activityCode: 'F004',
      name: 'Road Surfacing',
      description: 'Mastic asphalt waterproofing layer and friction course surfacing',
      plannedStart: d(2026, 11, 16),
      plannedEnd: d(2026, 12, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    }
  ]);

  const p2Map = new Map(p2Activities.map(a => [a.activityCode, a._id]));
  await Dependency.insertMany([
    { projectId: p2._id, predecessorActivityId: p2Map.get('F001')!, successorActivityId: p2Map.get('F002')!, relationship: 'FINISH_TO_START' },
    { projectId: p2._id, predecessorActivityId: p2Map.get('F002')!, successorActivityId: p2Map.get('F003')!, relationship: 'FINISH_TO_START' },
    { projectId: p2._id, predecessorActivityId: p2Map.get('F003')!, successorActivityId: p2Map.get('F004')!, relationship: 'FINISH_TO_START' },
  ]);

  // F001: 4 chronological observations with steady monotonic progress
  await executionEventService.processStructuredEvent(p2._id.toString(), {
    activityCode: 'F001',
    reportDate: '2026-03-15T12:00:00Z',
    progress: 10,
    status: 'ON_TRACK',
    remarks: 'Bored cast-in-situ piles and reinforcement cage fabrication started'
  }, 'flyover_monthly_log_march.xlsx');

  await executionEventService.processStructuredEvent(p2._id.toString(), {
    activityCode: 'F001',
    reportDate: '2026-04-15T12:00:00Z',
    progress: 40,
    status: 'ON_TRACK',
    remarks: 'Pier columns P1 to P6 concreted and cured'
  }, 'flyover_monthly_log_april.xlsx');

  await executionEventService.processStructuredEvent(p2._id.toString(), {
    activityCode: 'F001',
    reportDate: '2026-05-15T12:00:00Z',
    progress: 75,
    status: 'ON_TRACK',
    remarks: 'Pier caps shuttering, post-tensioning and casting progressing smoothly'
  }, 'flyover_monthly_log_may.xlsx');

  await executionEventService.processStructuredEvent(p2._id.toString(), {
    activityCode: 'F001',
    reportDate: '2026-06-15T12:00:00Z',
    progress: 95,
    status: 'ON_TRACK',
    remarks: 'Elastomeric bearing installation and load testing in final stage'
  }, 'flyover_monthly_log_june.xlsx');

  console.log('[SEED] Project 2 created with 4 chronological progress observations for M8 forecast.\n');


  // =========================================================================
  // PROJECT 3: Municipal Water Pipeline Upgrade — Zone 4
  // PURPOSE: Demonstrate multi-source evidence reconciliation (conflict on W002, aligned on W001).
  // =========================================================================
  console.log('[SEED] Creating Project 3: Municipal Water Pipeline Upgrade — Zone 4...');
  const p3 = await Project.create({
    name: 'Municipal Water Pipeline Upgrade — Zone 4',
    organization: 'Municipal Corporation',
    description: 'Augmentation of primary feeder pipeline with 900mm ductile iron conduits.',
    plannedStartDate: d(2026, 1, 5),
    plannedEndDate: d(2026, 8, 31),
  });

  const p3Activities = await Activity.insertMany([
    {
      projectId: p3._id,
      activityCode: 'W001',
      name: 'Utility Mapping',
      description: 'Ground penetrating radar (GPR) scan and trial pits for underground services',
      plannedStart: d(2026, 1, 5),
      plannedEnd: d(2026, 1, 25),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p3._id,
      activityCode: 'W002',
      name: 'Trenching',
      description: 'Mechanical trench excavation, dewatering, and trench sheeting',
      plannedStart: d(2026, 1, 26),
      plannedEnd: d(2026, 4, 15),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p3._id,
      activityCode: 'W003',
      name: 'Pipe Laying',
      description: 'Lowering, aligning, jointing and hydrostatic pressure testing of DI pipes',
      plannedStart: d(2026, 4, 16),
      plannedEnd: d(2026, 7, 15),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p3._id,
      activityCode: 'W004',
      name: 'Backfilling',
      description: 'Granular bedding placement, backfilling in layers, and surface compaction',
      plannedStart: d(2026, 7, 16),
      plannedEnd: d(2026, 8, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    }
  ]);

  const p3Map = new Map(p3Activities.map(a => [a.activityCode, a._id]));
  await Dependency.insertMany([
    { projectId: p3._id, predecessorActivityId: p3Map.get('W001')!, successorActivityId: p3Map.get('W002')!, relationship: 'FINISH_TO_START' },
    { projectId: p3._id, predecessorActivityId: p3Map.get('W002')!, successorActivityId: p3Map.get('W003')!, relationship: 'FINISH_TO_START' },
    { projectId: p3._id, predecessorActivityId: p3Map.get('W003')!, successorActivityId: p3Map.get('W004')!, relationship: 'FINISH_TO_START' },
  ]);

  // Aligned Evidence Example on W001
  await executionEventService.processStructuredEvent(p3._id.toString(), {
    activityCode: 'W001',
    reportDate: '2026-01-25T12:00:00Z',
    progress: 100,
    status: 'COMPLETED',
    remarks: 'Contractor report: GPR utility scanning completed along full 2.4 km stretch'
  }, 'contractor_utility_survey.xlsx');

  await executionEventService.processStructuredEvent(p3._id.toString(), {
    activityCode: 'W001',
    reportDate: '2026-01-25T12:00:00Z',
    progress: 100,
    status: 'COMPLETED',
    remarks: 'Independent consultant inspection: Confirmed 100% utility identification and marking'
  }, 'consultant_verification_report.xlsx');

  // Conflicting Evidence Example on W002 (Trenching on same logical date 2026-03-20)
  // Source A: Contractor says 40% (delayed)
  await executionEventService.processStructuredEvent(p3._id.toString(), {
    activityCode: 'W002',
    reportDate: '2026-03-20T12:00:00Z',
    progress: 40,
    status: 'DELAYED',
    remarks: 'Contractor claim: Hard rock stratum at chainage 1+100 slowed progress to 40%'
  }, 'contractor_billing_march.xlsx');

  // Source B: PMU Field Supervisor says 55% (difference = 15 pp > 5 pp threshold)
  await executionEventService.processStructuredEvent(p3._id.toString(), {
    activityCode: 'W002',
    reportDate: '2026-03-20T12:00:00Z',
    progress: 55,
    status: 'ON_TRACK',
    remarks: 'PMU Supervisor physical audit: 1,320m of 2,400m trench excavated and shored (55%)'
  }, 'pmu_supervising_engineer_log.xlsx');

  console.log('[SEED] Project 3 created with multi-source reconciliation conflict (40% vs 55%) and aligned evidence.\n');


  // =========================================================================
  // PROJECT 4: Smart Drainage & Stormwater Upgrade — Sector 7
  // PURPOSE: Demonstrate genuinely unknown/unmatched site evidence.
  // Contains "Emergency Culvert Cleaning" which does not exist in schedule.
  // =========================================================================
  console.log('[SEED] Creating Project 4: Smart Drainage & Stormwater Upgrade — Sector 7...');
  const p4 = await Project.create({
    name: 'Smart Drainage & Stormwater Upgrade — Sector 7',
    organization: 'Smart City Development Corp',
    description: 'Precast stormwater drainage network and roadside culvert augmentation.',
    plannedStartDate: d(2026, 4, 1),
    plannedEndDate: d(2026, 8, 31),
  });

  const p4Activities = await Activity.insertMany([
    {
      projectId: p4._id,
      activityCode: 'D001',
      name: 'Site Survey',
      description: 'Corridor topographical mapping, invert level recording, and drain alignment',
      plannedStart: d(2026, 4, 1),
      plannedEnd: d(2026, 4, 20),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p4._id,
      activityCode: 'D002',
      name: 'Excavation',
      description: 'Trench excavation for precast box culverts and storm drain channels',
      plannedStart: d(2026, 4, 21),
      plannedEnd: d(2026, 5, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p4._id,
      activityCode: 'D003',
      name: 'Drain Installation',
      description: 'Laying precast RCC box drain sections, joint sealing, and weep hole installation',
      plannedStart: d(2026, 6, 1),
      plannedEnd: d(2026, 7, 20),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p4._id,
      activityCode: 'D004',
      name: 'Road Restoration',
      description: 'Granular sub-base reinstatement, pavement patching, and manhole cover fixing',
      plannedStart: d(2026, 7, 21),
      plannedEnd: d(2026, 8, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    }
  ]);

  const p4Map = new Map(p4Activities.map(a => [a.activityCode, a._id]));
  await Dependency.insertMany([
    { projectId: p4._id, predecessorActivityId: p4Map.get('D001')!, successorActivityId: p4Map.get('D002')!, relationship: 'FINISH_TO_START' },
    { projectId: p4._id, predecessorActivityId: p4Map.get('D002')!, successorActivityId: p4Map.get('D003')!, relationship: 'FINISH_TO_START' },
    { projectId: p4._id, predecessorActivityId: p4Map.get('D003')!, successorActivityId: p4Map.get('D004')!, relationship: 'FINISH_TO_START' },
  ]);

  // Valid baseline evidence
  await executionEventService.processStructuredEvent(p4._id.toString(), {
    activityCode: 'D001',
    reportDate: '2026-04-18T12:00:00Z',
    progress: 100,
    status: 'COMPLETED',
    remarks: 'Drainage channel alignment and invert levels completed'
  }, 'drainage_survey_log.xlsx');

  await executionEventService.processStructuredEvent(p4._id.toString(), {
    activityCode: 'D002',
    reportDate: '2026-05-15T12:00:00Z',
    progress: 50,
    status: 'ON_TRACK',
    remarks: 'Sector 7 main avenue box trench excavation progressing on schedule'
  }, 'drainage_biweekly_report.xlsx');

  // Genuinely unknown / unmatched site evidence (does NOT exist in baseline)
  await executionEventService.processStructuredEvent(p4._id.toString(), {
    activityName: 'Emergency Culvert Cleaning',
    reportDate: '2026-06-20T12:00:00Z',
    progress: 20,
    remarks: 'Emergency de-silting and culvert clearing performed following flash rainfall'
  }, 'monsoon_emergency_action.xlsx');

  console.log('[SEED] Project 4 created with unmatched site evidence in review queue.\n');


  // =========================================================================
  // PROJECT 5: Pune Metro Station Development — Package 01
  // PURPOSE: Provide a clean healthy baseline project under normal execution.
  // All activities completed or on track with healthy positive variance.
  // =========================================================================
  console.log('[SEED] Creating Project 5: Pune Metro Station Development — Package 01...');
  const p5 = await Project.create({
    name: 'Pune Metro Station Development — Package 01',
    organization: 'Maharashtra Metro Rail Corp (Maha-Metro)',
    description: 'Elevated metro station structure including concourse, platform, and viaduct integration.',
    plannedStartDate: d(2026, 1, 1),
    plannedEndDate: d(2027, 2, 28),
  });

  const p5Activities = await Activity.insertMany([
    {
      projectId: p5._id,
      activityCode: 'M001',
      name: 'Site Preparation',
      description: 'Barricading, utility diversion, and geotechnical investigation at station site',
      plannedStart: d(2026, 1, 1),
      plannedEnd: d(2026, 1, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p5._id,
      activityCode: 'M002',
      name: 'Foundation Works',
      description: 'Bored cast-in-situ piles, pile caps, and ground beam casting',
      plannedStart: d(2026, 2, 1),
      plannedEnd: d(2026, 4, 30),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p5._id,
      activityCode: 'M003',
      name: 'Structural Works',
      description: 'Station columns, concourse slab, and platform level superstructure casting',
      plannedStart: d(2026, 5, 1),
      plannedEnd: d(2026, 8, 31),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p5._id,
      activityCode: 'M004',
      name: 'MEP Installation',
      description: 'Mechanical, electrical, plumbing, fire protection, and HVAC system installation',
      plannedStart: d(2026, 9, 1),
      plannedEnd: d(2026, 11, 30),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    },
    {
      projectId: p5._id,
      activityCode: 'M005',
      name: 'Finishing Works',
      description: 'Architectural finishes, platform screen doors, signage, and testing commissioning',
      plannedStart: d(2026, 12, 1),
      plannedEnd: d(2027, 2, 28),
      plannedProgress: 100,
      actualProgress: 0,
      activityStatus: 'NOT_STARTED',
      dependencyRisk: 'NONE'
    }
  ]);

  const p5Map = new Map(p5Activities.map(a => [a.activityCode, a._id]));
  await Dependency.insertMany([
    { projectId: p5._id, predecessorActivityId: p5Map.get('M001')!, successorActivityId: p5Map.get('M002')!, relationship: 'FINISH_TO_START' },
    { projectId: p5._id, predecessorActivityId: p5Map.get('M002')!, successorActivityId: p5Map.get('M003')!, relationship: 'FINISH_TO_START' },
    { projectId: p5._id, predecessorActivityId: p5Map.get('M003')!, successorActivityId: p5Map.get('M004')!, relationship: 'FINISH_TO_START' },
    { projectId: p5._id, predecessorActivityId: p5Map.get('M004')!, successorActivityId: p5Map.get('M005')!, relationship: 'FINISH_TO_START' },
  ]);

  // Healthy evidence
  await executionEventService.processStructuredEvent(p5._id.toString(), {
    activityCode: 'M001',
    reportDate: '2026-01-25T12:00:00Z',
    progress: 100,
    status: 'COMPLETED',
    remarks: 'Station boundary barricading and high-tension utility diversions complete'
  }, 'metro_pkg1_jan_progress.xlsx');

  await executionEventService.processStructuredEvent(p5._id.toString(), {
    activityCode: 'M002',
    reportDate: '2026-03-01T12:00:00Z',
    progress: 35,
    status: 'ON_TRACK',
    remarks: 'Piling works progressing along station grid lines 1 through 6'
  }, 'metro_pkg1_feb_progress.xlsx');

  await executionEventService.processStructuredEvent(p5._id.toString(), {
    activityCode: 'M002',
    reportDate: '2026-04-20T12:00:00Z',
    progress: 100,
    status: 'COMPLETED',
    remarks: 'All 36 foundation pile caps completed and integrity tested successfully'
  }, 'metro_pkg1_apr_progress.xlsx');

  await executionEventService.processStructuredEvent(p5._id.toString(), {
    activityCode: 'M003',
    reportDate: '2026-06-15T12:00:00Z',
    progress: 45,
    status: 'ON_TRACK',
    remarks: 'Concourse slab reinforcement and casting on schedule, ahead of planned milestone'
  }, 'metro_pkg1_jun_progress.xlsx');

  console.log('[SEED] Project 5 created with healthy baseline execution data.\n');

  // =========================================================================
  // POST-SEED VERIFICATION
  // =========================================================================
  console.log('============================================================');
  console.log('PROGRAMMATIC VERIFICATION OF ALL 5 REVIEWER PROJECTS');
  console.log('============================================================');

  // Verify Project 1
  const p1Db = await Activity.find({ projectId: p1._id }).lean();
  const p1Delayed = p1Db.find(a => a.activityCode === 'P002' && a.activityStatus === 'DELAYED');
  const p1AtRisk = p1Db.find(a => a.activityCode === 'P003' && a.dependencyRisk === 'AT_RISK');
  const p1Risks = await Risk.find({ projectId: p1._id, status: 'OPEN' }).lean();

  if (p1Delayed && p1AtRisk && p1Risks.length > 0) {
    console.log('[PASS] Project 1 (Pune Ring Road): Earthworks DELAYED (-48 pp variance) and Road Base AT_RISK with active Risk records.');
  } else {
    console.error('[FAIL] Project 1 verification failed.', { p1Delayed: !!p1Delayed, p1AtRisk: !!p1AtRisk, risks: p1Risks.length });
  }

  // Verify Project 2
  const p2F001 = await Activity.findOne({ projectId: p2._id, activityCode: 'F001' }).lean();
  const p2Updates = await ExecutionUpdate.find({ projectId: p2._id, activityId: p2F001?._id, processingStatus: 'PROCESSED' }).lean();
  const p2Forecast = await ForecastingService.getForecastForActivity(p2._id, p2F001?._id!);

  if (p2Updates.length >= 4 && p2Forecast.status === 'FORECASTED' && p2Forecast.forecastedEndDate) {
    console.log(`[PASS] Project 2 (Urban Flyover): ${p2Updates.length} chronological updates, status=FORECASTED, finish date=${p2Forecast.forecastedEndDate.toISOString().split('T')[0]}, velocity=${p2Forecast.velocityPerDay?.toFixed(2)}%/day.`);
  } else {
    console.error('[FAIL] Project 2 verification failed.', { updates: p2Updates.length, status: p2Forecast?.status });
  }

  // Verify Project 3
  const p3Conflicts = await Reconciliation.find({ projectId: p3._id, status: 'CONFLICT' }).lean();
  const p3Aligned = await Reconciliation.find({ projectId: p3._id, status: 'ALIGNED' }).lean();
  const p3ConflictUpdates = await ExecutionUpdate.find({ projectId: p3._id, processingStatus: 'CONFLICT_REVIEW_REQUIRED' }).lean();

  if (p3Conflicts.length > 0 && p3ConflictUpdates.length >= 2) {
    console.log(`[PASS] Project 3 (Water Pipeline): Reconciliation conflict derived (${p3Conflicts.length} conflict record, ${p3ConflictUpdates.length} evidence updates in review).`);
  } else {
    console.error('[FAIL] Project 3 verification failed.', { conflicts: p3Conflicts.length, updates: p3ConflictUpdates.length });
  }

  // Verify Project 4
  const p4Unmatched = await ExecutionUpdate.find({ projectId: p4._id, processingStatus: 'UNMATCHED' }).lean();
  const p4EmergencyAct = await Activity.findOne({ projectId: p4._id, name: /Culvert/i }).lean();

  if (p4Unmatched.length > 0 && !p4EmergencyAct) {
    console.log(`[PASS] Project 4 (Smart Drainage): Unmatched site evidence present in review queue ('Emergency Culvert Cleaning') and NOT converted into an activity.`);
  } else {
    console.error('[FAIL] Project 4 verification failed.', { unmatched: p4Unmatched.length, convertedToAct: !!p4EmergencyAct });
  }

  // Verify Project 5
  const p5Db = await Activity.find({ projectId: p5._id }).lean();
  const p5Delayed = p5Db.filter(a => a.activityStatus === 'DELAYED');
  const p5Risks = await Risk.find({ projectId: p5._id, status: 'OPEN' }).lean();
  const p5Completed = p5Db.filter(a => a.activityStatus === 'COMPLETED');
  const p5OnTrack = p5Db.filter(a => a.activityStatus === 'ON_TRACK');

  if (p5Delayed.length === 0 && p5Risks.length === 0 && p5Completed.length === 2 && p5OnTrack.length === 1) {
    console.log(`[PASS] Project 5 (Pune Metro): Healthy baseline confirmed (2 Completed, 1 On Track, 0 Delayed, 0 Open Risks).`);
  } else {
    console.error('[FAIL] Project 5 verification failed.', { delayed: p5Delayed.length, risks: p5Risks.length, completed: p5Completed.length, onTrack: p5OnTrack.length });
  }

  // Final summary counts
  const [
    postProjects,
    postActivities,
    postDependencies,
    postExecution,
    postRisks,
    postReconciliations
  ] = await Promise.all([
    Project.countDocuments(),
    Activity.countDocuments(),
    Dependency.countDocuments(),
    ExecutionUpdate.countDocuments(),
    Risk.countDocuments(),
    Reconciliation.countDocuments()
  ]);

  console.log('\n============================================================');
  console.log('FINAL SEEDED DOCUMENT COUNTS:');
  console.log(`  Projects:            ${postProjects} (Exactly 5 curated projects)`);
  console.log(`  Activities:          ${postActivities}`);
  console.log(`  Dependencies:        ${postDependencies}`);
  console.log(`  Execution Updates:   ${postExecution}`);
  console.log(`  Risks:               ${postRisks}`);
  console.log(`  Reconciliations:     ${postReconciliations}`);
  console.log('============================================================\n');

  const projectList = await Project.find({}).sort({ createdAt: 1 }).lean();
  console.log('ACTIVE PROJECTS FOR REVIEWER DEMO:');
  projectList.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.name} (ID: ${p._id})`);
  });
  console.log('============================================================');

  await mongoose.disconnect();
}

seedReviewerDemo().catch(err => {
  console.error('[SEED] Fatal error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
