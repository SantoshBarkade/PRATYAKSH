import fs from 'fs';
import path from 'path';
import {
  parseTxt,
  normalizeProgress,
  normalizeStatus,
  normalizeDate,
  extractSignalsFromText,
} from '../src/parsers/text.parser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error('         Details:', details);
    failed++;
  }
}

console.log('============================================================');
console.log('PRATYAKSH / INFRA LINK — TXT EXTRACTION UNIT TESTS');
console.log('============================================================\n');

// ─── SUITE 1: Progress Normalization ─────────────────────────────────────────
console.log('TEST SUITE 1: Progress Normalization');
assert(normalizeProgress('95%') === 95, 'Normalizes "95%" to 95');
assert(normalizeProgress('95 percent') === 95, 'Normalizes "95 percent" to 95');
assert(normalizeProgress('95 percent complete') === 95, 'Normalizes "95 percent complete" to 95');
assert(normalizeProgress('95.4%') === 95, 'Normalizes "95.4%" to 95');
assert(normalizeProgress('0.95') === 95, 'Normalizes decimal "0.95" to 95');
assert(normalizeProgress(95) === 95, 'Normalizes integer 95 to 95');
assert(normalizeProgress('100% complete') === 100, 'Normalizes "100% complete" to 100');
assert(normalizeProgress('completed') === 100, 'Normalizes "completed" to 100');
assert(normalizeProgress('not started') === 0, 'Normalizes "not started" to 0');
assert(normalizeProgress('') === null, 'Returns null for empty string');

// ─── SUITE 2: Line Variant Extraction ────────────────────────────────────────
console.log('\nTEST SUITE 2: Line Variant Extraction');

// Variant 1: F001 - Pile Foundation - 95% complete
const var1 = extractSignalsFromText('F001 - Pile Foundation - 95% complete');
assert(var1.signals.length === 1, 'Variant 1: extracted 1 signal');
assert(var1.signals[0]?.activityCode === 'F001', 'Variant 1: code is F001');
assert(var1.signals[0]?.activityName === 'Pile Foundation', 'Variant 1: name is Pile Foundation');
assert(var1.signals[0]?.actualProgress === 95, 'Variant 1: progress is 95');

// Variant 2: F001 | Pile Foundation | Progress: 95%
const var2 = extractSignalsFromText('F001 | Pile Foundation | Progress: 95%');
assert(var2.signals.length === 1, 'Variant 2: extracted 1 signal');
assert(var2.signals[0]?.activityCode === 'F001', 'Variant 2: code is F001');
assert(var2.signals[0]?.activityName === 'Pile Foundation', 'Variant 2: name is Pile Foundation');
assert(var2.signals[0]?.actualProgress === 95, 'Variant 2: progress is 95');

// Variant 3: Activity F001, Pile Foundation, actual progress 95 percent
const var3 = extractSignalsFromText('Activity F001, Pile Foundation, actual progress 95 percent');
assert(var3.signals.length === 1, 'Variant 3: extracted 1 signal');
assert(var3.signals[0]?.activityCode === 'F001', 'Variant 3: code is F001');
assert(var3.signals[0]?.activityName === 'Pile Foundation', 'Variant 3: name is Pile Foundation');
assert(var3.signals[0]?.actualProgress === 95, 'Variant 3: progress is 95');

// Variant 4: Pile Foundation (F001) is 95% complete.
const var4 = extractSignalsFromText('Pile Foundation (F001) is 95% complete.');
assert(var4.signals.length === 1, 'Variant 4: extracted 1 signal');
assert(var4.signals[0]?.activityCode === 'F001', 'Variant 4: code is F001');
assert(var4.signals[0]?.activityName === 'Pile Foundation', 'Variant 4: name is Pile Foundation');
assert(var4.signals[0]?.actualProgress === 95, 'Variant 4: progress is 95');

// ─── SUITE 3: Structured Block Variant ───────────────────────────────────────
console.log('\nTEST SUITE 3: Structured Key-Value Block Format');
const blockText = `
Activity Code: F001
Activity: Pile Foundation
Actual Progress: 95%
Status: IN_PROGRESS
Observation Date: 2026-06-10
`;
const blockRes = extractSignalsFromText(blockText);
assert(blockRes.signals.length === 1, 'Block format: extracted 1 signal');
assert(blockRes.signals[0]?.activityCode === 'F001', 'Block format: code is F001');
assert(blockRes.signals[0]?.activityName === 'Pile Foundation', 'Block format: name is Pile Foundation');
assert(blockRes.signals[0]?.actualProgress === 95, 'Block format: progress is 95');
assert(blockRes.signals[0]?.status === 'IN_PROGRESS', 'Block format: status is IN_PROGRESS');
assert(blockRes.signals[0]?.observationDate === '2026-06-10', 'Block format: date is 2026-06-10');

// ─── SUITE 4: Actual Demo TXT Files ──────────────────────────────────────────
console.log('\nTEST SUITE 4: Actual Demo TXT Files');

const reportsDir = path.resolve(__dirname, '../demo/reports');

// 1. 02_site_report.txt (Urban Flyover)
const file02Path = path.join(reportsDir, '02_site_report.txt');
if (fs.existsSync(file02Path)) {
  const content = fs.readFileSync(file02Path, 'utf-8');
  const res02 = extractSignalsFromText(content, '02_site_report.txt');
  console.log(`\n  [File: 02_site_report.txt] Extracted ${res02.signals.length} signals:`);
  for (const s of res02.signals) {
    console.log(`    • ${s.activityCode} (${s.activityName}): ${s.actualProgress}% [${s.status}] date: ${s.observationDate}`);
  }
  assert(res02.signals.length === 5, '02_site_report.txt: extracts exactly 5 signals', res02.signals.length);
  assert(res02.signals[0]?.activityCode === 'F001' && res02.signals[0]?.actualProgress === 95, '02_site_report.txt: F001 is 95%');
  assert(res02.signals[1]?.activityCode === 'F002' && res02.signals[1]?.actualProgress === 72, '02_site_report.txt: F002 is 72%');
  assert(res02.signals[2]?.activityCode === 'F003' && res02.signals[2]?.actualProgress === 35, '02_site_report.txt: F003 is 35%');
  assert(res02.signals[3]?.activityCode === 'F004' && res02.signals[3]?.actualProgress === 20, '02_site_report.txt: F004 is 20%');
  assert(res02.signals[4]?.activityCode === 'F005' && res02.signals[4]?.actualProgress === 18, '02_site_report.txt: F005 is 18%');
  assert(res02.signals[0]?.observationDate === '2026-06-25', '02_site_report.txt: inherits document date 2026-06-25');
} else {
  console.warn('  [SKIP] 02_site_report.txt not found at', file02Path);
}

// 2. 03_contractor_evidence.txt
const file03Path = path.join(reportsDir, '03_contractor_evidence.txt');
if (fs.existsSync(file03Path)) {
  const content = fs.readFileSync(file03Path, 'utf-8');
  const res03 = extractSignalsFromText(content, '03_contractor_evidence.txt');
  console.log(`\n  [File: 03_contractor_evidence.txt] Extracted ${res03.signals.length} signals:`);
  for (const s of res03.signals) {
    console.log(`    • ${s.activityCode} (${s.activityName}): ${s.actualProgress}% [${s.status}]`);
  }
  assert(res03.signals.length === 2, '03_contractor_evidence.txt: extracts exactly 2 signals', res03.signals.length);
  assert(res03.signals[0]?.activityCode === 'F001' && res03.signals[0]?.actualProgress === 96, '03_contractor_evidence.txt: F001 is 96%');
  assert(res03.signals[1]?.activityCode === 'F002' && res03.signals[1]?.actualProgress === 74, '03_contractor_evidence.txt: F002 is 74%');
} else {
  console.warn('  [SKIP] 03_contractor_evidence.txt not found at', file03Path);
}

// 3. 04_supervisor_evidence.txt
const file04Path = path.join(reportsDir, '04_supervisor_evidence.txt');
if (fs.existsSync(file04Path)) {
  const content = fs.readFileSync(file04Path, 'utf-8');
  const res04 = extractSignalsFromText(content, '04_supervisor_evidence.txt');
  console.log(`\n  [File: 04_supervisor_evidence.txt] Extracted ${res04.signals.length} signals:`);
  for (const s of res04.signals) {
    console.log(`    • ${s.activityCode} (${s.activityName}): ${s.actualProgress}% [${s.status}]`);
  }
  assert(res04.signals.length === 2, '04_supervisor_evidence.txt: extracts exactly 2 signals', res04.signals.length);
  assert(res04.signals[0]?.activityCode === 'F001' && res04.signals[0]?.actualProgress === 95, '04_supervisor_evidence.txt: F001 is 95%');
  assert(res04.signals[1]?.activityCode === 'F002' && res04.signals[1]?.actualProgress === 75, '04_supervisor_evidence.txt: F002 is 75%');
} else {
  console.warn('  [SKIP] 04_supervisor_evidence.txt not found at', file04Path);
}

// 4. 05_unknown_field_memo.txt
const file05Path = path.join(reportsDir, '05_unknown_field_memo.txt');
if (fs.existsSync(file05Path)) {
  const content = fs.readFileSync(file05Path, 'utf-8');
  const res05 = extractSignalsFromText(content, '05_unknown_field_memo.txt');
  console.log(`\n  [File: 05_unknown_field_memo.txt] Extracted ${res05.signals.length} signals:`);
  for (const s of res05.signals) {
    console.log(`    • ${s.activityCode} (${s.activityName}): ${s.actualProgress}% [${s.status}]`);
  }
  assert(res05.signals.length === 1, '05_unknown_field_memo.txt: extracts exactly 1 signal', res05.signals.length);
  assert(res05.signals[0]?.activityCode === 'EMERGENCY-01', '05_unknown_field_memo.txt: code is EMERGENCY-01');
  assert(res05.signals[0]?.actualProgress === 20, '05_unknown_field_memo.txt: progress is 20%');
} else {
  console.warn('  [SKIP] 05_unknown_field_memo.txt not found at', file05Path);
}

console.log('\n============================================================');
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
