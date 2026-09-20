/**
 * PRATYAKSH — Environment Configuration
 *
 * Centralises all environment variable loading and validation.
 * Import `env` from this module instead of accessing process.env directly.
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`[PRATYAKSH] Required environment variable "${key}" is not set. Check .env.example.`);
  }
  return val;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),

  MONGODB_URI: requireEnv('MONGODB_URI'),

  LLM_PROVIDER: optionalEnv('LLM_PROVIDER', 'gemini'),
  LLM_MODEL: optionalEnv('LLM_MODEL', 'gemini-1.5-flash'),
  LLM_API_KEY: optionalEnv('LLM_API_KEY', ''),

  UPLOAD_MAX_SIZE_MB: parseInt(optionalEnv('UPLOAD_MAX_SIZE_MB', '10'), 10),

  MATCH_AUTO_THRESHOLD: parseFloat(optionalEnv('MATCH_AUTO_THRESHOLD', '0.90')),
  MATCH_REVIEW_THRESHOLD: parseFloat(optionalEnv('MATCH_REVIEW_THRESHOLD', '0.70')),

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  },

  get hasLlmKey(): boolean {
    return this.LLM_API_KEY.length > 0 && this.LLM_API_KEY !== 'your_google_api_key_here';
  },
};
