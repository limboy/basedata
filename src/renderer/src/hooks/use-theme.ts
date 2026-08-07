import { useCallback, useEffect, useState } from 'react'
import { applyTheme, getStoredTheme, resolveTheme, setStoredTheme, type Theme } from '@/lib/theme'

/**
 * Tracks the active theme, defaulting to whatever the OS prefers. Toggling
 * pins an explicit light/dark choice (persisted to localStorage); there's no
 * way back to "system" from the UI yet, matching the sun/moon toggle's
 * two-state affordance.
 */
export function useTheme(): { resolved: 'light' | 'dark'; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(theme))

  useEffect(() => {
    applyTheme(theme)
    setResolved(resolveTheme(theme))

    if (theme !== 'system') return undefined

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => {
      applyTheme('system')
      setResolved(resolveTheme('system'))
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  const toggle = useCallback(() => {
    const next: Theme = resolved === 'dark' ? 'light' : 'dark'
    setStoredTheme(next)
    setTheme(next)
  }, [resolved])

  return { resolved, toggle }
}
