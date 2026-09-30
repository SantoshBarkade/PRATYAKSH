/**
 * PRATYAKSH — SIH 2026 Reviewer Demo Seed & Reset
 *
 * This script safely delegates to `resetDemoProjects` in `demo-reset.ts`.
 * It guarantees that ONLY the 5 curated SIH reviewer/demo projects are reset,
 * preserving their exact ObjectIds and without globally wiping the database.
 */
import { resetDemoProjects } from './demo-reset';

resetDemoProjects().catch(err => {
  console.error('[SEED REVIEWER DEMO] Fatal error:', err);
  process.exit(1);
});
