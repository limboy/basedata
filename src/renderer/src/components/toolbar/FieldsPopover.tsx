import { Eye, EyeOff } from 'lucide-react'
import type { Field } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fieldTypeInfo } from '@/lib/fields'
import { ToolbarButton } from './ToolbarButton'

export function FieldsPopover({
  fields,
  hiddenFieldIds,
  onChange
}: {
  fields: Field[]
  hiddenFieldIds: string[]
  onChange: (hiddenFieldIds: string[]) => void
}): React.JSX.Element {
  const hiddenCount = hiddenFieldIds.filter((id) => fields.some((f) => f.id === id)).length

  const toggle = (fieldId: string, visible: boolean): void => {
    onChange(
      visible ? hiddenFieldIds.filter((id) => id !== fieldId) : [...hiddenFieldIds, fieldId]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <ToolbarButton
            icon={hiddenCount > 0 ? EyeOff : Eye}
            label="Fields"
            count={hiddenCount > 0 ? hiddenCount : undefined}
            active={hiddenCount > 0}
          />
        }
      />
      <PopoverContent className="w-60 p-1.5" align="start">
        <div className="flex flex-col">
          {fields.map((field) => {
            const info = fieldTypeInfo(field.type)
            const visible = !hiddenFieldIds.includes(field.id)
            return (
              <label
                key={field.id}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={visible}
                  onCheckedChange={(checked) => toggle(field.id, checked === true)}
                />
                <info.icon className="size-3.5 text-muted-foreground" />
                <span className="truncate">{field.name}</span>
              </label>
            )
          })}
        </div>
        {fields.length > 1 && (
          <div className="mt-1 flex gap-1 border-t pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 text-xs text-muted-foreground"
              onClick={() => onChange([])}
            >
              Show all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 text-xs text-muted-foreground"
              onClick={() => onChange(fields.slice(1).map((f) => f.id))}
            >
              Hide all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
