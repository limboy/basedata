import { BrowserWindow } from 'electron'
import { watch } from 'fs'
import { projectsDir, wasRecentSelfWrite } from './storage'

/**
 * Watches the projects directory so edits made outside the app (e.g. by the
 * agent CLI) show up live in open windows. The app's own saves are filtered
 * out via wasRecentSelfWrite to avoid refetch churn on every keystroke.
 */
export function watchProjects(): void {
  let timer: NodeJS.Timeout | undefined
  watch(projectsDir(), (_event, filename) => {
    if (!filename || !filename.endsWith('.json')) return
    if (wasRecentSelfWrite(filename)) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('projects:changed')
      }
    }, 200)
  })
}
