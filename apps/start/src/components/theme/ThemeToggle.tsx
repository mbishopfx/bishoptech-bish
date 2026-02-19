import { Button } from '@rift/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@rift/ui/hooks/useTheme'

export function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme()
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      variant="sidebarIcon"
      size="iconSidebar"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun className="" />
      ) : (
        <Moon className="" />
      )}
    </Button>
  )
}
