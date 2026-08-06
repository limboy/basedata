import { app } from 'electron'
import { existsSync, promises as fs, readFileSync, writeFileSync } from 'fs'
import { join, relative, isAbsolute } from 'path'

interface AppConfig {
  /** Custom root directory for projects/images, if the user changed it. */
  dataDir?: string
}

// This file always lives at Electron's fixed userData path — it's the one
// thing that can't move, since it's what tells us where everything else is.
const configFile = (): string => join(app.getPath('userData'), 'config.json')

function readConfig(): AppConfig {
  try {
    return JSON.parse(readFileSync(configFile(), 'utf-8')) as AppConfig
  } catch {
    return {}
  }
}

function writeConfig(config: AppConfig): void {
  writeFileSync(configFile(), JSON.stringify(config, null, 2), 'utf-8')
}

/** The app's built-in storage location, used unless the user picks another. */
export const defaultDataDir = (): string => app.getPath('userData')

let currentDataDir: string | null = null

/** Root directory where the `projects/` and `images/` folders live. */
export function getDataDir(): string {
  if (currentDataDir) return currentDataDir
  const configured = readConfig().dataDir
  // Fall back to the default if the configured folder is missing (e.g. an
  // unmounted external drive) rather than silently writing new data there.
  currentDataDir = configured && existsSync(configured) ? configured : defaultDataDir()
  return currentDataDir
}

/**
 * Points the app at a new data folder. By default it also moves the
 * existing projects/ and images/ folders there — copying first and only
 * removing the old copies once that succeeds, so a failed copy leaves the
 * original data untouched. Pass `move: false` to just switch to the new
 * (presumably empty, or already-populated) folder and leave the old data
 * where it is.
 */
export async function setDataDir(newDir: string, { move = true }: { move?: boolean } = {}): Promise<void> {
  const from = getDataDir()
  if (newDir === from) return

  const subdirs = ['projects', 'images']

  if (move) {
    // Refuse to move data into a folder nested inside the current one — that
    // would have the copy step write into the very folder it's reading from.
    const rel = relative(from, newDir)
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
      throw new Error('The new folder cannot be inside the current data folder.')
    }
  }

  await fs.mkdir(newDir, { recursive: true })

  if (move) {
    for (const sub of subdirs) {
      const src = join(from, sub)
      if (!existsSync(src)) continue
      await fs.cp(src, join(newDir, sub), { recursive: true })
    }
  }

  currentDataDir = newDir
  if (newDir === defaultDataDir()) {
    writeConfig({})
  } else {
    writeConfig({ dataDir: newDir })
  }

  if (move) {
    for (const sub of subdirs) {
      const src = join(from, sub)
      if (existsSync(src)) await fs.rm(src, { recursive: true, force: true })
    }
  }
}
