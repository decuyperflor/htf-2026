import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'achrona-theme'

/**
 * Runs in <head> before React, so a dark-mode user never sees a white flash.
 * Kept as a string: it must be inlined into the HTML.
 */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`

function current(): Theme {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Light/dark toggle, remembered per browser (a viewer preference, so localStorage is fine). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => setTheme(current()), [])

  const toggle = useCallback(() => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark'
    if (next === 'dark') document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Private mode etc.: the toggle still works for this visit.
    }
    setTheme(next)
  }, [])

  return { theme, toggle }
}
