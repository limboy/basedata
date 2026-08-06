import type { Field } from '@shared/types'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { CHOICE_DOT_CLASSES } from '@/lib/fields'
import { cn } from '@/lib/utils'

/**
 * Popover body for picking select / multiSelect values. Single select stores a
 * choice id (or undefined), multi select stores an array of choice ids.
 */
export function SelectEditor({
  field,
  value,
  multi,
  onChange,
  onDone
}: {
  field: Field
  value: unknown
  multi: boolean
  onChange: (value: unknown) => void
  onDone?: () => void
}): React.JSX.Element {
  const choices = field.options?.choices ?? []
  const selectedIds = multi
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === 'string'
      ? [value]
      : []

  // cmdk keyboard-focuses the first item in the list by default, which reads
  // as "selected" even when it isn't. Point the initial focus at the current
  // value instead, so the highlight and the checkmark always agree.
  const firstSelectedChoice = choices.find((c) => selectedIds.includes(c.id))

  const toggle = (choiceId: string): void => {
    if (multi) {
      const next = selectedIds.includes(choiceId)
        ? selectedIds.filter((id) => id !== choiceId)
        : [...selectedIds, choiceId]
      onChange(next)
    } else {
      onChange(selectedIds.includes(choiceId) ? undefined : choiceId)
      onDone?.()
    }
  }

  return (
    <Command defaultValue={firstSelectedChoice?.name}>
      <CommandInput placeholder="Search options…" />
      <CommandList>
        <CommandEmpty>No options found.</CommandEmpty>
        <CommandGroup>
          {choices.map((choice) => (
            <CommandItem
              key={choice.id}
              value={choice.name}
              data-checked={selectedIds.includes(choice.id)}
              onSelect={() => toggle(choice.id)}
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', CHOICE_DOT_CLASSES[choice.color])} />
              <span className="truncate">{choice.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {!multi && selectedIds.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="__clear__"
                className="text-muted-foreground"
                onSelect={() => {
                  onChange(undefined)
                  onDone?.()
                }}
              >
                Clear selection
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  )
}
