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

export const TARGET_DEMO_PROJECT_NAMES = [
  'Pune Ring Road Expansion — Package 02',
  'Urban Flyover Construction — Phase 1',
  'Municipal Water Pipeline Upgrade — Zone 4',
  'Smart Drainage & Stormwater Upgrade — Sector 7',
  'Pune Metro Station Development — Package 01'
];

export const TARGET_DEMO_PROJECT_IDS = [
  '6ab02be80f6f7019e710e602',
  '6ab02bea0f6f7019e710e660',
  '6ab02bec0f6f7019e710e6ba',
  '6ab02bed0f6f7019e710e701',
  '6ab02bed0f6f7019e710e734'
];

export interface CleanAuditSummary {
  projectsDeleted: number;
  activitiesDeleted: number;
  dependenciesDeleted: number;
  executionUpdatesDeleted: number;
  risksDeleted: number;
  reconciliationsDeleted: number;
  remainingProjects: number;
  cleanedProjectNames: string[];
}

/**
 * Performs a strictly scoped clean of the 5 demo projects.
 * Safety Guarantees:
 * 1. ONLY matches the 5 curated demo projects by canonical name and/or specific demo ObjectIds.
 * 2. Purges child records ONLY with `{ projectId: { $in: demoProjectIds } }`.
 * 3. Never touches user accounts, auth collections, or any unrelated projects/data.
 * 4. Never drops any collections or the database.
 */
export async function cleanDemoState(): Promise<CleanAuditSummary> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  console.log('\n============================================================');
  console.log('PRATYAKSH / INFRA LINK — DEMO CLEAN OPERATION');
  console.log('============================================================');
  console.log('Connecting to database...');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected to MongoDB successfully.\n');

  // 1. Locate ONLY the curated demo projects
  const validObjectIds = TARGET_DEMO_PROJECT_IDS
    .filter(id => Types.ObjectId.isValid(id))
    .map(id => new Types.ObjectId(id));

  const demoProjects = await Project.find({
    $or: [
      { name: { $in: TARGET_DEMO_PROJECT_NAMES } },
      { _id: { $in: validObjectIds } }
    ]
  }).lean();

  if (demoProjects.length === 0) {
    console.log('Notice: No demo projects found in database.');
    console.log('The database is already clean and ready for a fresh demonstration.\n');
    
    const remainingCount = await Project.countDocuments();
    await mongoose.disconnect();
    return {
      projectsDeleted: 0,
      activitiesDeleted: 0,
      dependenciesDeleted: 0,
      executionUpdatesDeleted: 0,
      risksDeleted: 0,
      reconciliationsDeleted: 0,
      remainingProjects: remainingCount,
      cleanedProjectNames: []
    };
  }

  const demoProjectIds = demoProjects.map(p => p._id);
  const demoNames = demoProjects.map(p => p.name);

  console.log(`Identified ${demoProjects.length} demo project(s) to remove:`);
  for (const name of demoNames) {
    console.log(`  - ${name}`);
  }
  console.log('');

  // 2. Perform strictly scoped child record deletions
  console.log('Executing scoped purge for demo projects only...');

  const [
    delExecution,
    delReconciliations,
    delRisks,
    delDependencies,
    delActivities
  ] = await Promise.all([
    // Execution updates and Review Queue items (which are ExecutionUpdates with REVIEW_REQUIRED / UNMATCHED)
    ExecutionUpdate.deleteMany({ projectId: { $in: demoProjectIds } }),
    // Reconciliation conflict and resolution records
    Reconciliation.deleteMany({ projectId: { $in: demoProjectIds } }),
    // Delay and risk propagation records
    Risk.deleteMany({ projectId: { $in: demoProjectIds } }),
    // Critical path and dependency links
    Dependency.deleteMany({ projectId: { $in: demoProjectIds } }),
    // Schedule activities
    Activity.deleteMany({ projectId: { $in: demoProjectIds } }),
  ]);

  // 3. Delete the demo projects themselves
  const delProjects = await Project.deleteMany({ _id: { $in: demoProjectIds } });

  // 4. Verify post-clean state
  const [
    remDemoProjects,
    remActs,
    remDeps,
    remExec,
    remRisks,
    remRecs,
    totalRemainingProjects
  ] = await Promise.all([
    Project.countDocuments({ _id: { $in: demoProjectIds } }),
    Activity.countDocuments({ projectId: { $in: demoProjectIds } }),
    Dependency.countDocuments({ projectId: { $in: demoProjectIds } }),
    ExecutionUpdate.countDocuments({ projectId: { $in: demoProjectIds } }),
    Risk.countDocuments({ projectId: { $in: demoProjectIds } }),
    Reconciliation.countDocuments({ projectId: { $in: demoProjectIds } }),
    Project.countDocuments()
  ]);

  const summary: CleanAuditSummary = {
    projectsDeleted: delProjects.deletedCount,
    activitiesDeleted: delActivities.deletedCount,
    dependenciesDeleted: delDependencies.deletedCount,
    executionUpdatesDeleted: delExecution.deletedCount,
    risksDeleted: delRisks.deletedCount,
    reconciliationsDeleted: delReconciliations.deletedCount,
    remainingProjects: totalRemainingProjects,
    cleanedProjectNames: demoNames
  };

  console.log('------------------------------------------------------------');
  console.log('CLEAN AUDIT SUMMARY:');
  console.log(`  • Projects deleted:          ${summary.projectsDeleted}`);
  console.log(`  • Activities deleted:        ${summary.activitiesDeleted}`);
  console.log(`  • Dependencies deleted:      ${summary.dependenciesDeleted}`);
  console.log(`  • Execution updates deleted: ${summary.executionUpdatesDeleted} (including Review Queue items)`);
  console.log(`  • Risks deleted:             ${summary.risksDeleted}`);
  console.log(`  • Reconciliations deleted:   ${summary.reconciliationsDeleted}`);
  console.log(`  • Total remaining projects:  ${summary.remainingProjects}`);
  console.log('------------------------------------------------------------');

  if (
    remDemoProjects === 0 &&
    remActs === 0 &&
    remDeps === 0 &&
    remExec === 0 &&
    remRisks === 0 &&
    remRecs === 0
  ) {
    console.log('SUCCESS: All target demo data verified as completely removed (0 remaining).');
    console.log('Database is ready for clean project creation & schedule upload flow.\n');
  } else {
    console.warn('WARNING: Residual demo records detected after cleanup!');
  }

  await mongoose.disconnect();
  return summary;
}

if (require.main === module) {
  cleanDemoState().catch(err => {
    console.error('\n[DEMO CLEAN] Fatal error:', err.message || err);
    if (err.message && err.message.includes('whitelist')) {
      console.error('\nNOTE: If connecting to MongoDB Atlas, ensure your current IP address is added');
      console.error('to the Atlas Network Access list (or set to 0.0.0.0/0 for demo/testing).');
    }
    mongoose.disconnect().finally(() => process.exit(1));
  });
}
