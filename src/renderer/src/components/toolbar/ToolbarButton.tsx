import { forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps extends React.ComponentProps<typeof Button> {
  icon: LucideIcon
  label: string
  count?: number
  active?: boolean
}

/** Compact toolbar trigger with an optional active count, shared by all views. */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ icon: Icon, label, count, active, className, ...props }, ref) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className={cn('h-7 gap-1.5 px-2 text-[13px] font-normal', active && 'bg-accent', className)}
        {...props}
      >
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
        {count !== undefined && (
          <span className="rounded-sm bg-primary/10 px-1 text-xs font-medium tabular-nums">
            {count}
          </span>
        )}
      </Button>
    )
  }
)
