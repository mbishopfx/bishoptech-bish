import { CHAT_AREA_KEY, chatNavArea, isChatPath } from '@/components/chat'
import { WORKSPACE_PLUGIN_ICONS } from '@/components/workspace-tools/plugin-icons'
import {
  isOrgSettingsPath,
  orgSettingsNavArea,
  ORG_SETTINGS_AREA_KEY,
  ORG_SETTINGS_HREF,
} from '@/routes/(app)/_layout/organization/settings/-organization-settings-nav'
import {
  isOperatorPath,
  operatorNavArea,
  OPERATOR_AREA_KEY,
} from '@/routes/(app)/_layout/operator/-operator-nav'
import {
  huddleNavArea,
  HUDDLE_AREA_KEY,
  isHuddlePath,
} from '@/routes/(app)/_layout/huddle/-huddle-nav'
import {
  isSettingsPath,
  settingsNavArea,
  SETTINGS_AREA_KEY,
} from '@/routes/(app)/_layout/settings/-settings-nav'
import { isAreaPath } from '@/utils/nav-utils'
import type { ComponentType, SVGProps } from 'react'

export type SidebarNavData = {
  pathname: string
}

export type NavItemType = {
  name: string
  /** Route target for link items. Optional for action-only items that use onSelect. */
  href?: string
  icon?: ComponentType<SVGProps<SVGSVGElement> & { 'data-hovered'?: boolean }>
  exact?: boolean
  isActive?: (pathname: string, href: string) => boolean
  /** Click handler for action-only items rendered with sidebar nav styling. */
  onSelect?: () => void
  /** Optional trailing element (e.g. status indicator) shown after the label */
  trailing?: React.ReactNode
  /** Optional context-menu content shown on right-click for this nav item. */
  contextMenuContent?: React.ReactNode
  /** When set, rendered instead of name (e.g. inline edit input). Implies no navigation. */
  label?: React.ReactNode
  /** When true, item is not a link (e.g. while editing). */
  disableLink?: boolean
}

export type NavSection = {
  name?: string
  items: NavItemType[]
}

export type SidebarNavAreaConfig = {
  title?: string
  /** Static sections; required when no ContentComponent. Optional when ContentComponent is set (panel ignores it). */
  content?: NavSection[]
  href: string
  description?: string
  learnMoreHref?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  ContentComponent?: ComponentType<{ pathname: string }>
}

export type SidebarNavAreas = Record<
  string,
  (data: SidebarNavData) => SidebarNavAreaConfig
>

export const MARKETPLACE_AREA_KEY = 'marketplace' as const
export const PROJECTS_AREA_KEY = 'projects' as const
export const TICKETS_AREA_KEY = 'ticket-triage' as const
export const SOCIAL_AREA_KEY = 'social-publishing' as const
export const VOICE_AREA_KEY = 'voice-campaigns' as const
export const SMS_AREA_KEY = 'sms-campaigns' as const

export const MARKETPLACE_HREF = '/marketplace'
export const PROJECTS_HREF = '/projects'
export const TICKETS_HREF = '/tickets'
export const SOCIAL_HREF = '/social'
export const VOICE_HREF = '/voice'
export const SMS_HREF = '/sms'

export const isMarketplacePath = (pathname: string) =>
  isAreaPath(pathname, MARKETPLACE_HREF)
export const isProjectsPath = (pathname: string) =>
  isAreaPath(pathname, PROJECTS_HREF)
export const isTicketsPath = (pathname: string) =>
  isAreaPath(pathname, TICKETS_HREF)
export const isSocialPath = (pathname: string) =>
  isAreaPath(pathname, SOCIAL_HREF)
export const isVoicePath = (pathname: string) => isAreaPath(pathname, VOICE_HREF)
export const isSmsPath = (pathname: string) => isAreaPath(pathname, SMS_HREF)

function marketplaceNavArea(): SidebarNavAreaConfig {
  return {
    title: 'Marketplace',
    href: MARKETPLACE_HREF,
    description:
      'Activate workspace tools and inspect which lanes are ready, locked, or still missing integration setup.',
    icon: WORKSPACE_PLUGIN_ICONS.marketplace,
    content: [
      {
        items: [
          {
            name: 'Catalog',
            icon: WORKSPACE_PLUGIN_ICONS.marketplace,
            href: MARKETPLACE_HREF,
            exact: true,
          },
        ],
      },
    ],
  }
}

function projectsNavArea(): SidebarNavAreaConfig {
  return {
    title: 'Projects',
    href: PROJECTS_HREF,
    description:
      'Private collaboration boards for kanban work, files, notes, and project-scoped huddles.',
    icon: WORKSPACE_PLUGIN_ICONS.projects,
    content: [
      {
        items: [
          {
            name: 'Boards',
            icon: WORKSPACE_PLUGIN_ICONS.projects,
            href: PROJECTS_HREF,
            exact: true,
          },
        ],
      },
    ],
  }
}

function ticketsNavArea(): SidebarNavAreaConfig {
  return {
    title: 'Ticket Triage',
    href: TICKETS_HREF,
    description:
      'Internal intake queue for requests that can be approved into projects or denied with a clear decision.',
    icon: WORKSPACE_PLUGIN_ICONS.ticket_triage,
    content: [
      {
        items: [
          {
            name: 'Queue',
            icon: WORKSPACE_PLUGIN_ICONS.ticket_triage,
            href: TICKETS_HREF,
            exact: true,
          },
        ],
      },
    ],
  }
}

function socialNavArea(): SidebarNavAreaConfig {
  return {
    title: 'Social',
    href: SOCIAL_HREF,
    description:
      'Draft, schedule, and monitor outbound posts across the connected social destinations for this organization.',
    icon: WORKSPACE_PLUGIN_ICONS.social_publishing,
    content: [
      {
        items: [
          {
            name: 'Publisher',
            icon: WORKSPACE_PLUGIN_ICONS.social_publishing,
            href: SOCIAL_HREF,
            exact: true,
          },
          {
            name: 'Integrations',
            href: `${ORG_SETTINGS_HREF}/integrations`,
          },
        ],
      },
    ],
  }
}

function voiceNavArea(): SidebarNavAreaConfig {
  return {
    title: 'Voice',
    href: VOICE_HREF,
    description:
      'Run cloud voice campaigns with imported lead batches, transcript summaries, and export readiness checks.',
    icon: WORKSPACE_PLUGIN_ICONS.voice_campaigns,
    content: [
      {
        items: [
          {
            name: 'Campaigns',
            icon: WORKSPACE_PLUGIN_ICONS.voice_campaigns,
            href: VOICE_HREF,
            exact: true,
          },
          {
            name: 'Integrations',
            href: `${ORG_SETTINGS_HREF}/integrations`,
          },
        ],
      },
    ],
  }
}

function smsNavArea(): SidebarNavAreaConfig {
  return {
    title: 'SMS',
    href: SMS_HREF,
    description:
      'Manage Twilio-backed messaging batches with shared logs, delivery state, and campaign visibility.',
    icon: WORKSPACE_PLUGIN_ICONS.sms_campaigns,
    content: [
      {
        items: [
          {
            name: 'Campaigns',
            icon: WORKSPACE_PLUGIN_ICONS.sms_campaigns,
            href: SMS_HREF,
            exact: true,
          },
          {
            name: 'Integrations',
            href: `${ORG_SETTINGS_HREF}/integrations`,
          },
        ],
      },
    ],
  }
}

export const NAV_AREAS: SidebarNavAreas = {
  [OPERATOR_AREA_KEY]: operatorNavArea,
  [CHAT_AREA_KEY]: chatNavArea,
  [HUDDLE_AREA_KEY]: huddleNavArea,
  [MARKETPLACE_AREA_KEY]: marketplaceNavArea,
  [PROJECTS_AREA_KEY]: projectsNavArea,
  [TICKETS_AREA_KEY]: ticketsNavArea,
  [SOCIAL_AREA_KEY]: socialNavArea,
  [VOICE_AREA_KEY]: voiceNavArea,
  [SMS_AREA_KEY]: smsNavArea,
  [ORG_SETTINGS_AREA_KEY]: orgSettingsNavArea,
  [SETTINGS_AREA_KEY]: settingsNavArea,
}

export { CHAT_AREA_KEY }
export { HUDDLE_AREA_KEY }
export { SETTINGS_AREA_KEY }
export { OPERATOR_AREA_KEY }
export { ORG_SETTINGS_AREA_KEY }

/**
 * Resolve current area from pathname.
 */
export function getCurrentArea(pathname: string): string | null {
  if (isOperatorPath(pathname)) return OPERATOR_AREA_KEY
  if (isMarketplacePath(pathname)) return MARKETPLACE_AREA_KEY
  if (isProjectsPath(pathname)) return PROJECTS_AREA_KEY
  if (isTicketsPath(pathname)) return TICKETS_AREA_KEY
  if (isSocialPath(pathname)) return SOCIAL_AREA_KEY
  if (isVoicePath(pathname)) return VOICE_AREA_KEY
  if (isSmsPath(pathname)) return SMS_AREA_KEY
  if (isOrgSettingsPath(pathname)) return ORG_SETTINGS_AREA_KEY
  if (isSettingsPath(pathname)) return SETTINGS_AREA_KEY
  if (isChatPath(pathname)) return CHAT_AREA_KEY
  if (isHuddlePath(pathname)) return HUDDLE_AREA_KEY
  return null
}
