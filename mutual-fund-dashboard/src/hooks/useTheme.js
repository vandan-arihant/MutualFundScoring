import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mfdash.theme'
export const THEME_OPTIONS = ['system', 'light', 'dark']

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEME_OPTIONS.includes(stored) ? stored : 'system'
  } catch {
    return 'system' // private mode / storage disabled
  }
}

/**
 * Theme preference, persisted across visits.
 *
 * 'system' removes the data-theme attribute entirely so the stylesheet's
 * prefers-color-scheme rules take over; an explicit choice stamps the attribute,
 * which the tokens in index.css give higher precedence than the media query.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readStored)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* not persisting is acceptable; the session still works */
    }
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme((current) => THEME_OPTIONS[(THEME_OPTIONS.indexOf(current) + 1) % THEME_OPTIONS.length])
  }, [])

  return { theme, setTheme, cycleTheme }
}
