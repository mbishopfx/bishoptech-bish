'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@bish/ui/avatar'
import { Button } from '@bish/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@bish/ui/dropdown-menu'
import { Link, useNavigate } from '@tanstack/react-router'
import { SETTINGS_HREF } from '@/routes/(app)/_layout/settings/-settings-nav'
import { m } from '@/paraglide/messages.js'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { LogOutIcon, Settings2Icon } from 'lucide-react'

export type UserProfileAvatarUser = {
  image?: string | null
  name?: string | null
  email?: string | null
}

function getInitials(user: UserProfileAvatarUser): string {
  const normalizedName = user.name?.trim() ?? ''
  if (normalizedName.length > 0) {
    const parts = normalizedName.split(/\s+/).filter(Boolean)
    const first = parts[0]?.slice(0, 1) ?? ''
    const last = (parts.length > 1 ? parts[parts.length - 1] : '')?.slice(0, 1) ?? ''
    return (first + last).toUpperCase() || '?'
  }
  const email = user.email ?? ''
  const part = email.split('@')[0]
  return part.slice(0, 2).toUpperCase() || '?'
}

export type UserProfileAvatarProps = {
  user?: UserProfileAvatarUser | null
  isLoading?: boolean
  isAnonymous?: boolean
  settingsHref?: string
  size?: 'default' | 'sm' | 'lg' | 'xs'
}

export function UserProfileAvatar({
  user,
  isLoading = false,
  isAnonymous = false,
  settingsHref = SETTINGS_HREF,
  size = 'xs',
}: UserProfileAvatarProps) {
  const navigate = useNavigate()
  const { signOut } = useAppAuth()
  const initials = user && !isAnonymous ? getInitials(user) : '?'
  const fallbackSeed = isAnonymous ? 'sidebar-anonymous-user' : undefined
  const showFallback = !isLoading && !user?.image
  const displayName = user?.name?.trim() || user?.email?.trim() || 'Account'

  async function handleSignOut() {
    /**
     * Explicit navigation keeps the UX deterministic in self-hosted mode and
     * prevents stale sessions from leaving users inside the app shell after the
     * auth cookie is cleared.
     */
    await signOut()
    await navigate({ to: '/auth/sign-in' })
  }

  if (isAnonymous) {
    return (
      <Button
        asChild
        variant="sidebarIcon"
        size="iconSidebar"
        aria-label={m.layout_open_settings_aria_label()}
      >
        <Link to={settingsHref} preload="intent">
          <Avatar size={size}>
            {showFallback ? (
              <AvatarFallback seed={fallbackSeed}>{initials}</AvatarFallback>
            ) : null}
          </Avatar>
        </Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="sidebarIcon"
            size="iconSidebar"
            aria-label={m.layout_open_settings_aria_label()}
          />
        }
      >
        <Avatar size={size}>
          {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
          {showFallback ? (
            <AvatarFallback seed={fallbackSeed}>{initials}</AvatarFallback>
          ) : null}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={10}
        className="min-w-52"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground-primary">
            {displayName}
          </span>
          {user?.email ? (
            <span className="truncate text-xs text-foreground-secondary">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link to={settingsHref} preload="intent" />}
        >
          <Settings2Icon className="size-4" />
          {m.layout_open_settings_aria_label()}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void handleSignOut()
          }}
          variant="destructive"
        >
          <LogOutIcon className="size-4" />
          {m.settings_account_logout_button()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
