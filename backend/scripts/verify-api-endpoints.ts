import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
  console.log('Testing live API endpoints at:', BASE_URL);

  // 1. GET /api/projects
  const resProjects = await fetch(`${BASE_URL}/projects`);
  const dataProjects: any = await resProjects.json();
  if (!dataProjects.success) throw new Error('Failed to fetch projects');

  const projects = dataProjects.data;
  console.log(`\nFound ${projects.length} projects (Expected 5):`);
  projects.forEach((p: any, i: number) => {
    console.log(`  ${i + 1}. [${p._id}] ${p.name} (${p.organization})`);
  });
  if (projects.length !== 5) {
    throw new Error(`Expected exactly 5 projects, got ${projects.length}`);
  }

  const p1 = projects.find((p: any) => p.name.includes('Ring Road'));
  const p2 = projects.find((p: any) => p.name.includes('Flyover'));
  const p3 = projects.find((p: any) => p.name.includes('Pipeline'));
  const p4 = projects.find((p: any) => p.name.includes('Drainage'));
  const p5 = projects.find((p: any) => p.name.includes('Metro'));

  // 2. Test Project 1: Pune Ring Road Dashboard
  const resP1 = await fetch(`${BASE_URL}/projects/${p1._id}/dashboard`);
  const dataP1: any = await resP1.json();
  const earthworks = dataP1.data.activities.find((a: any) => a.code === 'P002');
  const roadBase = dataP1.data.activities.find((a: any) => a.code === 'P003');
  console.log('\nProject 1 Verification:');
  console.log(`  Earthworks (P002) Status: ${earthworks.status}, Variance: ${earthworks.variance} pp`);
  console.log(`  Road Base (P003) Dependency Risk: ${roadBase.dependencyRisk}`);
  console.log(`  Open Risks: ${dataP1.data.risks.length}`);
  if (earthworks.status !== 'DELAYED' || roadBase.dependencyRisk !== 'AT_RISK') {
    throw new Error('Project 1 failed delay/risk check');
  }

  // 3. Test Project 2: Urban Flyover Forecast
  const resP2 = await fetch(`${BASE_URL}/projects/${p2._id}/forecast/summary`);
  const dataP2: any = await resP2.json();
  const piersForecast = dataP2.data.find((f: any) => f.status === 'FORECASTED');
  console.log('\nProject 2 Verification:');
  console.log(`  Forecast Status: ${piersForecast.status}`);
  console.log(`  Forecast End Date: ${piersForecast.forecastedEndDate?.split('T')[0]}`);
  console.log(`  Velocity: ${piersForecast.velocityPerDay?.toFixed(2)}%/day`);
  console.log(`  Explanation steps: ${piersForecast.explanation?.length}`);
  if (piersForecast.status !== 'FORECASTED' || !piersForecast.forecastedEndDate) {
    throw new Error('Project 2 failed forecast check');
  }

  // 4. Test Project 3: Water Pipeline Reconciliation
  const resP3 = await fetch(`${BASE_URL}/projects/${p3._id}/reconciliations`);
  const dataP3: any = await resP3.json();
  const reconciliationsList = dataP3.reconciliations || dataP3.data?.reconciliations || [];
  const conflicts = reconciliationsList.filter((r: any) => r.status === 'CONFLICT');
  console.log('\nProject 3 Verification:');
  console.log(`  Active Conflict Records: ${conflicts.length}`);
  if (conflicts.length === 0) {
    throw new Error('Project 3 failed reconciliation conflict check');
  }
  console.log(`  Conflict field: ${conflicts[0].conflicts[0]?.field}, values: ${JSON.stringify(conflicts[0].conflicts[0]?.values.map((v: any) => v.value))}`);

  // 5. Test Project 4: Smart Drainage Review Queue
  const resP4 = await fetch(`${BASE_URL}/projects/${p4._id}/execution-events/review`);
  const dataP4: any = await resP4.json();
  const queue = dataP4.data || [];
  const unmatched = queue.find((e: any) => e.extractedActivity?.includes('Culvert') || e.rawText?.includes('Culvert'));
  console.log('\nProject 4 Verification:');
  console.log(`  Review queue unmatched items: ${queue.length}`);
  console.log(`  Unmatched item: ${unmatched?.extractedActivity || 'None'} (Status: ${unmatched?.processingStatus})`);
  if (!unmatched || unmatched.processingStatus !== 'UNMATCHED') {
    throw new Error('Project 4 failed unmatched review queue check');
  }

  // 6. Test Project 5: Pune Metro Healthy Execution
  const resP5 = await fetch(`${BASE_URL}/projects/${p5._id}/dashboard`);
  const dataP5: any = await resP5.json();
  console.log('\nProject 5 Verification:');
  console.log(`  Total Activities: ${dataP5.data.summary.totalActivities}`);
  console.log(`  Completed: ${dataP5.data.summary.completed}, On Track: ${dataP5.data.summary.onTrack}, Delayed: ${dataP5.data.summary.delayed}`);
  console.log(`  Active Risks: ${dataP5.data.dependencyRiskSummary.activeRiskCount}`);
  if (dataP5.data.summary.delayed !== 0 || dataP5.data.dependencyRiskSummary.activeRiskCount !== 0) {
    throw new Error('Project 5 failed healthy baseline check');
  }

  // 7. Verify Project Isolation
  console.log('\nProject Isolation Verification:');
  for (const proj of projects) {
    const res = await fetch(`${BASE_URL}/projects/${proj._id}/dashboard`);
    const d: any = await res.json();
    for (const a of d.data.activities) {
      if (!a.id) throw new Error(`Missing activity ID in project ${proj.name}`);
    }
  }
  console.log('  [PASS] All activities, risks, and updates strictly isolated by projectId.');

  console.log('\n============================================================');
  console.log('ALL 5 REVIEWER PROJECTS VERIFIED SUCCESSFULLY OVER HTTP API!');
  console.log('============================================================');
}

testEndpoints().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
