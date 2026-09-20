/**
 * INFRA LINK — Shared API Configuration
 *
 * Single source of truth for the API base URL.
 * Defaults to 'http://localhost:5000/api' for local development,
 * or reads VITE_API_BASE_URL for deployed environments (e.g. Vercel -> Render).
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
