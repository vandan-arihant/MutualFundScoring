import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config'

/** A failed API call, carrying a message that is safe to show to a user. */
export class ApiError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.cause = cause
  }
}

function friendlyMessage(error) {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return 'The request timed out. Is the scoring API still running?'
  }
  /* The browser deliberately gives JavaScript the same opaque TypeError for a
     refused connection and for a CORS rejection, so this cannot tell them
     apart -- name both causes rather than blame the wrong one. */
  const origin = typeof window === 'undefined' ? 'this page' : window.location.origin
  return (
    `Cannot reach the scoring API at ${API_BASE_URL}. Either the backend is not running, ` +
    `or it is not accepting requests from ${origin}.`
  )
}

async function getJson(path, { signal } = {}) {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: combined,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    // A caller-driven abort (unmount, superseded request) is not a real failure:
    // rethrow it untouched so the caller can recognise and ignore it.
    if (signal?.aborted) throw error
    throw new ApiError(friendlyMessage(error), { cause: error })
  }

  if (!response.ok) {
    throw new ApiError(
      `The scoring API returned ${response.status} ${response.statusText}.`,
      { status: response.status },
    )
  }

  try {
    return await response.json()
  } catch (error) {
    throw new ApiError('The scoring API returned a malformed response.', { cause: error })
  }
}

/**
 * The whole scored universe plus the metadata needed to render it:
 * `{ count, data, columns, groups, ratings, last_updated, next_refresh_at,
 *    last_error, source_mode }`.
 */
export function getFunds(options) {
  return getJson('/api/funds', options)
}

/** Cache/scheduler health, without the row payload. */
export function getStatus(options) {
  return getJson('/api/status', options)
}
