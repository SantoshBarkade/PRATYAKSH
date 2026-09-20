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

async function inspect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;

  console.log(`Connected to host: ${host}`);
  console.log(`Database name: ${dbName}`);

  const collections = await mongoose.connection.db?.listCollections().toArray() || [];
  console.log('Collections in database:');
  for (const c of collections) {
    console.log(` - ${c.name}`);
  }

  const [projectCount, activityCount, dependencyCount, executionCount, riskCount, reconciliationCount] = await Promise.all([
    Project.countDocuments(),
    Activity.countDocuments(),
    Dependency.countDocuments(),
    ExecutionUpdate.countDocuments(),
    Risk.countDocuments(),
    Reconciliation.countDocuments()
  ]);

  console.log('\nCurrent Document Counts:');
  console.log(`Projects: ${projectCount}`);
  console.log(`Activities: ${activityCount}`);
  console.log(`Dependencies: ${dependencyCount}`);
  console.log(`Execution Updates: ${executionCount}`);
  console.log(`Risks: ${riskCount}`);
  console.log(`Reconciliations: ${reconciliationCount}`);

  const existingProjects = await Project.find({}, 'name organization createdAt').lean();
  console.log('\nExisting Projects:');
  for (const p of existingProjects) {
    console.log(` - [${p._id}] ${p.name} (${p.organization})`);
  }

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
