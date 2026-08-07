import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

// A standalone button rather than a SidebarMenuAction: that primitive overlays
// its parent SidebarMenuButton and shares its hover background, which reads
// as one control. This sits beside Settings as its own independent target.
export function ThemeToggle(): React.JSX.Element {
  const { resolved, toggle } = useTheme()
  const isDark = resolved === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'flex size-8 shrink-0 cursor-default items-center justify-center rounded-md',
        'text-sidebar-foreground outline-hidden ring-sidebar-ring transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2',
        '[&>svg]:size-4 [&>svg]:shrink-0'
      )}
    >
      {isDark ? <Moon /> : <Sun />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
