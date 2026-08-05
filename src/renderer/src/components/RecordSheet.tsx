import { Trash2 } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ValueEditor } from '@/components/editors/ValueEditor'
import { displayValue, fieldTypeInfo } from '@/lib/fields'
import * as ops from '@/lib/ops'
import type { ProjectUpdater } from '@/lib/queries'

export function RecordSheet({
  project,
  recordId,
  onClose,
  update
}: {
  project: Project
  recordId: string | null
  onClose: () => void
  update: ProjectUpdater
}): React.JSX.Element {
  const record = project.records.find((r) => r.id === recordId)
  const titleField = project.fields[0]
  const title =
    record && titleField ? displayValue(titleField, record.values[titleField.id]) : ''

  return (
    <Sheet open={record !== undefined} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] gap-0 sm:max-w-[420px]">
        <SheetHeader className="pb-3">
          <SheetTitle className="truncate pr-8">{title || 'Untitled record'}</SheetTitle>
        </SheetHeader>
        {record && (
          <>
            <ScrollArea className="min-h-0 flex-1 px-4">
              <div className="flex flex-col gap-4 pt-1 pb-4">
                {project.fields.map((field) => {
                  const info = fieldTypeInfo(field.type)
                  return (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <info.icon className="size-3.5" />
                        {field.name}
                      </div>
                      <ValueEditor
                        field={field}
                        value={record.values[field.id]}
                        onChange={(value) =>
                          update((p) => ops.setRecordValue(p, record.id, field.id, value))
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <span className="text-xs text-muted-foreground">
                Created {new Date(record.createdAt).toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  update((p) => ops.deleteRecord(p, record.id))
                  onClose()
                }}
              >
                <Trash2 data-slot="icon" />
                Delete record
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
