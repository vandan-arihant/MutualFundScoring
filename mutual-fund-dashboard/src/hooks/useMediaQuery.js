import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query.
 *
 * Layout is CSS-driven wherever possible; this is for the cases where the markup
 * itself has to differ -- rendering an 18-column table on a phone is not a
 * styling problem, it's the wrong component.
 *
 * useSyncExternalStore rather than useState + useEffect: matchMedia *is* an
 * external store, and this way React reads the current value during render
 * instead of rendering once with a stale value and then re-rendering.
 */
export function useMediaQuery(query) {
  const list = useMemo(() => window.matchMedia(query), [query])

  const subscribe = useCallback(
    (onStoreChange) => {
      list.addEventListener('change', onStoreChange)
      return () => list.removeEventListener('change', onStoreChange)
    },
    [list],
  )

  const getSnapshot = useCallback(() => list.matches, [list])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** Phone-width breakpoint: below this the table is replaced by cards. */
export const useIsCompact = () => useMediaQuery('(max-width: 767px)')
