import type { SelectChoice } from '@shared/types'
import { CHOICE_BADGE_CLASSES } from '@/lib/fields'
import { cn } from '@/lib/utils'

export function ChoiceBadge({
  choice,
  className
}: {
  choice: SelectChoice
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-xs font-medium',
        CHOICE_BADGE_CLASSES[choice.color],
        className
      )}
    >
      {choice.name}
    </span>
  )
}
