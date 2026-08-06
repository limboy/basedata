import { app, BrowserWindow } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

// How often to poll GitHub for a newer release while the app stays open.
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours
// Give the window a moment to open before the first network check.
const INITIAL_CHECK_DELAY_MS = 10_000

// Version of an update that has finished downloading and is ready to install.
// Non-null is what the renderer uses to decide whether to show the sidebar icon.
let readyVersion: string | null = null

function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, ...args)
  }
}

export function getReadyUpdateVersion(): string | null {
  return readyVersion
}

export function installReadyUpdate(): void {
  if (!readyVersion) return
  // Installs the downloaded update and relaunches the app.
  autoUpdater.quitAndInstall()
}

export function initAutoUpdater(): void {
  // electron-updater reads app-update.yml / the GitHub release feed that only
  // exists in a packaged, signed build — there's nothing to check in dev.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  // Install is user-initiated (sidebar click), not forced on quit.
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    readyVersion = info.version
    broadcast('updater:ready', info.version)
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] check failed:', err)
    })
  }

  setTimeout(check, INITIAL_CHECK_DELAY_MS)
  setInterval(check, CHECK_INTERVAL_MS)
}
