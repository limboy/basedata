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
    const path = window.api.getPathForFile(file)
    if (!path) return
    const importFile = kind === 'image' ? window.api.importImage : window.api.importAudio
    void importFile(path).then((url) => {
      if (url) onChange(url)
    })
  }

  return { isOver, onDragOver, onDragLeave, onDrop }
}
