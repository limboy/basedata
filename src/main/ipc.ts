import { BrowserWindow, ipcMain } from 'electron'
import type { Project } from '@shared/types'
import { createProject, deleteProject, getProject, listProjects, saveProject } from './storage'
import { pickImage } from './images'
import { getReadyUpdateVersion, installReadyUpdate } from './updater'

export function registerIpc(): void {
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('projects:create', (_e, name: string) => createProject(name))
  ipcMain.handle('projects:get', (_e, id: string) => getProject(id))
  ipcMain.handle('projects:save', (_e, project: Project) => saveProject(project))
  ipcMain.handle('projects:delete', (_e, id: string) => deleteProject(id))
  ipcMain.handle('images:pick', (e) => pickImage(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('updater:status', () => getReadyUpdateVersion())
  ipcMain.handle('updater:install', () => installReadyUpdate())
}
