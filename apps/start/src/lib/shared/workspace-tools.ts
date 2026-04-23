import { z } from 'zod'

export const ARCH3R_PLUGIN_KEYS = [
  'marketplace',
  'projects',
  'ticket_triage',
  'social_publishing',
  'voice_campaigns',
  'sms_campaigns',
] as const

export type Arch3rPluginKey = (typeof ARCH3R_PLUGIN_KEYS)[number]

export type Arch3rPluginCategory = 'core' | 'campaigns' | 'system'
export type Arch3rPluginEntitlementMode = 'included' | 'addon'
export type Arch3rEntitlementStatus = 'entitled' | 'locked'
export type Arch3rPluginReadinessStatus =
  | 'ready'
  | 'needs_entitlement'
  | 'needs_configuration'
  | 'needs_linked_account'

export type Arch3rPluginDefinition = {
  readonly key: Arch3rPluginKey
  readonly name: string
  readonly description: string
  readonly category: Arch3rPluginCategory
  readonly entitlementMode: Arch3rPluginEntitlementMode
  readonly routeHref: string
  readonly navLabel: string
  readonly readinessKeys?: readonly Arch3rIntegrationProviderKey[]
}

/**
 * Plugin definitions stay in code so new features can ship globally without a
 * bootstrap migration for catalog rows. Organizations only persist activation
 * and entitlement state; the shared definition is the installed contract.
 */
export const ARCH3R_PLUGIN_DEFINITIONS: readonly Arch3rPluginDefinition[] = [
  {
    key: 'marketplace',
    name: 'Plugin Marketplace',
    description:
      'Browse available modules, readiness requirements, and activation status.',
    category: 'system',
    entitlementMode: 'included',
    routeHref: '/marketplace',
    navLabel: 'Marketplace',
  },
  {
    key: 'projects',
    name: 'Projects',
    description:
      'Private kanban workspaces with notes, links, uploads, and project huddles.',
    category: 'core',
    entitlementMode: 'included',
    routeHref: '/projects',
    navLabel: 'Projects',
  },
  {
    key: 'ticket_triage',
    name: 'Ticket Triage',
    description:
      'Internal request intake with approval decisions and promotion into projects.',
    category: 'core',
    entitlementMode: 'included',
    routeHref: '/tickets',
    navLabel: 'Tickets',
  },
  {
    key: 'social_publishing',
    name: 'Social Publishing',
    description:
      'Draft, schedule, and monitor outbound posts across X, Facebook, Instagram, and TikTok.',
    category: 'campaigns',
    entitlementMode: 'addon',
    routeHref: '/social',
    navLabel: 'Social',
    readinessKeys: ['social_x', 'social_facebook', 'social_instagram', 'social_tiktok'],
  },
  {
    key: 'voice_campaigns',
    name: 'Voice Campaigns',
    description:
      'Cloud-run calling campaigns with Vapi-backed assistant templates, transcripts, and summaries.',
    category: 'campaigns',
    entitlementMode: 'addon',
    routeHref: '/voice',
    navLabel: 'Voice',
    readinessKeys: ['vapi', 'google_workspace_export'],
  },
  {
    key: 'sms_campaigns',
    name: 'SMS Campaigns',
    description:
      'Twilio-driven campaign sends with list selection, delivery logging, and reply capture foundations.',
    category: 'campaigns',
    entitlementMode: 'addon',
    routeHref: '/sms',
    navLabel: 'SMS',
    readinessKeys: ['twilio', 'google_workspace_export'],
  },
] as const

export function getArch3rPluginDefinition(key: Arch3rPluginKey) {
  const definition = ARCH3R_PLUGIN_DEFINITIONS.find(
    (candidate) => candidate.key === key,
  )
  if (!definition) {
    throw new Error(`Unknown plugin key: ${key}`)
  }
  return definition
}

export const ARCH3R_INTEGRATION_PROVIDER_KEYS = [
  'social_x',
  'social_facebook',
  'social_instagram',
  'social_tiktok',
  'vapi',
  'twilio',
  'google_workspace_export',
] as const

export type Arch3rIntegrationProviderKey =
  (typeof ARCH3R_INTEGRATION_PROVIDER_KEYS)[number]

export type Arch3rIntegrationAuthMode = 'platform_default' | 'organization_override'
export type Arch3rIntegrationStatus =
  | 'ready'
  | 'needs_configuration'
  | 'needs_linked_account'
  | 'disabled'

export type Arch3rVoiceProviderMode = 'managed' | 'bring_your_own'
export type Arch3rVoiceProvisioningStatus =
  | 'awaiting_provisioning'
  | 'provisioning'
  | 'ready'
  | 'sync_required'
  | 'errored'

export type Arch3rIntegrationDefinition = {
  readonly key: Arch3rIntegrationProviderKey
  readonly label: string
  readonly description: string
  readonly authMode: Arch3rIntegrationAuthMode
  readonly requiredEnv: readonly string[]
  readonly linkedAccountLabel?: string
}

export const ARCH3R_INTEGRATION_DEFINITIONS: readonly Arch3rIntegrationDefinition[] = [
  {
    key: 'social_x',
    label: 'X Publishing',
    description:
      'Use platform-managed social apps or an org-owned override to publish scheduled posts.',
    authMode: 'platform_default',
    requiredEnv: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
    linkedAccountLabel: 'Linked X account',
  },
  {
    key: 'social_facebook',
    label: 'Facebook Publishing',
    description:
      'Connect a Facebook page destination for outbound scheduling and publish logs.',
    authMode: 'platform_default',
    requiredEnv: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
    linkedAccountLabel: 'Linked Facebook page',
  },
  {
    key: 'social_instagram',
    label: 'Instagram Publishing',
    description:
      'Connect an Instagram destination for scheduled visual and caption publishing.',
    authMode: 'platform_default',
    requiredEnv: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'],
    linkedAccountLabel: 'Linked Instagram account',
  },
  {
    key: 'social_tiktok',
    label: 'TikTok Publishing',
    description:
      'Connect a TikTok destination for scheduled post delivery and status tracking.',
    authMode: 'platform_default',
    requiredEnv: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'],
    linkedAccountLabel: 'Linked TikTok account',
  },
  {
    key: 'vapi',
    label: 'Vapi Voice Runtime',
    description:
      'Run voice campaigns through the managed Vapi account by default, with a BYOK override for organizations that already have Vapi.',
    authMode: 'platform_default',
    requiredEnv: ['VAPI_API_KEY'],
  },
  {
    key: 'twilio',
    label: 'Twilio SMS Runtime',
    description:
      'Use customer-provided Twilio credentials for SMS campaign send and delivery logging.',
    authMode: 'organization_override',
    requiredEnv: [],
  },
  {
    key: 'google_workspace_export',
    label: 'Google Workspace Export',
    description:
      'Choose the shared export destination for campaign results, huddle notes, and project docs.',
    authMode: 'organization_override',
    requiredEnv: ['GOOGLE_PICKER_CLIENT_ID'],
    linkedAccountLabel: 'Shared export destination',
  },
] as const

export function getArch3rIntegrationDefinition(
  key: Arch3rIntegrationProviderKey,
) {
  const definition = ARCH3R_INTEGRATION_DEFINITIONS.find(
    (candidate) => candidate.key === key,
  )
  if (!definition) {
    throw new Error(`Unknown integration key: ${key}`)
  }
  return definition
}

export type Arch3rPluginStateSummary = {
  readonly pluginKey: Arch3rPluginKey
  readonly activationStatus: 'active' | 'inactive'
  readonly entitlementStatus: Arch3rEntitlementStatus
  readonly readinessStatus: Arch3rPluginReadinessStatus
  readonly navVisible: boolean
  readonly activatedAt: number | null
}

export type Arch3rIntegrationSummary = {
  readonly providerKey: Arch3rIntegrationProviderKey
  readonly label: string
  readonly description: string
  readonly authMode: Arch3rIntegrationAuthMode
  readonly status: Arch3rIntegrationStatus
  readonly requiredEnv: readonly string[]
  readonly missingEnv: readonly string[]
  readonly hasCredential: boolean
  readonly hasLinkedAccount: boolean
  readonly linkedAccountLabel: string | null
  readonly linkedAccountName: string | null
  readonly usingPlatformDefault: boolean
  readonly updatedAt: number | null
}

export type Arch3rWorkspaceDashboardSnapshot = {
  readonly organizationId: string
  readonly stats: {
    readonly totalMembers: number
    readonly activeChats: number
    readonly sharedChats: number
    readonly activeProjects: number
    readonly openTickets: number
    readonly activeHuddles: number
    readonly activePlugins: number
  }
  readonly plugins: readonly Arch3rPluginStateSummary[]
  readonly recentProjects: ReadonlyArray<{
    readonly id: string
    readonly title: string
    readonly status: string
    readonly memberCount: number
    readonly updatedAt: number
  }>
  readonly recentTickets: ReadonlyArray<{
    readonly id: string
    readonly title: string
    readonly status: string
    readonly severity: string
    readonly updatedAt: number
  }>
  readonly recentCampaigns: ReadonlyArray<{
    readonly id: string
    readonly kind: 'social' | 'voice' | 'sms'
    readonly title: string
    readonly status: string
    readonly updatedAt: number
  }>
}

export const upsertPluginActivationInput = z.object({
  pluginKey: z.enum(ARCH3R_PLUGIN_KEYS),
  activationStatus: z.enum(['active', 'inactive']),
})

export const upsertIntegrationConfigInput = z.object({
  providerKey: z.enum(ARCH3R_INTEGRATION_PROVIDER_KEYS),
  credentialLabel: z.string().trim().min(2).max(80).optional(),
  authMode: z.enum(['platform_default', 'organization_override']),
  config: z.record(z.string(), z.string().trim().max(4000)),
  linkedAccountName: z.string().trim().max(160).optional(),
  linkedAccountExternalId: z.string().trim().max(160).optional(),
})

export const createProjectInput = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  memberUserIds: z.array(z.string().trim().min(1)).max(50).default([]),
})

export const upsertProjectNoteInput = z.object({
  projectId: z.string().trim().min(1),
  noteId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(140),
  content: z.string().trim().min(1).max(6000),
})

export const createProjectArtifactInput = z.object({
  projectId: z.string().trim().min(1),
  kind: z.enum(['file', 'link']),
  label: z.string().trim().min(1).max(160),
  url: z.string().trim().url().max(2000),
  storageKey: z.string().trim().max(800).optional(),
  contentType: z.string().trim().max(160).optional(),
})

export const createProjectCardInput = z.object({
  projectId: z.string().trim().min(1),
  columnId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  assigneeUserId: z.string().trim().min(1).optional(),
})

export const updateProjectMembersInput = z.object({
  projectId: z.string().trim().min(1),
  memberUserIds: z.array(z.string().trim().min(1)).max(50),
})

export const createTicketInput = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(6000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  memberUserIds: z.array(z.string().trim().min(1)).max(50).default([]),
})

export const decideTicketInput = z.object({
  ticketId: z.string().trim().min(1),
  decision: z.enum(['approved', 'denied']),
  decisionNote: z.string().trim().max(2000).optional(),
  projectTitle: z.string().trim().max(160).optional(),
})

export const upsertSocialPostInput = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(2).max(5000),
  channels: z
    .array(
      z.enum([
        'social_x',
        'social_facebook',
        'social_instagram',
        'social_tiktok',
      ]),
    )
    .min(1)
    .max(4),
  scheduledFor: z.number().int().positive().optional(),
})

export const createVoiceCampaignInput = z.object({
  campaignName: z.string().trim().min(2).max(160),
  csvFileName: z.string().trim().min(1).max(240),
  csvContent: z.string().min(1),
  selectedRowIndexes: z.array(z.number().int().min(0)).max(10_000).optional(),
})

export const createSmsCampaignInput = z.object({
  campaignName: z.string().trim().min(2).max(160),
  csvFileName: z.string().trim().min(1).max(240),
  csvContent: z.string().min(1),
  messageTemplate: z.string().trim().min(2).max(1000),
  selectedRowIndexes: z.array(z.number().int().min(0)).max(10_000).optional(),
})

export type UpsertPluginActivationInput = z.infer<
  typeof upsertPluginActivationInput
>
export type UpsertIntegrationConfigInput = z.infer<
  typeof upsertIntegrationConfigInput
>
export type CreateProjectInput = z.infer<typeof createProjectInput>
export type UpsertProjectNoteInput = z.infer<typeof upsertProjectNoteInput>
export type CreateProjectArtifactInput = z.infer<
  typeof createProjectArtifactInput
>
export type CreateProjectCardInput = z.infer<typeof createProjectCardInput>
export type UpdateProjectMembersInput = z.infer<
  typeof updateProjectMembersInput
>
export type CreateTicketInput = z.infer<typeof createTicketInput>
export type DecideTicketInput = z.infer<typeof decideTicketInput>
export type UpsertSocialPostInput = z.infer<typeof upsertSocialPostInput>
export type CreateVoiceCampaignInput = z.infer<typeof createVoiceCampaignInput>
export type CreateSmsCampaignInput = z.infer<typeof createSmsCampaignInput>
