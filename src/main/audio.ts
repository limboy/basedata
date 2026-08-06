import { dialog, net, protocol, type BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { pathToFileURL } from 'url'
import { randomUUID } from 'crypto'
import { getDataDir } from './config'

export const audioDir = (): string => join(getDataDir(), 'audio')

async function copyIntoAudio(source: string): Promise<string> {
  await fs.mkdir(audioDir(), { recursive: true })
  const ext = extname(source).toLowerCase() || '.mp3'
  const name = `${randomUUID()}${ext}`
  await fs.copyFile(source, join(audioDir(), name))
  return `app-audio:///${name}`
}

export async function pickAudio(win: BrowserWindow | null): Promise<string | null> {
  const options = {
    properties: ['openFile' as const],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }]
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  const source = result.filePaths[0]
  if (result.canceled || !source) return null
  return copyIntoAudio(source)
}

/**
 * Imports raw file bytes (e.g. dropped from the OS file manager). Takes bytes
 * rather than a source path because `webUtils.getPathForFile` has proven
 * unreliable for drag-and-drop Files passed across the context bridge.
 */
export async function importAudioData(name: string, data: ArrayBuffer): Promise<string | null> {
  try {
    await fs.mkdir(audioDir(), { recursive: true })
    const ext = extname(name).toLowerCase() || '.mp3'
    const fileName = `${randomUUID()}${ext}`
    // fs.writeFile doesn't accept a raw ArrayBuffer (only Buffer/TypedArray/DataView).
    await fs.writeFile(join(audioDir(), fileName), Buffer.from(data))
    return `app-audio:///${fileName}`
  } catch (err) {
    console.error('[importAudioData] failed to import', name, err)
    return null
  }
}

// Serves userData/audio/<name> as app-audio:///<name> so the renderer can
// play locally stored audio without loosening webSecurity.
export function registerAudioProtocol(): void {
  protocol.handle('app-audio', (request) => {
    const pathname = decodeURIComponent(new URL(request.url).pathname)
    const name = basename(pathname)
    if (!name || name.startsWith('.')) return new Response(null, { status: 400 })
    return net.fetch(pathToFileURL(join(audioDir(), name)).toString())
  })
}
