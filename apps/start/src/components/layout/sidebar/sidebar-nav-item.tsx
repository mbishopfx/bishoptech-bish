import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { cn } from '@rift/utils'
import { Button } from '@rift/ui/button'
import { isPathActive } from '@/utils/nav-utils'
import type { NavItemType } from './app-sidebar-nav.config'

export function SidebarNavItem({
  item,
  pathname,
}: {
  item: NavItemType
  pathname: string
}) {
  const [hovered, setHovered] = useState(false)
  const { name, href, icon: Icon, exact, isActive: customIsActive, trailing } =
    item

  const isActive = useMemo(
    () =>
      customIsActive
        ? customIsActive(pathname, href)
        : isPathActive(pathname, href, exact),
    [pathname, href, exact, customIsActive],
  )

  return (
    <Button
      asChild
      variant="sidebarNavItem"
      size="sidebarNavItem"
    >
      <Link
        to={href}
        data-active={isActive}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className="group"
      >
        <span className="flex w-full items-center gap-2.5">
          {Icon ? (
            <Icon
              className={cn('size-4', isActive ? 'text-content-info' : '')}
              data-hovered={hovered}
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate">{name}</span>
          {trailing}
        </span>
      </Link>
    </Button>
  )
}
