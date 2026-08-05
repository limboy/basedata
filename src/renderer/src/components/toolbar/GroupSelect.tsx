import { Rows3 } from 'lucide-react'
import type { Field } from '@shared/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { fieldTypeInfo } from '@/lib/fields'
import { ToolbarButton } from './ToolbarButton'

/** Toolbar dropdown for choosing which field to group / bucket records by. */
export function GroupSelect({
  fields,
  value,
  onChange,
  label = 'Group',
  icon = Rows3,
  noneLabel = 'No grouping'
}: {
  fields: Field[]
  value?: string
  onChange: (fieldId: string | undefined) => void
  label?: string
  icon?: typeof Rows3
  noneLabel?: string
}): React.JSX.Element {
  const active = fields.find((f) => f.id === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <ToolbarButton
            icon={icon}
            label={active ? `${label}: ${active.name}` : label}
            active={active !== undefined}
          />
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {label} by
          </DropdownMenuLabel>
          {fields.map((field) => {
            const info = fieldTypeInfo(field.type)
            return (
              <DropdownMenuItem
                key={field.id}
                onClick={() => onChange(field.id)}
                data-active={field.id === value || undefined}
                className="data-[active]:bg-accent"
              >
                <info.icon className="size-3.5 text-muted-foreground" />
                {field.name}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-muted-foreground" onClick={() => onChange(undefined)}>
          {noneLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
