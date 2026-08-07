export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'crow-theme'

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function setStoredTheme(theme: Theme): void {
  // 'system' has no explicit entry — its absence *is* the system default,
  // so a future OS-preference change is picked up without a stale override.
  if (theme === 'system') {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, theme)
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
}

// Applied as a side effect of importing this module (see main.tsx, imported
// before the app renders) so the right theme is already on <html> before
// the first paint instead of flashing light and then switching to dark.
applyTheme(getStoredTheme())
