import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Avatar, AvatarFallback } from '@rift/ui/avatar'
import { Button } from '@rift/ui/button'
import { Link, useLocation } from '@tanstack/react-router'
import { Compass, Network } from 'lucide-react'
import type { ComponentType } from 'react'

const SIDEBAR_GROUPS_WIDTH = 64
const SIDEBAR_AREAS_WIDTH = 240
const SIDEBAR_WIDTH = SIDEBAR_GROUPS_WIDTH + SIDEBAR_AREAS_WIDTH

const SIDEBAR_STYLE: React.CSSProperties = {
  '--sidebar-width': `${SIDEBAR_WIDTH}px`,
  '--sidebar-groups-width': `${SIDEBAR_GROUPS_WIDTH}px`,
  '--sidebar-areas-width': `${SIDEBAR_AREAS_WIDTH}px`,
} as React.CSSProperties

export const AppSidebar: ComponentType = () => {
  const { pathname } = useLocation()
  const shortLinksActive = pathname === '/' || pathname.startsWith('/links')
  const partnerProgramActive = pathname.startsWith('/program')

  return (
    <div
      className="h-full w-[var(--sidebar-width)] grid grid-cols-[var(--sidebar-groups-width)_1fr] bg-bg-emphasis transition-[width] duration-300"
      style={SIDEBAR_STYLE}
    >
      <nav className="flex size-full flex-col items-center justify-between p-2">
        <div className="flex flex-col items-center gap-3">
          <div className="pb-1 pt-2" />
          <Button variant="sidebarIcon" size="iconSidebar" aria-label="Workspace">
            <Avatar size="xs">
              <AvatarFallback />
            </Avatar>
          </Button>
          <Button
            asChild
            variant="sidebarIcon"
            size="iconSidebar"
            data-active={shortLinksActive}
          >
            <Link to="/" aria-label="Short Links">
              <Compass className="size-5 text-content-default" />
            </Link>
          </Button>
          <Button
            asChild
            variant="sidebarIcon"
            size="iconSidebar"
            data-active={partnerProgramActive}
          >
            <Link to="/" aria-label="Partner Program">
              <Network className="size-5 text-content-default" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ThemeToggle />
          <Button variant="sidebarIcon" size="iconSidebar" aria-label="User menu">
            <Avatar size="xs">
              <AvatarFallback />
            </Avatar>
          </Button>
        </div>
      </nav>
      <div className="size-full overflow-hidden py-2 pr-2">
        <div className="scrollbar-hide relative flex h-full w-[calc(var(--sidebar-areas-width)-0.5rem)] flex-col overflow-y-auto overflow-x-hidden rounded-xl bg-bg-subtle">
          <div className="relative flex grow flex-col p-3 text-content-muted" />
        </div>
      </div>
    </div>
  )
}
