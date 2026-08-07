import { app, BrowserWindow, Menu, protocol, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { registerImageProtocol } from './images'
import { registerAudioProtocol } from './audio'
import { seedIfEmpty } from './seed'
import { watchProjects } from './watcher'
import { initAutoUpdater } from './updater'
import { buildAppMenu } from './menu'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app-image', privileges: { secure: true, supportFetchAPI: true, stream: true } },
  { scheme: 'app-audio', privileges: { secure: true, supportFetchAPI: true, stream: true } }
])

const iconPath = join(__dirname, '../../build/icon.png')

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
  // Adds "Install 'crow' Command in PATH" to Electron's default mac menu;
  // other platforms keep the built-in default (CLI install isn't wired up
  // there yet — see src/main/cli.ts).
  if (process.platform === 'darwin') Menu.setApplicationMenu(buildAppMenu())

  registerImageProtocol()
  registerAudioProtocol()
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
