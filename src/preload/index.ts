import { contextBridge, ipcRenderer } from 'electron'
import type { Api, Project } from '@shared/types'

const api: Api = {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (name: string) => ipcRenderer.invoke('projects:create', name),
  getProject: (id: string) => ipcRenderer.invoke('projects:get', id),
  saveProject: (project: Project) => ipcRenderer.invoke('projects:save', project),
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id),
  pickImage: () => ipcRenderer.invoke('images:pick')
}

contextBridge.exposeInMainWorld('api', api)
