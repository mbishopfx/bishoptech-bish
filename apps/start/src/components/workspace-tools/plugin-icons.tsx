import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Boxes,
  BookOpenText,
  KanbanSquare,
  Megaphone,
  MessagesSquare,
  PackageOpen,
  Ticket,
} from 'lucide-react'
import type { Arch3rPluginKey } from '@/lib/shared/workspace-tools'

export const WORKSPACE_PLUGIN_ICONS: Record<Arch3rPluginKey, LucideIcon> = {
  marketplace: PackageOpen,
  projects: KanbanSquare,
  ticket_triage: Ticket,
  playbooks: BookOpenText,
  social_publishing: Megaphone,
  voice_campaigns: Bot,
  sms_campaigns: MessagesSquare,
}

export const WORKSPACE_DEFAULT_DASHBOARD_ICON = Boxes
