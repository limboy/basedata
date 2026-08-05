import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { newProject } from '@shared/defaults'
import type { Project, ProjectMeta } from '@shared/types'

export const projectsDir = (): string => join(app.getPath('userData'), 'projects')

const SAFE_ID = /^[a-zA-Z0-9-]+$/

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
  await fs.writeFile(tmp, JSON.stringify(project, null, 2), 'utf-8')
  await fs.rename(tmp, target)
}

export async function createProject(name: string): Promise<Project> {
  const project = newProject(name.trim() || 'Untitled')
  await saveProject(project)
  return project
}

export async function deleteProject(id: string): Promise<void> {
  await fs.rm(projectPath(id), { force: true })
}
