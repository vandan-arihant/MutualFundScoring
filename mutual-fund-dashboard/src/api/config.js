/**
 * Backend location. Override per environment with VITE_API_BASE_URL in a .env
 * file (see .env.example); the default matches the local uvicorn port.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '')

/**
 * The API answers from an in-memory cache, so a slow response means something is
 * wrong rather than merely busy. Long enough to absorb a cold start, short
 * enough that the UI doesn't hang.
 */
export const REQUEST_TIMEOUT_MS = 20_000
