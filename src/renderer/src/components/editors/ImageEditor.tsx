import { useState } from 'react'
import { FolderOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ImageEditor({
  value,
  onChange
}: {
  value: unknown
  onChange: (value: unknown) => void
}): React.JSX.Element {
  const current = typeof value === 'string' && value ? value : undefined
  const [urlDraft, setUrlDraft] = useState('')

  const applyUrl = (): void => {
    const url = urlDraft.trim()
    if (url) {
      onChange(url)
      setUrlDraft('')
    }
  }

  const pickFile = async (): Promise<void> => {
    const url = await window.api.pickImage()
    if (url) onChange(url)
  }

  return (
    <div className="flex flex-col gap-2">
      {current && (
        <div className="relative">
          <img src={current} alt="" className="max-h-40 w-full rounded-md border object-cover" />
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-1.5 top-1.5 size-6 shadow-sm"
            onClick={() => onChange(undefined)}
          >
            <X />
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => void pickFile()}>
        <FolderOpen data-slot="icon" />
        Choose file…
      </Button>
      <div className="flex gap-1.5">
        <Input
          className="h-8 text-sm"
          placeholder="Or paste an image URL"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
        />
        {urlDraft.trim() && (
          <Button size="sm" variant="secondary" onClick={applyUrl}>
            Set
          </Button>
        )}
      </div>
    </div>
  )
}
