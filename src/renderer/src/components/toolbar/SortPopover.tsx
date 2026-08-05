import { ArrowUpDown, Plus, X } from 'lucide-react'
import type { Field, SortRule } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { fieldTypeInfo } from '@/lib/fields'
import { ToolbarButton } from './ToolbarButton'

export function SortPopover({
  fields,
  sorts,
  onChange
}: {
  fields: Field[]
  sorts: SortRule[]
  onChange: (sorts: SortRule[]) => void
}): React.JSX.Element {
  const unsortedFields = fields.filter((f) => !sorts.some((s) => s.fieldId === f.id))

  return (
    <Popover>
      <PopoverTrigger
        render={
          <ToolbarButton
            icon={ArrowUpDown}
            label="Sort"
            count={sorts.length > 0 ? sorts.length : undefined}
            active={sorts.length > 0}
          />
        }
      />
      <PopoverContent className="w-80 p-3" align="start">
        {sorts.length === 0 ? (
          <p className="mb-2 text-sm text-muted-foreground">No sorts applied.</p>
        ) : (
          <div className="mb-2 flex flex-col gap-1.5">
            {sorts.map((sort, index) => {
              const field = fields.find((f) => f.id === sort.fieldId)
              if (!field) return null
              return (
                <div key={sort.fieldId} className="flex items-center gap-1.5">
                  <Select
                    value={sort.fieldId}
                    onValueChange={(fieldId) => {
                      if (fieldId === null) return
                      onChange(sorts.map((s, i) => (i === index ? { ...s, fieldId } : s)))
                    }}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[field, ...unsortedFields].map((f) => {
                        const info = fieldTypeInfo(f.type)
                        return (
                          <SelectItem key={f.id} value={f.id}>
                            <info.icon className="size-3.5 text-muted-foreground" />
                            {f.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={sort.direction}
                    onValueChange={(direction) =>
                      onChange(
                        sorts.map((s, i) =>
                          i === index ? { ...s, direction: direction as SortRule['direction'] } : s
                        )
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="w-24 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A → Z</SelectItem>
                      <SelectItem value="desc">Z → A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground"
                    onClick={() => onChange(sorts.filter((_, i) => i !== index))}
                  >
                    <X />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
        {unsortedFields.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() =>
              onChange([...sorts, { fieldId: unsortedFields[0].id, direction: 'asc' }])
            }
          >
            <Plus data-slot="icon" />
            Add sort
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
