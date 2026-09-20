/**
 * PRATYAKSH — MongoDB Connection
 *
 * Establishes and manages the Mongoose connection to MongoDB.
 * Includes retry logic and clean shutdown on SIGINT/SIGTERM.
 */
import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`[PRATYAKSH] MongoDB connected successfully.`);
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      console.error(`[PRATYAKSH] MongoDB connection failed after ${MAX_RETRIES} attempts:`, err);
      process.exit(1);
    }
    console.warn(
      `[PRATYAKSH] MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectWithRetry(attempt + 1);
  }
}

export async function connectDB(): Promise<void> {
  mongoose.connection.on('disconnected', () => {
    console.warn('[PRATYAKSH] MongoDB disconnected.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[PRATYAKSH] MongoDB error:', err);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('[PRATYAKSH] MongoDB connection closed (SIGINT).');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    console.log('[PRATYAKSH] MongoDB connection closed (SIGTERM).');
    process.exit(0);
  });

  await connectWithRetry();
}
