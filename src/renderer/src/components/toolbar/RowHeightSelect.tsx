import type { RowHeight } from '@shared/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ROW_HEIGHT_OPTIONS, rowHeightInfo } from '@/lib/rowHeight'
import { ToolbarButton } from './ToolbarButton'

/** Toolbar dropdown for choosing how tall table rows render. */
export function RowHeightSelect({
  value,
  onChange
}: {
  value: RowHeight | undefined
  onChange: (value: RowHeight) => void
}): React.JSX.Element {
  const active = rowHeightInfo(value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<ToolbarButton icon={active.icon} label="Row height" />} />
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Row height
          </DropdownMenuLabel>
          {ROW_HEIGHT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              data-active={option.value === active.value || undefined}
              className="data-[active]:bg-accent mt-0.5 first:mt-0"
            >
              <option.icon className="size-3.5 text-muted-foreground" />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
