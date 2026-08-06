import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'fs'
import { projectsDir, wasRecentSelfWrite } from './storage'

let activeWatcher: FSWatcher | undefined

/**
 * Watches the projects directory so edits made outside the app (e.g. by the
 * agent CLI) show up live in open windows. The app's own saves are filtered
 * out via wasRecentSelfWrite to avoid refetch churn on every keystroke.
 *
 * Safe to call again after the data directory changes — it closes any
 * previous watcher before watching the new location.
 */
export function watchProjects(): void {
  activeWatcher?.close()
  activeWatcher = undefined
  let timer: NodeJS.Timeout | undefined
  try {
    activeWatcher = watch(projectsDir(), (_event, filename) => {
      if (!filename || !filename.endsWith('.json')) return
      if (wasRecentSelfWrite(filename)) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('projects:changed')
        }
      }, 200)
    })
  } catch (err) {
    // The directory may not exist yet (e.g. a freshly chosen, still-empty
    // data folder). Skip watching rather than crashing the caller — the
    // next call to watchProjects() (e.g. after the folder is created) will
    // pick it up.
    console.warn('watchProjects: failed to watch projects directory', err)
  }
}
