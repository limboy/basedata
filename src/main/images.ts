import { dialog, net, protocol, type BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { pathToFileURL } from 'url'
import { randomUUID } from 'crypto'
import { getDataDir } from './config'

export const imagesDir = (): string => join(getDataDir(), 'images')

export async function pickImage(win: BrowserWindow | null): Promise<string | null> {
  const options = {
    properties: ['openFile' as const],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'] }]
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  const source = result.filePaths[0]
  if (result.canceled || !source) return null

  await fs.mkdir(imagesDir(), { recursive: true })
  const ext = extname(source).toLowerCase() || '.png'
  const name = `${randomUUID()}${ext}`
  await fs.copyFile(source, join(imagesDir(), name))
  return `app-image:///${name}`
}

// Serves userData/images/<name> as app-image:///<name> so the renderer can
// display locally stored images without loosening webSecurity.
export function registerImageProtocol(): void {
  protocol.handle('app-image', (request) => {
    const pathname = decodeURIComponent(new URL(request.url).pathname)
    const name = basename(pathname)
    if (!name || name.startsWith('.')) return new Response(null, { status: 400 })
    return net.fetch(pathToFileURL(join(imagesDir(), name)).toString())
  })
}
