import { app, BrowserWindow, protocol, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { registerImageProtocol } from './images'
import { seedIfEmpty } from './seed'
import { watchProjects } from './watcher'
import { initAutoUpdater } from './updater'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app-image', privileges: { secure: true, supportFetchAPI: true, stream: true } }
])

const iconPath = join(__dirname, '../../build/icon.png')
// Packaged builds get their dock icon from the .icns baked into the app
// bundle, which macOS auto-masks into the rounded squircle. Dev mode sets
// the dock icon manually via app.dock.setIcon(), which draws the image
// as-is with no OS masking — so it needs its own pre-rounded, pre-padded
// source to avoid showing up as a big flat square.
const devIconPath = join(__dirname, '../../build/icon-dev.png')

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: { x: 16, y: 16 },
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(devIconPath)
  }
  registerImageProtocol()
  registerIpc()
  await seedIfEmpty()
  watchProjects()
  createWindow()
  initAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
