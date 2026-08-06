import { BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import type { ContextMenuItem, Project } from '@shared/types'
import { createProject, deleteProject, ensureProjectsDir, getProject, listProjects, saveProject } from './storage'
import { importImageData, pickImage } from './images'
import { importAudioData, pickAudio } from './audio'
import { getReadyUpdateVersion, installReadyUpdate } from './updater'
import { defaultDataDir, getDataDir, setDataDir } from './config'
import { watchProjects } from './watcher'

export function registerIpc(): void {
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('projects:create', (_e, name: string) => createProject(name))
  ipcMain.handle('projects:get', (_e, id: string) => getProject(id))
  ipcMain.handle('projects:save', (_e, project: Project) => saveProject(project))
  ipcMain.handle('projects:delete', (_e, id: string) => deleteProject(id))
  ipcMain.handle('images:pick', (e) => pickImage(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('images:importData', (_e, name: string, data: ArrayBuffer) => importImageData(name, data))
  ipcMain.handle('audio:pick', (e) => pickAudio(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('audio:importData', (_e, name: string, data: ArrayBuffer) => importAudioData(name, data))
  ipcMain.handle('updater:status', () => getReadyUpdateVersion())
  ipcMain.handle('updater:install', () => installReadyUpdate())

  ipcMain.handle('menu:popup', (e, items: ContextMenuItem[]) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    return new Promise<string | null>((resolve) => {
      let resolved = false
      const settle = (id: string | null): void => {
        if (resolved) return
        resolved = true
        resolve(id)
      }
      const menu = Menu.buildFromTemplate(
        items.map((item) =>
          item.type === 'separator'
            ? { type: 'separator' as const }
            : { label: item.label, click: () => settle(item.id) }
        )
      )
      menu.popup({ window: win, callback: () => settle(null) })
    })
  })

  ipcMain.handle('settings:getDataDir', () => ({
    current: getDataDir(),
    default: defaultDataDir()
  }))

  ipcMain.handle('settings:pickDataDir', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const options = {
      properties: ['openDirectory' as const, 'createDirectory' as const]
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('settings:setDataDir', async (_e, dir: string, move: boolean) => {
    await setDataDir(dir, { move })
    // The move:false path points at a folder that may still be empty (no
    // projects/ subfolder yet), which would make the watcher below throw.
    await ensureProjectsDir()
    watchProjects()
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('projects:changed')
    }
  })
}
