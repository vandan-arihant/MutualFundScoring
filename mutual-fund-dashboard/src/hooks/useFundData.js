import { useCallback, useEffect, useRef, useState } from 'react'

import { getFunds } from '../api/fundsApi'

/**
 * The scores change at most once a day, when the backend's scheduled refresh
 * runs. So this hook never polls and never holds a connection open. It fetches
 * on mount, on tab refocus, and once at the moment the next refresh is due --
 * and it uses `next_refresh_at` from the payload to skip requests that cannot
 * possibly return anything new.
 *
 *   1. mount                    -> one fetch
 *   2. focus / visibilitychange -> refetchIfStale()
 *   3. refetchIfStale()         -> compares the clock to next_refresh_at + grace
 *                                  and returns WITHOUT a request when it hasn't
 *                                  passed. Refocusing the tab 40 times before
 *                                  the daily update costs zero requests.
 *   4. after every success      -> ONE setTimeout armed for next_refresh_at, so
 *                                  a dashboard left open across the update
 *                                  refreshes itself on time. Not an interval.
 *   5. refresh()                -> manual, bypasses the staleness gate.
 *
 * The whole engine lives inside the mount effect: it is a subscription to an
 * external system (a clock and three window events), its mutable state is
 * genuinely local, and local function declarations can reference each other
 * without the ref gymnastics that hoisting them to the component body needs.
 */

/* The server fetches and re-scores for a few seconds after cron fires; asking
   before that returns the old timestamp and wastes a round trip. */
const GRACE_MS = 90_000

/* If the scheduled fetch finds last_updated unchanged (upstream was late), come
   back once -- deliberately a single retry rather than a poll loop. */
const LATE_RETRY_MS = 5 * 60_000

/* setTimeout stores its delay in a signed 32-bit int; anything larger overflows
   and fires immediately. */
const MAX_TIMEOUT_MS = 2_147_483_647

function parseTimestamp(value) {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export function useFundData() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  /* Imperative handles, published by the effect below and called from the UI. */
  const controlsRef = useRef(null)

  useEffect(() => {
    let disposed = false
    let timer = null
    let inFlight = false
    let retriedLate = false
    let abortController = null
    const meta = { nextRefreshAt: null, lastUpdated: null, hasData: false }

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }

    const armTimer = (delayMs) => {
      clearTimer()
      timer = setTimeout(() => run({ scheduled: true }), Math.min(delayMs, MAX_TIMEOUT_MS))
    }

    const armForNextRefresh = () => {
      if (!meta.nextRefreshAt) return
      armTimer(Math.max(meta.nextRefreshAt + GRACE_MS - Date.now(), 1_000))
    }

    /** True when new data could exist -- i.e. the refresh deadline has passed. */
    const isStale = () => {
      if (!meta.hasData) return true
      if (!meta.nextRefreshAt) return true // no schedule reported: don't assume freshness
      return Date.now() >= meta.nextRefreshAt + GRACE_MS
    }

    async function run({ scheduled = false } = {}) {
      if (inFlight || disposed) return null
      inFlight = true
      setIsRefreshing(true)

      abortController = new AbortController()
      const previousUpdated = meta.lastUpdated

      try {
        const next = await getFunds({ signal: abortController.signal })
        if (disposed) return null

        meta.nextRefreshAt = parseTimestamp(next.next_refresh_at)
        meta.lastUpdated = next.last_updated ?? null
        meta.hasData = true

        setPayload(next)
        setError(null)

        /* The scheduled fetch landed but the data hadn't been rebuilt yet --
           upstream was late. Come back once, then fall back to the normal
           schedule rather than looping. */
        if (scheduled && next.last_updated === previousUpdated && !retriedLate) {
          retriedLate = true
          armTimer(LATE_RETRY_MS)
        } else {
          retriedLate = false
          armForNextRefresh()
        }
        return next
      } catch (caught) {
        if (disposed || abortController.signal.aborted) return null
        /* Keep whatever is already on screen: a failed fetch must not blank a
           table that is merely a few hours stale. */
        setError(caught)
        return null
      } finally {
        inFlight = false
        abortController = null
        if (!disposed) {
          setIsRefreshing(false)
          setIsLoading(false)
        }
      }
    }

    const refetchIfStale = () => (isStale() ? run() : Promise.resolve(null))

    controlsRef.current = { run, refetchIfStale }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchIfStale()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refetchIfStale)
    /* Waking from sleep or recovering a dropped connection fires neither of the
       above when the tab already had focus. */
    window.addEventListener('online', refetchIfStale)

    run()

    return () => {
      disposed = true
      controlsRef.current = null
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refetchIfStale)
      window.removeEventListener('online', refetchIfStale)
      clearTimer()
      abortController?.abort()
    }
  }, [])

  const refresh = useCallback(() => controlsRef.current?.run() ?? Promise.resolve(null), [])
  const refetchIfStale = useCallback(
    () => controlsRef.current?.refetchIfStale() ?? Promise.resolve(null),
    [],
  )

  return {
    payload,
    funds: payload?.data ?? [],
    columns: payload?.columns ?? [],
    groups: payload?.groups ?? [],
    ratings: payload?.ratings ?? [],
    lastUpdated: payload?.last_updated ?? null,
    nextRefreshAt: payload?.next_refresh_at ?? null,
    /* A refresh that failed on the server: the rows are real but stale. */
    serverError: payload?.last_error ?? null,
    sourceMode: payload?.source_mode ?? null,
    error,
    isLoading,
    isRefreshing,
    refresh,
    refetchIfStale,
  }
}
