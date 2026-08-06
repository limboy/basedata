import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [current, setCurrent] = useState<string | null>(null)
  const [defaultDir, setDefaultDir] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moveExisting, setMoveExisting] = useState(true)

  useEffect(() => {
    if (!open) return
    setError(null)
    void window.api.getDataDir().then(({ current, default: def }) => {
      setCurrent(current)
      setDefaultDir(def)
    })
  }, [open])

  const applyDataDir = async (dir: string): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await window.api.setDataDir(dir, moveExisting)
      setCurrent(dir)
      await queryClient.invalidateQueries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move data to that folder.')
    } finally {
      setBusy(false)
    }
  }

  const handleChoose = async (): Promise<void> => {
    const dir = await window.api.pickDataDir()
    if (!dir) return
    await applyDataDir(dir)
  }

  const handleReset = async (): Promise<void> => {
    if (!defaultDir) return
    await applyDataDir(defaultDir)
  }

  const isDefault = current !== null && current === defaultDir

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Data location</p>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate" title={current ?? undefined}>
              {current ?? 'Loading…'}
            </span>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleChoose()}>
              <FolderOpen />
              Choose Folder…
            </Button>
            {!isDefault && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void handleReset()}>
                Reset to Default
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Checkbox
              checked={moveExisting}
              onCheckedChange={(checked) => setMoveExisting(checked === true)}
              disabled={busy}
            />
            Move existing projects to the new folder
          </label>
        </div>
      </DialogContent>
    </Dialog>
  )
}
