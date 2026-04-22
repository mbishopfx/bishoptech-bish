import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal'

import { cn } from '@bish/utils'
import { Button, buttonVariants } from '@bish/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@bish/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@bish/ui/dropdown-menu'
import { isPathActive } from '@/utils/nav-utils'
import type { NavItemType } from './app-sidebar-nav.config'

export function SidebarNavItem({
  item,
  pathname,
  contextMenuResetToken = 0,
}: {
  item: NavItemType
  pathname: string
  contextMenuResetToken?: number
}) {
  const [hovered, setHovered] = useState(false)
  const {
    name,
    href,
    icon: Icon,
    exact,
    isActive: customIsActive,
    onSelect,
    trailing,
    contextMenuContent,
    actionMenuContent,
    label: customLabel,
    disableLink,
  } = item

  const isActionItem = typeof onSelect === 'function'
  const isActive = useMemo(
    () =>
      isActionItem || !href
        ? false
        : customIsActive
        ? customIsActive(pathname, href)
        : isPathActive(pathname, href, exact),
    [pathname, href, exact, customIsActive, isActionItem],
  )

  const labelContent = customLabel ?? (
    <span className="min-w-0 flex-1 truncate">{name}</span>
  )
  const rowContent = (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {Icon ? (
        <Icon
          className={cn('size-4', isActive ? 'text-foreground-info' : '')}
          data-hovered={hovered}
        />
      ) : null}
      {labelContent}
      {trailing ? (
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {trailing}
        </span>
      ) : null}
    </span>
  )

  const linkContent = disableLink ? (
    <div
      className={cn(
        buttonVariants({ variant: 'sidebarNavItem', size: 'sidebarNavItem' }),
        'group bg-surface-inverse/5',
      )}
      role="presentation"
    >
      <span
        className="flex w-full items-center gap-2"
        data-active={isActive}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {rowContent}
      </span>
    </div>
  ) : isActionItem ? (
    <Button asChild variant="sidebarNavItem" size="sidebarNavItem">
      <a
        href={href ?? '#'}
        data-active={isActive}
        onClick={(event) => {
          event.preventDefault()
          onSelect?.()
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className="group"
      >
        {rowContent}
      </a>
    </Button>
  ) : (
    <Button asChild variant="sidebarNavItem" size="sidebarNavItem">
      <Link
        to={href}
        /**
         * Warm route code/data when intent is detected (hover/focus/touch),
         * reducing commit latency for frequent sidebar hops.
         */
        preload="intent"
        data-active={isActive}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className="group"
      >
        {rowContent}
      </Link>
    </Button>
  )

  const inlineActionMenu =
    actionMenuContent && !disableLink ? (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="iconSmall"
              className={cn(
                'h-7 w-7 rounded-md border border-transparent text-foreground-secondary hover:border-border-base hover:bg-surface-inverse/5 hover:text-foreground-primary',
                isActive ? 'text-foreground-info' : '',
              )}
              aria-label={`${name} actions`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="min-w-40">
          {actionMenuContent}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  const itemContent = actionMenuContent ? (
    <div className="group/sidebar-nav-item flex min-w-0 items-center gap-1">
      {contextMenuContent ? (
        <ContextMenuTrigger className="block min-w-0 flex-1">
          {linkContent}
        </ContextMenuTrigger>
      ) : (
        <div className="min-w-0 flex-1">{linkContent}</div>
      )}
      {inlineActionMenu}
    </div>
  ) : contextMenuContent ? (
    <ContextMenuTrigger className="block w-full">
      {linkContent}
    </ContextMenuTrigger>
  ) : (
    linkContent
  )

  if (!contextMenuContent) {
    return itemContent
  }

  return (
    <ContextMenu key={contextMenuResetToken}>
      {itemContent}
      <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
    </ContextMenu>
  )
}
