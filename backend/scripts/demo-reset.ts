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

export const DEMO_PROJECT_DEFINITIONS = [
  {
    key: 'P1',
    name: 'Pune Ring Road Expansion — Package 02',
    organization: 'MSRDC',
    description: '6-lane access-controlled western bypass corridor linking NH-48 and SH-27.',
    plannedStartDate: d(2026, 5, 1),
    plannedEndDate: d(2026, 8, 31),
    activities: [
      {
        activityCode: 'P001',
        name: 'Land Acquisition',
        description: 'Right-of-way acquisition and resettlement clearance for Package 02 corridor',
        plannedStart: d(2026, 5, 1),
        plannedEnd: d(2026, 5, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'P002',
        name: 'Earthworks',
        description: 'Embankment formation, subgrade cutting, and compaction from Ch. 12+000 to 24+000',
        plannedStart: d(2026, 6, 1),
        plannedEnd: d(2026, 6, 20),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'P003',
        name: 'Road Base Preparation',
        description: 'Wet Mix Macadam (WMM) base course laying and granular sub-base layer',
        plannedStart: d(2026, 6, 21),
        plannedEnd: d(2026, 7, 15),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'P004',
        name: 'Paving',
        description: 'Dense Bituminous Macadam (DBM) and Bituminous Concrete wearing course',
        plannedStart: d(2026, 7, 16),
        plannedEnd: d(2026, 8, 15),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
    ],
    dependencies: [
      { pred: 'P001', succ: 'P002' },
      { pred: 'P002', succ: 'P003' },
      { pred: 'P003', succ: 'P004' },
    ],
    events: [
      {
        row: {
          activityCode: 'P001',
          reportDate: '2026-05-30T12:00:00Z',
          progress: 100,
          status: 'COMPLETED',
          remarks: '100% of ROW acquired and handed over to contractor without encumbrance',
        },
        source: 'row_clearance_signoff.xlsx',
      },
      {
        row: {
          activityCode: 'P002',
          reportDate: '2026-06-05T12:00:00Z',
          progress: 20,
          status: 'ON_TRACK',
          remarks: 'Initial clearing, grubbing and topsoil stripping',
        },
        source: 'earthworks_weekly_log_w1.xlsx',
      },
      {
        row: {
          activityCode: 'P002',
          reportDate: '2026-06-15T12:00:00Z',
          progress: 38,
          status: 'DELAYED',
          remarks: 'Hard rock formation encountered in cutting zone Km 14+200; blasting clearance delayed',
        },
        source: 'earthworks_weekly_log_w2.xlsx',
      },
      {
        row: {
          activityCode: 'P002',
          reportDate: '2026-06-25T12:00:00Z',
          progress: 52,
          status: 'DELAYED',
          remarks: 'Earthworks lagging behind schedule; excavator breakdown and heavy unseasonal monsoon shower',
        },
        source: 'earthworks_weekly_log_w3.xlsx',
      },
    ],
  },
  {
    key: 'P2',
    name: 'Urban Flyover Construction — Phase 1',
    organization: 'PWD',
    description: 'Elevated 4-lane grade separator across busy arterial intersections.',
    plannedStartDate: d(2026, 3, 1),
    plannedEndDate: d(2026, 12, 31),
    activities: [
      {
        activityCode: 'F001',
        name: 'Piers Construction',
        description: 'Foundation piles, pile caps, and RCC pier columns P1 through P14',
        plannedStart: d(2026, 3, 1),
        plannedEnd: d(2026, 6, 30),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'F002',
        name: 'Deck Casting',
        description: 'Prestressed concrete girder launching and in-situ deck slab casting',
        plannedStart: d(2026, 7, 1),
        plannedEnd: d(2026, 9, 30),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'F003',
        name: 'Approach Slab',
        description: 'Reinforced concrete approach transition slabs at North and South abutments',
        plannedStart: d(2026, 10, 1),
        plannedEnd: d(2026, 11, 15),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'F004',
        name: 'Road Surfacing',
        description: 'Mastic asphalt waterproofing layer and friction course surfacing',
        plannedStart: d(2026, 11, 16),
        plannedEnd: d(2026, 12, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
    ],
    dependencies: [
      { pred: 'F001', succ: 'F002' },
      { pred: 'F002', succ: 'F003' },
      { pred: 'F003', succ: 'F004' },
    ],
    events: [
      {
        row: {
          activityCode: 'F001',
          reportDate: '2026-03-15T12:00:00Z',
          progress: 10,
          status: 'ON_TRACK',
          remarks: 'Bored cast-in-situ piles and reinforcement cage fabrication started',
        },
        source: 'flyover_monthly_log_march.xlsx',
      },
      {
        row: {
          activityCode: 'F001',
          reportDate: '2026-04-15T12:00:00Z',
          progress: 40,
          status: 'ON_TRACK',
          remarks: 'Pier columns P1 to P6 concreted and cured',
        },
        source: 'flyover_monthly_log_april.xlsx',
      },
      {
        row: {
          activityCode: 'F001',
          reportDate: '2026-05-15T12:00:00Z',
          progress: 75,
          status: 'ON_TRACK',
          remarks: 'Pier caps shuttering, post-tensioning and casting progressing smoothly',
        },
        source: 'flyover_monthly_log_may.xlsx',
      },
      {
        row: {
          activityCode: 'F001',
          reportDate: '2026-06-15T12:00:00Z',
          progress: 95,
          status: 'ON_TRACK',
          remarks: 'Elastomeric bearing installation and load testing in final stage',
        },
        source: 'flyover_monthly_log_june.xlsx',
      },
    ],
  },
  {
    key: 'P3',
    name: 'Municipal Water Pipeline Upgrade — Zone 4',
    organization: 'Municipal Corporation',
    description: 'Augmentation of primary feeder pipeline with 900mm ductile iron conduits.',
    plannedStartDate: d(2026, 1, 5),
    plannedEndDate: d(2026, 8, 31),
    activities: [
      {
        activityCode: 'W001',
        name: 'Utility Mapping',
        description: 'Ground penetrating radar (GPR) scan and trial pits for underground services',
        plannedStart: d(2026, 1, 5),
        plannedEnd: d(2026, 1, 25),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'W002',
        name: 'Trenching',
        description: 'Mechanical trench excavation, dewatering, and trench sheeting',
        plannedStart: d(2026, 1, 26),
        plannedEnd: d(2026, 4, 15),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'W003',
        name: 'Pipe Laying',
        description: 'Lowering, aligning, jointing and hydrostatic pressure testing of DI pipes',
        plannedStart: d(2026, 4, 16),
        plannedEnd: d(2026, 7, 15),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'W004',
        name: 'Backfilling',
        description: 'Granular bedding placement, backfilling in layers, and surface compaction',
        plannedStart: d(2026, 7, 16),
        plannedEnd: d(2026, 8, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
    ],
    dependencies: [
      { pred: 'W001', succ: 'W002' },
      { pred: 'W002', succ: 'W003' },
      { pred: 'W003', succ: 'W004' },
    ],
    events: [
      {
        row: {
          activityCode: 'W001',
          reportDate: '2026-01-25T12:00:00Z',
          progress: 100,
          status: 'COMPLETED',
          remarks: 'Contractor report: GPR utility scanning completed along full 2.4 km stretch',
        },
        source: 'contractor_utility_survey.xlsx',
      },
      {
        row: {
          activityCode: 'W001',
          reportDate: '2026-01-25T12:00:00Z',
          progress: 100,
          status: 'COMPLETED',
          remarks: 'Independent consultant inspection: Confirmed 100% utility identification and marking',
        },
        source: 'consultant_verification_report.xlsx',
      },
      {
        row: {
          activityCode: 'W002',
          reportDate: '2026-03-20T12:00:00Z',
          progress: 40,
          status: 'DELAYED',
          remarks: 'Contractor claim: Hard rock stratum at chainage 1+100 slowed progress to 40%',
        },
        source: 'contractor_billing_march.xlsx',
      },
      {
        row: {
          activityCode: 'W002',
          reportDate: '2026-03-20T12:00:00Z',
          progress: 55,
          status: 'ON_TRACK',
          remarks: 'PMU Supervisor physical audit: 1,320m of 2,400m trench excavated and shored (55%)',
        },
        source: 'pmu_supervising_engineer_log.xlsx',
      },
    ],
  },
  {
    key: 'P4',
    name: 'Smart Drainage & Stormwater Upgrade — Sector 7',
    organization: 'Smart City Development Corp',
    description: 'Precast stormwater drainage network and roadside culvert augmentation.',
    plannedStartDate: d(2026, 4, 1),
    plannedEndDate: d(2026, 8, 31),
    activities: [
      {
        activityCode: 'D001',
        name: 'Site Survey',
        description: 'Corridor topographical mapping, invert level recording, and drain alignment',
        plannedStart: d(2026, 4, 1),
        plannedEnd: d(2026, 4, 20),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'D002',
        name: 'Excavation',
        description: 'Trench excavation for precast box culverts and storm drain channels',
        plannedStart: d(2026, 4, 21),
        plannedEnd: d(2026, 5, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'D003',
        name: 'Drain Installation',
        description: 'Laying precast RCC box drain sections, joint sealing, and weep hole installation',
        plannedStart: d(2026, 6, 1),
        plannedEnd: d(2026, 7, 20),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'D004',
        name: 'Road Restoration',
        description: 'Granular sub-base reinstatement, pavement patching, and manhole cover fixing',
        plannedStart: d(2026, 7, 21),
        plannedEnd: d(2026, 8, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
    ],
    dependencies: [
      { pred: 'D001', succ: 'D002' },
      { pred: 'D002', succ: 'D003' },
      { pred: 'D003', succ: 'D004' },
    ],
    events: [
      {
        row: {
          activityCode: 'D001',
          reportDate: '2026-04-18T12:00:00Z',
          progress: 100,
          status: 'COMPLETED',
          remarks: 'Drainage channel alignment and invert levels completed',
        },
        source: 'drainage_survey_log.xlsx',
      },
      {
        row: {
          activityCode: 'D002',
          reportDate: '2026-05-15T12:00:00Z',
          progress: 50,
          status: 'ON_TRACK',
          remarks: 'Sector 7 main avenue box trench excavation progressing on schedule',
        },
        source: 'drainage_biweekly_report.xlsx',
      },
      {
        row: {
          activityName: 'Emergency Culvert Cleaning',
          reportDate: '2026-06-20T12:00:00Z',
          progress: 20,
          remarks: 'Emergency de-silting and culvert clearing performed following flash rainfall',
        },
        source: 'monsoon_emergency_action.xlsx',
      },
    ],
  },
  {
    key: 'P5',
    name: 'Pune Metro Station Development — Package 01',
    organization: 'Maharashtra Metro Rail Corp (Maha-Metro)',
    description: 'Elevated metro station structure including concourse, platform, and viaduct integration.',
    plannedStartDate: d(2026, 1, 1),
    plannedEndDate: d(2027, 2, 28),
    activities: [
      {
        activityCode: 'M001',
        name: 'Site Preparation',
        description: 'Barricading, utility diversion, and geotechnical investigation at station site',
        plannedStart: d(2026, 1, 1),
        plannedEnd: d(2026, 1, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'M002',
        name: 'Foundation Works',
        description: 'Bored cast-in-situ piles, pile caps, and ground beam casting',
        plannedStart: d(2026, 2, 1),
        plannedEnd: d(2026, 4, 30),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'M003',
        name: 'Structural Works',
        description: 'Station columns, concourse slab, and platform level superstructure casting',
        plannedStart: d(2026, 5, 1),
        plannedEnd: d(2026, 8, 31),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'M004',
        name: 'MEP Installation',
        description: 'Mechanical, electrical, plumbing, fire protection, and HVAC system installation',
        plannedStart: d(2026, 9, 1),
        plannedEnd: d(2026, 11, 30),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
      {
        activityCode: 'M005',
        name: 'Finishing Works',
        description: 'Architectural finishes, platform screen doors, signage, and testing commissioning',
        plannedStart: d(2026, 12, 1),
        plannedEnd: d(2027, 2, 28),
        plannedProgress: 100,
        actualProgress: 0,
        activityStatus: 'NOT_STARTED' as const,
        dependencyRisk: 'NONE' as const,
      },
    ],
    dependencies: [
      { pred: 'M001', succ: 'M002' },
      { pred: 'M002', succ: 'M003' },
      { pred: 'M003', succ: 'M004' },
      { pred: 'M004', succ: 'M005' },
    ],
    events: [
      {
        row: {
          activityCode: 'M001',
          reportDate: '2026-01-25T12:00:00Z',
          progress: 100,
          status: 'COMPLETED',
          remarks: 'Station boundary barricading and high-tension utility diversions complete',
        },
        source: 'metro_pkg1_jan_progress.xlsx',
      },
      {
        row: {
          activityCode: 'M002',
          reportDate: '2026-03-01T12:00:00Z',
          progress: 35,
          status: 'ON_TRACK',
          remarks: 'Piling works progressing along station grid lines 1 through 6',
        },
        source: 'metro_pkg1_feb_progress.xlsx',
      },
      {
        row: {
          activityCode: 'M002',
          reportDate: '2026-04-20T12:00:00Z',
          progress: 100,
          status: 'COMPLETED',
          remarks: 'All 36 foundation pile caps completed and integrity tested successfully',
        },
        source: 'metro_pkg1_apr_progress.xlsx',
      },
      {
        row: {
          activityCode: 'M003',
          reportDate: '2026-06-15T12:00:00Z',
          progress: 45,
          status: 'ON_TRACK',
          remarks: 'Concourse slab reinforcement and casting on schedule, ahead of planned milestone',
        },
        source: 'metro_pkg1_jun_progress.xlsx',
      },
    ],
  },
];

export async function resetDemoProjects(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DEMO RESET] Fatal error: MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const demoNames = DEMO_PROJECT_DEFINITIONS.map(p => p.name);

  // 1. Locate existing demo projects to preserve their exact ObjectIds
  const existingProjects = await Project.find({ name: { $in: demoNames } });
  const existingMap = new Map<string, any>();
  for (const ep of existingProjects) {
    existingMap.set(ep.name, ep);
  }

  // Ensure all 5 demo project documents exist and preserve their IDs
  const activeProjects: any[] = [];
  for (const def of DEMO_PROJECT_DEFINITIONS) {
    let pDoc = existingMap.get(def.name);
    if (pDoc) {
      pDoc.organization = def.organization;
      pDoc.description = def.description;
      pDoc.plannedStartDate = def.plannedStartDate;
      pDoc.plannedEndDate = def.plannedEndDate;
      await pDoc.save();
    } else {
      pDoc = await Project.create({
        name: def.name,
        organization: def.organization,
        description: def.description,
        plannedStartDate: def.plannedStartDate,
        plannedEndDate: def.plannedEndDate,
      });
    }
    activeProjects.push(pDoc);
  }

  const demoProjectIds = activeProjects.map(p => p._id);

  // 2. SCOPED PURGE: Remove ONLY derived execution, risk, and reconciliation state for the 5 demo projects
  // CRITICAL SAFETY GUARANTEE: Never touches unrelated projects!
  const [
    delExecution,
    delRisks,
    delReconciliations,
    delDeps,
    delActs,
  ] = await Promise.all([
    ExecutionUpdate.deleteMany({ projectId: { $in: demoProjectIds } }),
    Risk.deleteMany({ projectId: { $in: demoProjectIds } }),
    Reconciliation.deleteMany({ projectId: { $in: demoProjectIds } }),
    Dependency.deleteMany({ projectId: { $in: demoProjectIds } }),
    Activity.deleteMany({ projectId: { $in: demoProjectIds } }),
  ]);

  // 3. Re-establish pristine baseline activities & dependencies, then process baseline demo evidence
  let totalActivitiesRestored = 0;
  let totalDependenciesRestored = 0;

  for (const def of DEMO_PROJECT_DEFINITIONS) {
    const project = activeProjects.find(p => p.name === def.name);
    const pid = project._id;

    // Insert Activities
    const actDocs = await Activity.insertMany(
      def.activities.map(a => ({
        ...a,
        projectId: pid,
      }))
    );
    totalActivitiesRestored += actDocs.length;

    const codeToId = new Map<string, Types.ObjectId>();
    for (const a of actDocs) {
      codeToId.set(a.activityCode, a._id);
    }

    // Insert Dependencies
    const depDocs = await Dependency.insertMany(
      def.dependencies.map(d => ({
        projectId: pid,
        predecessorActivityId: codeToId.get(d.pred)!,
        successorActivityId: codeToId.get(d.succ)!,
        relationship: 'FINISH_TO_START' as const,
      }))
    );
    totalDependenciesRestored += depDocs.length;

    // Process Pristine Baseline Execution Events
    for (const evt of def.events) {
      await executionEventService.processStructuredEvent(pid.toString(), evt.row, evt.source);
    }

    // Propagate risks for projects with delay (e.g. P1)
    if (def.key === 'P1') {
      await riskService.propagateRisks(pid.toString());
    }
  }

  // Verification counts for Review Queue and Reconciliations
  const reviewQueueCount = await ExecutionUpdate.countDocuments({
    projectId: { $in: demoProjectIds },
    processingStatus: { $in: ['REVIEW_REQUIRED', 'UNMATCHED'] },
  });

  const reconciliationConflictCount = await Reconciliation.countDocuments({
    projectId: { $in: demoProjectIds },
    status: 'CONFLICT',
  });

  console.log('\n============================================================');
  console.log('PRATYAKSH SIH DEMO RESET');
  console.log('============================================================\n');

  for (const p of activeProjects) {
    console.log(`✓ ${p.name}`);
  }

  console.log('\nExecution updates removed: ' + delExecution.deletedCount);
  console.log('Risks reset:               ' + delRisks.deletedCount);
  console.log('Reconciliations removed:   ' + delReconciliations.deletedCount);
  console.log('Review items cleared:      ' + reviewQueueCount + ' (Pristine review item established for P4)');
  console.log('Activities restored:       ' + totalActivitiesRestored);
  console.log('Dependencies restored:     ' + totalDependenciesRestored);
  console.log('\nDemo database is ready for recording.');
  console.log('============================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  resetDemoProjects().catch(err => {
    console.error('[DEMO RESET] Fatal error:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
}
