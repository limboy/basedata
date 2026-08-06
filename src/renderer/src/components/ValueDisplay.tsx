import { Check } from 'lucide-react'
import type { Field } from '@shared/types'
import { choiceById, choicesByIds, displayValue, isEmptyValue } from '@/lib/fields'
import { cn } from '@/lib/utils'
import { ChoiceBadge } from './ChoiceBadge'

/** Read-only rendering of a record value, shared by table cells and cards. */
export function ValueDisplay({
  field,
  value,
  className,
  lineClamp = 1
}: {
  field: Field
  value: unknown
  className?: string
  /** Number of text lines to wrap to before truncating; 1 keeps the classic single-line clip. */
  lineClamp?: number
}): React.JSX.Element | null {
  if (isEmptyValue(field, value)) return null

  // Tailwind needs literal class names to see at build time, so map rather than interpolate.
  const clampClass =
    { 2: 'line-clamp-2', 4: 'line-clamp-4' }[lineClamp] ?? (lineClamp > 1 ? 'line-clamp-6' : null)
  const wrapClass = clampClass ? cn(clampClass, 'whitespace-pre-wrap break-words') : 'truncate'

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
            wrapClass,
            'text-blue-600 underline-offset-2 hover:underline dark:text-blue-400',
            className
          )}
        >
          {String(value)}
        </a>
      )
    case 'image': {
      // `max-h-full` can't resolve inside a table cell (no definite containing-block
      // height in standard table layout), so the thumbnail would render at its
      // intrinsic size and blow up the row. Cap it to a fixed height per row-height
      // tier instead, sized to fit within that row after its padding/border.
      const imageMaxHeightClass = { 2: 'max-h-12', 4: 'max-h-24' }[lineClamp] ?? 'max-h-32'
      return (
        <img
          src={String(value)}
          alt=""
          className={cn(
            'rounded-sm border',
            lineClamp > 1
              ? cn(imageMaxHeightClass, 'max-w-full object-contain')
              : 'h-6 w-10 object-cover',
            className
          )}
        />
      )
    }
    case 'audio':
      return (
        <audio
          src={String(value)}
          controls
          onClick={(e) => e.stopPropagation()}
          className={cn('h-8 max-w-full', className)}
        />
      )
    default:
      return <span className={cn(wrapClass, className)}>{displayValue(field, value)}</span>
  }
}
