import type { ReactNode } from 'react'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { isMac } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Shared top bar for the routed pages. Reserves room for the macOS traffic
 * lights whenever the sidebar isn't there to host them itself — i.e. when
 * it's collapsed to icons/offcanvas, or rendered as a mobile overlay.
 */
export function PageHeader({
  children,
  className
}: {
  children?: ReactNode
  className?: string
}): React.JSX.Element {
  const { state, isMobile } = useSidebar()
  const needsTrafficLightGap = isMac && (isMobile || state === 'collapsed')

  return (
    <header
      className={cn(
        'titlebar-drag flex h-12 shrink-0 items-center gap-1 border-b px-2',
        needsTrafficLightGap && 'pl-20',
        className
      )}
    >
      <SidebarTrigger />
      {children}
    </header>
  )
}
