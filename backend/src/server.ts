/**
 * PRATYAKSH — Server Entry Point
 *
 * Connects to MongoDB, then starts the Express HTTP server.
 */
import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';

async function main(): Promise<void> {
  console.log('[INFRA LINK] Starting Infrastructure Execution Intelligence backend...');
  console.log(`[INFRA LINK] Environment: ${env.NODE_ENV}`);
  console.log(`[INFRA LINK] LLM Provider: ${env.LLM_PROVIDER} / Model: ${env.LLM_MODEL}`);
  console.log(`[INFRA LINK] LLM key configured: ${env.hasLlmKey ? 'YES' : 'NO (will use deterministic fallback)'}`);

  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`[INFRA LINK] Server listening on http://localhost:${env.PORT}`);
    console.log(`[INFRA LINK] Health check: http://localhost:${env.PORT}/api/health`);
  });
}

main().catch((err) => {
  console.error('[INFRA LINK] Fatal startup error:', err);
  process.exit(1);
});
