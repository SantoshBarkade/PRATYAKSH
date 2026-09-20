/**
 * PRATYAKSH — Generate Demo schedule.xlsx for testing
 * Run: npx ts-node --project tsconfig.scripts.json scripts/make_demo_xlsx.ts
 */
import path from 'path';
import * as XLSX from 'xlsx';

const rows = [
  ['Activity Code', 'Activity Name', 'Planned Start', 'Planned End', 'Planned Progress', 'Dependency'],
  ['A001', 'Foundation',   '01-Jun-2026', '10-Jun-2026', 100, ''],
  ['A002', 'Pillars',      '11-Jun-2026', '20-Jun-2026', 100, 'A001'],
  ['A003', 'Beams',        '21-Jun-2026', '25-Jun-2026', 100, 'A002'],
  ['A004', 'Road Surface', '26-Jun-2026', '30-Jun-2026', 100, 'A003'],
  ['A005', 'Drainage',     '15-Jun-2026', '22-Jun-2026', 100, 'A001'],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Schedule');

const outPath = path.resolve(__dirname, '../demo/schedule.xlsx');
const fs = require('fs');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
XLSX.writeFile(wb, outPath);
console.log(`[MAKE_XLSX] Written: ${outPath}`);
