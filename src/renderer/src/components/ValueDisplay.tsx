import { Check } from 'lucide-react'
import type { Field } from '@shared/types'
import { choiceById, choicesByIds, displayValue, isEmptyValue } from '@/lib/fields'
import { cn } from '@/lib/utils'
import { ChoiceBadge } from './ChoiceBadge'

/** Read-only rendering of a record value, shared by table cells and cards. */
export function ValueDisplay({
  field,
  value,
  className
}: {
  field: Field
  value: unknown
  className?: string
}): React.JSX.Element | null {
  if (isEmptyValue(field, value)) return null

  switch (field.type) {
    case 'select': {
      const choice = choiceById(field, value)
      return choice ? <ChoiceBadge choice={choice} className={className} /> : null
    }
    case 'multiSelect':
      return (
        <span className={cn('flex flex-wrap items-center gap-1', className)}>
          {choicesByIds(field, value).map((choice) => (
            <ChoiceBadge key={choice.id} choice={choice} />
          ))}
        </span>
      )
    case 'checkbox':
      return (
        <span
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-[4px] bg-primary text-primary-foreground',
            className
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      )
    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'truncate text-blue-600 underline-offset-2 hover:underline dark:text-blue-400',
            className
          )}
        >
          {String(value)}
        </a>
      )
    case 'image':
      return (
        <img
          src={String(value)}
          alt=""
          className={cn('h-6 w-10 rounded-sm border object-cover', className)}
        />
      )
    default:
      return <span className={cn('truncate', className)}>{displayValue(field, value)}</span>
  }
}
