import { useState } from 'react'

const hasFiles = (e: React.DragEvent): boolean => Array.from(e.dataTransfer.types).includes('Files')

export interface FileDropHandlers {
  isOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

/**
 * Wires up dropping a single OS file (e.g. dragged from Finder/Explorer) onto
 * an element: imports it into local storage and calls `onChange` with the
 * resulting `app-image://`/`app-audio://` URL. Returns drag handlers to spread
 * onto the drop target, plus `isOver` for a hover affordance.
 *
 * Reads the file's bytes directly (`File.arrayBuffer()`) rather than going
 * through `webUtils.getPathForFile`, which has proven unreliable for Files
 * crossing the context bridge from a drop event.
 */
export function useFileDrop(
  kind: 'image' | 'audio',
  onChange: (value: string) => void
): FileDropHandlers {
  const [isOver, setIsOver] = useState(false)

  const onDragOver = (e: React.DragEvent): void => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsOver(true)
  }

  const onDragLeave = (e: React.DragEvent): void => {
    e.stopPropagation()
    setIsOver(false)
  }

  const onDrop = (e: React.DragEvent): void => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.stopPropagation()
    setIsOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const importData = kind === 'image' ? window.api.importImageData : window.api.importAudioData
    void file
      .arrayBuffer()
      .then((data) => importData(file.name, data))
      .then((url) => {
        if (url) onChange(url)
        else console.error(`[useFileDrop] failed to import dropped ${kind} file: ${file.name}`)
      })
      .catch((err) => console.error(`[useFileDrop] error importing dropped ${kind} file`, err))
  }

  return { isOver, onDragOver, onDragLeave, onDrop }
}
