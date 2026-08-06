import { promises as fs } from 'fs'
import { join } from 'path'
import { newProject } from '@shared/defaults'
import type { Project, ProjectMeta } from '@shared/types'
import { getDataDir } from './config'

export const projectsDir = (): string => join(getDataDir(), 'projects')

const SAFE_ID = /^[a-zA-Z0-9-]+$/

// Timestamps of writes made by this process, so the directory watcher can
// tell the app's own saves apart from external ones (e.g. the agent CLI).
const selfWrites = new Map<string, number>()

export function wasRecentSelfWrite(filename: string): boolean {
  const at = selfWrites.get(filename)
  return at !== undefined && Date.now() - at < 1000
}

function projectPath(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error(`Invalid project id: ${id}`)
  return join(projectsDir(), `${id}.json`)
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(projectsDir(), { recursive: true })
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDir()
  const files = (await fs.readdir(projectsDir())).filter((f) => f.endsWith('.json'))
  const metas: ProjectMeta[] = []
  for (const file of files) {
    try {
      const raw = await fs.readFile(join(projectsDir(), file), 'utf-8')
      const p = JSON.parse(raw) as Project
      metas.push({
        id: p.id,
        name: p.name,
        icon: p.icon,
        recordCount: p.records.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })
    } catch {
      // skip unreadable files rather than failing the whole list
    }
  }
  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProject(id: string): Promise<Project> {
  const raw = await fs.readFile(projectPath(id), 'utf-8')
  return JSON.parse(raw) as Project
}

export async function saveProject(project: Project): Promise<void> {
  await ensureDir()
  const target = projectPath(project.id)
  const tmp = `${target}.tmp`
  selfWrites.set(`${project.id}.json`, Date.now())
  await fs.writeFile(tmp, JSON.stringify(project, null, 2), 'utf-8')
  await fs.rename(tmp, target)
  selfWrites.set(`${project.id}.json`, Date.now())
}

export async function createProject(name: string): Promise<Project> {
  const project = newProject(name.trim() || 'Untitled')
  await saveProject(project)
  return project
}

export async function deleteProject(id: string): Promise<void> {
  selfWrites.set(`${id}.json`, Date.now())
  await fs.rm(projectPath(id), { force: true })
}
