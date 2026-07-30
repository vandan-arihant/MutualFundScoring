import { useEffect, useState } from 'react'

/**
 * Delays propagating a value until it stops changing.
 *
 * Filtering 1,383 rows on every keystroke is wasteful and makes typing feel
 * sticky; the input itself stays instant because only the derived value waits.
 */
export function useDebouncedValue(value, delayMs = 200) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
