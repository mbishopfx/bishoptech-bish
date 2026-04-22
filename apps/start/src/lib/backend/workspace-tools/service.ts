import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import { encryptBishSecretJson } from '@/lib/backend/bish/connector-secrets'
import { coerceWorkspacePlanId } from '@/lib/shared/access-control'
import { DEFAULT_ARCH3R_VOICE_ASSISTANT_TEMPLATE } from './voice-assistant-templates'
import {
  ARCH3R_INTEGRATION_DEFINITIONS,
  ARCH3R_PLUGIN_DEFINITIONS,
  getArch3rIntegrationDefinition,
  getArch3rPluginDefinition,
  type Arch3rEntitlementStatus,
  type Arch3rIntegrationProviderKey,
  type Arch3rIntegrationSummary,
  type Arch3rPluginKey,
  type Arch3rPluginReadinessStatus,
  type Arch3rPluginStateSummary,
  type Arch3rVoiceProviderMode,
  type Arch3rWorkspaceDashboardSnapshot,
  type CreateProjectCardInput,
  type CreateProjectArtifactInput,
  type CreateProjectInput,
  type CreateSmsCampaignInput,
  type CreateTicketInput,
  type CreateVoiceCampaignInput,
  type DecideTicketInput,
  type UpsertIntegrationConfigInput,
  type UpsertPluginActivationInput,
  type UpsertProjectNoteInput,
  type UpsertSocialPostInput,
  type UpdateProjectMembersInput,
} from '@/lib/shared/workspace-tools'

type OrgPluginInstallationRow = {
  id: string
  plugin_key: Arch3rPluginKey
  activation_status: 'active' | 'inactive'
  nav_visible: boolean
  activated_at: string | number | null
}

type OrgPluginEntitlementRow = {
  id: string
  plugin_key: Arch3rPluginKey
  entitlement_status: Arch3rEntitlementStatus
  entitlement_source: string
}

type OrgIntegrationCredentialRow = {
  id: string
  provider_key: Arch3rIntegrationProviderKey
  auth_mode: 'platform_default' | 'organization_override'
  status: string
  credential_label: string | null
  linked_account_name: string | null
  linked_account_external_id: string | null
  encrypted_config: Record<string, unknown> | null
  updated_at: string | number
}

type OrgMemberDirectoryRow = {
  member_id: string
  user_id: string
  role: string
  status: string | null
  user_name: string | null
  user_email: string | null
  user_image: string | null
}

type OrgVoiceAssistantInstanceRow = {
  id: string
  assistant_template_key: string
  provider_mode: Arch3rVoiceProviderMode
  external_assistant_id: string | null
  phone_number: string | null
  caller_id: string | null
  provisioning_status: string
  last_synced_at: string | number | null
  updated_at: string | number
}

function now() {
  return Date.now()
}

function toNumber(value: string | number | null | undefined) {
  if (value == null) return 0
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: string | number | null | undefined) {
  if (value == null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveMissingEnv(requiredEnv: readonly string[]) {
  return requiredEnv.filter((name) => !process.env[name]?.trim())
}

function parseCsvRows(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.')
  }

  const headers = lines[0]!.split(',').map((cell) => cell.trim())
  return lines.slice(1).map((line, rowIndex) => {
    const values = line.split(',').map((cell) => cell.trim())
    const payload: Record<string, string> = {}
    headers.forEach((header, columnIndex) => {
      payload[header] = values[columnIndex] ?? ''
    })
    return { rowIndex, payload }
  })
}

function resolveVoiceProviderMode(
  integrationRow: OrgIntegrationCredentialRow | null,
): Arch3rVoiceProviderMode {
  return integrationRow?.auth_mode === 'organization_override'
    ? 'bring_your_own'
    : 'managed'
}

async function readOrganizationPlanId(organizationId: string) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<{ plan_id: string | null }>(
    `select plan_id from org_subscription where organization_id = $1 order by created_at desc limit 1`,
    [organizationId],
  )
  return coerceWorkspacePlanId(result.rows[0]?.plan_id)
}

async function readPluginRows(organizationId: string) {
  const pool = requireZeroUpstreamPool()
  const [installations, entitlements] = await Promise.all([
    pool.query<OrgPluginInstallationRow>(
      `select id, plugin_key, activation_status, nav_visible, activated_at
       from org_plugin_installations
       where organization_id = $1`,
      [organizationId],
    ),
    pool.query<OrgPluginEntitlementRow>(
      `select id, plugin_key, entitlement_status, entitlement_source
       from org_plugin_entitlements
       where organization_id = $1`,
      [organizationId],
    ),
  ])

  return {
    installations: installations.rows,
    entitlements: entitlements.rows,
  }
}

async function readIntegrationRows(organizationId: string) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<OrgIntegrationCredentialRow>(
    `select id,
            provider_key,
            auth_mode,
            status,
            credential_label,
            linked_account_name,
            linked_account_external_id,
            encrypted_config,
            updated_at
       from org_integration_credentials
      where organization_id = $1`,
    [organizationId],
  )

  return result.rows
}

function resolveIntegrationSummary(
  row: OrgIntegrationCredentialRow | null,
): Arch3rIntegrationSummary[] {
  return ARCH3R_INTEGRATION_DEFINITIONS.map((definition) => {
    const current =
      definition.key === row?.provider_key
        ? row
        : null
    const missingEnv = resolveMissingEnv(definition.requiredEnv)
    const hasCredential = Boolean(current?.encrypted_config)
    const hasLinkedAccount = Boolean(
      current?.linked_account_name || current?.linked_account_external_id,
    )
    const usingPlatformDefault =
      (current?.auth_mode ?? definition.authMode) === 'platform_default'
    const missingRuntimeEnv = usingPlatformDefault
      ? resolveMissingEnv(definition.requiredEnv)
      : []

    let status: Arch3rIntegrationSummary['status']
    if (missingRuntimeEnv.length > 0) {
      status = 'needs_configuration'
    } else if (definition.authMode === 'organization_override' && !hasCredential) {
      status = 'needs_configuration'
    } else if (definition.linkedAccountLabel && !hasLinkedAccount) {
      status = 'needs_linked_account'
    } else if (
      definition.authMode === 'platform_default' &&
      !hasCredential &&
      !usingPlatformDefault
    ) {
      status = 'needs_configuration'
    } else {
      status = current?.status === 'disabled' ? 'disabled' : 'ready'
    }

    return {
      providerKey: definition.key,
      label: definition.label,
      description: definition.description,
      authMode: current?.auth_mode ?? definition.authMode,
      status,
      requiredEnv: definition.requiredEnv,
      missingEnv: missingRuntimeEnv,
      hasCredential,
      hasLinkedAccount,
      linkedAccountLabel: definition.linkedAccountLabel ?? null,
      linkedAccountName: current?.linked_account_name ?? null,
      usingPlatformDefault,
      updatedAt: toNullableNumber(current?.updated_at),
    }
  })
}

function buildPluginStateSummaries(input: {
  planId: string
  installations: readonly OrgPluginInstallationRow[]
  entitlements: readonly OrgPluginEntitlementRow[]
  integrations: readonly Arch3rIntegrationSummary[]
}): Arch3rPluginStateSummary[] {
  return ARCH3R_PLUGIN_DEFINITIONS.map((definition) => {
    const installation =
      input.installations.find(
        (candidate) => candidate.plugin_key === definition.key,
      ) ?? null
    const entitlement =
      input.entitlements.find(
        (candidate) => candidate.plugin_key === definition.key,
      ) ?? null

    const entitlementStatus: Arch3rEntitlementStatus =
      definition.entitlementMode === 'included' ||
      input.planId === 'enterprise' ||
      entitlement?.entitlement_status === 'entitled'
        ? 'entitled'
        : 'locked'

    const readinessKeys = definition.readinessKeys ?? []
    const readinessRows = input.integrations.filter((integration) =>
      readinessKeys.includes(integration.providerKey),
    )

    const readinessStatus: Arch3rPluginReadinessStatus =
      entitlementStatus !== 'entitled'
        ? 'needs_entitlement'
        : readinessRows.some((row) => row.status === 'needs_configuration')
          ? 'needs_configuration'
          : readinessRows.some((row) => row.status === 'needs_linked_account')
            ? 'needs_linked_account'
            : 'ready'

    return {
      pluginKey: definition.key,
      activationStatus: installation?.activation_status ?? 'inactive',
      entitlementStatus,
      readinessStatus,
      navVisible:
        Boolean(installation?.nav_visible) &&
        (definition.key === 'marketplace' || readinessStatus !== 'needs_entitlement'),
      activatedAt: toNullableNumber(installation?.activated_at),
    }
  })
}

async function requireProjectOwner(input: {
  organizationId: string
  userId: string
  projectId: string
}) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<{ id: string }>(
    `select pm.id
       from project_member pm
      where pm.project_id = $1
        and pm.organization_id = $2
        and pm.user_id = $3
        and pm.access_role = 'owner'
      limit 1`,
    [input.projectId, input.organizationId, input.userId],
  )

  if (!result.rows[0]) {
    throw new Error('Only project owners can update this project.')
  }
}

async function requireTicketApprover(input: {
  organizationId: string
  userId: string
}) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<{ id: string }>(
    `select id from member
      where "organizationId" = $1
        and "userId" = $2
        and role in ('owner', 'admin')
      limit 1`,
    [input.organizationId, input.userId],
  )
  if (!result.rows[0]) {
    throw new Error('Only organization admins can approve or deny tickets.')
  }
}

export async function getWorkspaceToolingSnapshot(input: {
  organizationId: string
}) {
  const planId = await readOrganizationPlanId(input.organizationId)
  const [pluginRows, integrationRows] = await Promise.all([
    readPluginRows(input.organizationId),
    readIntegrationRows(input.organizationId),
  ])
  const integrationSummaries = resolveIntegrationSummary(null).map((summary) => {
    const matching =
      integrationRows.find((row) => row.provider_key === summary.providerKey) ?? null
    return resolveIntegrationSummary(matching).find(
      (candidate) => candidate.providerKey === summary.providerKey,
    )!
  })

  const pluginStates = buildPluginStateSummaries({
    planId,
    installations: pluginRows.installations,
    entitlements: pluginRows.entitlements,
    integrations: integrationSummaries,
  })

  return {
    planId,
    plugins: ARCH3R_PLUGIN_DEFINITIONS.map((definition) => ({
      definition,
      state: pluginStates.find(
        (candidate) => candidate.pluginKey === definition.key,
      )!,
    })),
    integrations: integrationSummaries,
  }
}

export async function getWorkspaceDashboardSnapshot(input: {
  organizationId: string
}): Promise<Arch3rWorkspaceDashboardSnapshot> {
  const pool = requireZeroUpstreamPool()
  const tooling = await getWorkspaceToolingSnapshot(input)
  const [
    memberCountResult,
    threadStatsResult,
    projectStatsResult,
    ticketStatsResult,
    huddleCountResult,
    recentProjectsResult,
    recentTicketsResult,
    recentCampaignsResult,
  ] = await Promise.all([
    pool.query<{ count: string }>(
      `select count(*)::text as count from member where "organizationId" = $1`,
      [input.organizationId],
    ),
    pool.query<{ active_chats: string; shared_chats: string }>(
      `select
         count(*)::text as active_chats,
         count(*) filter (where shared_at is not null)::text as shared_chats
       from threads
       where owner_org_id = $1
         and visibility = 'visible'`,
      [input.organizationId],
    ),
    pool.query<{ active_projects: string }>(
      `select count(*)::text as active_projects
         from project
        where organization_id = $1
          and status <> 'archived'`,
      [input.organizationId],
    ),
    pool.query<{ open_tickets: string }>(
      `select count(*)::text as open_tickets
         from ticket
        where organization_id = $1
          and status in ('submitted', 'approved', 'in_project')`,
      [input.organizationId],
    ),
    pool.query<{ active_huddles: string }>(
      `select count(*)::text as active_huddles
         from huddle_room
        where organization_id = $1
          and status = 'active'`,
      [input.organizationId],
    ),
    pool.query<{
      id: string
      title: string
      status: string
      updated_at: string | number
      member_count: string
    }>(
      `select p.id,
              p.title,
              p.status,
              p.updated_at,
              count(pm.id)::text as member_count
         from project p
         left join project_member pm on pm.project_id = p.id
        where p.organization_id = $1
        group by p.id
        order by p.updated_at desc
        limit 6`,
      [input.organizationId],
    ),
    pool.query<{
      id: string
      title: string
      status: string
      severity: string
      updated_at: string | number
    }>(
      `select id, title, status, severity, updated_at
         from ticket
        where organization_id = $1
        order by updated_at desc
        limit 6`,
      [input.organizationId],
    ),
    pool.query<{
      id: string
      kind: 'social' | 'voice' | 'sms'
      title: string
      status: string
      updated_at: string | number
    }>(
      `select id, 'social'::text as kind, title, status, updated_at from social_post where organization_id = $1
       union all
       select id, 'voice'::text as kind, title, status, updated_at from voice_campaign where organization_id = $1
       union all
       select id, 'sms'::text as kind, title, status, updated_at from sms_campaign where organization_id = $1
       order by updated_at desc
       limit 8`,
      [input.organizationId],
    ),
  ])

  return {
    organizationId: input.organizationId,
    stats: {
      totalMembers: toNumber(memberCountResult.rows[0]?.count),
      activeChats: toNumber(threadStatsResult.rows[0]?.active_chats),
      sharedChats: toNumber(threadStatsResult.rows[0]?.shared_chats),
      activeProjects: toNumber(projectStatsResult.rows[0]?.active_projects),
      openTickets: toNumber(ticketStatsResult.rows[0]?.open_tickets),
      activeHuddles: toNumber(huddleCountResult.rows[0]?.active_huddles),
      activePlugins: tooling.plugins.filter(
        (plugin) => plugin.state.activationStatus === 'active',
      ).length,
    },
    plugins: tooling.plugins.map((plugin) => plugin.state),
    recentProjects: recentProjectsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      memberCount: toNumber(row.member_count),
      updatedAt: toNumber(row.updated_at),
    })),
    recentTickets: recentTicketsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      severity: row.severity,
      updatedAt: toNumber(row.updated_at),
    })),
    recentCampaigns: recentCampaignsResult.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      status: row.status,
      updatedAt: toNumber(row.updated_at),
    })),
  }
}

export async function listProjectsForWorkspace(input: {
  organizationId: string
  userId: string
}) {
  const pool = requireZeroUpstreamPool()
  const [
    projectsResult,
    membersResult,
    columnsResult,
    cardsResult,
    notesResult,
    artifactsResult,
  ] =
    await Promise.all([
      pool.query<{
        id: string
        title: string
        description: string | null
        status: string
        created_by_user_id: string
        linked_ticket_id: string | null
        active_huddle_room_id: string | null
        updated_at: string | number
      }>(
        `select p.id,
                p.title,
                p.description,
                p.status,
                p.created_by_user_id,
                p.linked_ticket_id,
                p.active_huddle_room_id,
                p.updated_at
           from project p
           join project_member scope_member
             on scope_member.project_id = p.id
            and scope_member.user_id = $2
          where p.organization_id = $1
          order by p.updated_at desc`,
        [input.organizationId, input.userId],
      ),
      pool.query<{
        project_id: string
        user_id: string
        access_role: string
      }>(
        `select project_id, user_id, access_role
           from project_member
          where organization_id = $1`,
        [input.organizationId],
      ),
      pool.query<{
        id: string
        project_id: string
        title: string
        position: string | number
      }>(
        `select id, project_id, title, position
           from project_column
          where organization_id = $1
          order by project_id asc, position asc`,
        [input.organizationId],
      ),
      pool.query<{
        id: string
        project_id: string
        column_id: string
        title: string
        description: string | null
        position: string | number
        assignee_user_id: string | null
        ticket_id: string | null
      }>(
        `select id, project_id, column_id, title, description, position, assignee_user_id, ticket_id
           from project_card
          where organization_id = $1
          order by project_id asc, position asc`,
        [input.organizationId],
      ),
      pool.query<{
        id: string
        project_id: string
        title: string
        content: string
        created_by_user_id: string
        updated_at: string | number
      }>(
        `select id, project_id, title, content, created_by_user_id, updated_at
           from project_note
          where organization_id = $1
          order by updated_at desc`,
        [input.organizationId],
      ),
      pool.query<{
        id: string
        project_id: string
        kind: string
        label: string
        url: string
        created_by_user_id: string
        updated_at: string | number
      }>(
        `select id, project_id, kind, label, url, created_by_user_id, updated_at
           from project_artifact
          where organization_id = $1
          order by updated_at desc`,
        [input.organizationId],
      ),
    ])

  const notesByProject = new Map<string, number>()
  for (const row of notesResult.rows) {
    notesByProject.set(row.project_id, (notesByProject.get(row.project_id) ?? 0) + 1)
  }
  const artifactsByProject = new Map<string, number>()
  for (const row of artifactsResult.rows) {
    artifactsByProject.set(
      row.project_id,
      (artifactsByProject.get(row.project_id) ?? 0) + 1,
    )
  }

  return projectsResult.rows.map((project) => {
    const memberRows = membersResult.rows.filter(
      (member) => member.project_id === project.id,
    )
    const projectColumns = columnsResult.rows
      .filter((column) => column.project_id === project.id)
      .map((column) => ({
        id: column.id,
        title: column.title,
        position: toNumber(column.position),
        cards: cardsResult.rows
          .filter((card) => card.column_id === column.id)
          .map((card) => ({
            id: card.id,
            title: card.title,
            description: card.description,
            position: toNumber(card.position),
            assigneeUserId: card.assignee_user_id,
            ticketId: card.ticket_id,
          })),
      }))
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      createdByUserId: project.created_by_user_id,
      linkedTicketId: project.linked_ticket_id,
      activeHuddleRoomId: project.active_huddle_room_id,
      updatedAt: toNumber(project.updated_at),
      members: memberRows.map((member) => ({
        userId: member.user_id,
        accessRole: member.access_role,
      })),
      columns: projectColumns,
      notes: notesResult.rows
        .filter((row) => row.project_id === project.id)
        .map((row) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          createdByUserId: row.created_by_user_id,
          updatedAt: toNumber(row.updated_at),
        })),
      artifacts: artifactsResult.rows
        .filter((row) => row.project_id === project.id)
        .map((row) => ({
          id: row.id,
          kind: row.kind,
          label: row.label,
          url: row.url,
          createdByUserId: row.created_by_user_id,
          updatedAt: toNumber(row.updated_at),
        })),
      noteCount: notesByProject.get(project.id) ?? 0,
      artifactCount: artifactsByProject.get(project.id) ?? 0,
    }
  })
}

export async function listTicketsForWorkspace(input: {
  organizationId: string
  userId: string
}) {
  const pool = requireZeroUpstreamPool()
  const [ticketsResult, membersResult, decisionsResult] = await Promise.all([
    pool.query<{
      id: string
      title: string
      description: string
      severity: string
      status: string
      approved_project_id: string | null
      created_by_user_id: string
      updated_at: string | number
    }>(
      `select t.id,
              t.title,
              t.description,
              t.severity,
              t.status,
              t.approved_project_id,
              t.created_by_user_id,
              t.updated_at
         from ticket t
         join ticket_member scope_member
           on scope_member.ticket_id = t.id
          and scope_member.user_id = $2
        where t.organization_id = $1
        order by t.updated_at desc`,
      [input.organizationId, input.userId],
    ),
    pool.query<{
      ticket_id: string
      user_id: string
      access_role: string
    }>(
      `select ticket_id, user_id, access_role
         from ticket_member
        where organization_id = $1`,
      [input.organizationId],
    ),
    pool.query<{
      ticket_id: string
      decision: string
      decision_note: string | null
      project_id: string | null
      decided_by_user_id: string
      created_at: string | number
    }>(
      `select ticket_id, decision, decision_note, project_id, decided_by_user_id, created_at
         from ticket_decision
        where organization_id = $1
        order by created_at desc`,
      [input.organizationId],
    ),
  ])

  return ticketsResult.rows.map((ticket) => {
    const latestDecision =
      decisionsResult.rows.find((decision) => decision.ticket_id === ticket.id) ?? null
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      severity: ticket.severity,
      status: ticket.status,
      approvedProjectId: ticket.approved_project_id,
      createdByUserId: ticket.created_by_user_id,
      updatedAt: toNumber(ticket.updated_at),
      members: membersResult.rows
        .filter((member) => member.ticket_id === ticket.id)
        .map((member) => ({
          userId: member.user_id,
          accessRole: member.access_role,
        })),
      latestDecision: latestDecision
        ? {
            decision: latestDecision.decision,
            decisionNote: latestDecision.decision_note,
            projectId: latestDecision.project_id,
            decidedByUserId: latestDecision.decided_by_user_id,
            createdAt: toNumber(latestDecision.created_at),
          }
        : null,
    }
  })
}

export async function listOrganizationDirectory(input: {
  organizationId: string
}) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<OrgMemberDirectoryRow>(
    `select m.id as member_id,
            m."userId" as user_id,
            m.role,
            access.status,
            u.name as user_name,
            u.email as user_email,
            u.image as user_image
       from member m
       join "user" u on u.id = m."userId"
       left join org_member_access access
         on access.organization_id = m."organizationId"
        and access.user_id = m."userId"
      where m."organizationId" = $1
      order by lower(u.email) asc`,
    [input.organizationId],
  )

  return result.rows.map((row) => ({
    id: row.member_id,
    userId: row.user_id,
    role: row.role,
    accessStatus: row.status ?? 'active',
    user: {
      name: row.user_name ?? row.user_email ?? 'Member',
      email: row.user_email ?? '',
      image: row.user_image,
    },
  }))
}

export async function listSocialPosts(input: { organizationId: string }) {
  const pool = requireZeroUpstreamPool()
  const [postsResult, jobsResult] = await Promise.all([
    pool.query<{
      id: string
      title: string
      content: string
      status: string
      channels: readonly string[]
      scheduled_for: string | number | null
      published_at: string | number | null
      updated_at: string | number
      error_message: string | null
    }>(
      `select id, title, content, status, channels, scheduled_for, published_at, updated_at, error_message
         from social_post
        where organization_id = $1
        order by updated_at desc`,
      [input.organizationId],
    ),
    pool.query<{
      social_post_id: string
      provider_key: string
      status: string
      scheduled_for: string | number | null
      published_at: string | number | null
      error_message: string | null
    }>(
      `select social_post_id, provider_key, status, scheduled_for, published_at, error_message
         from social_publish_job
        where organization_id = $1`,
      [input.organizationId],
    ),
  ])

  return postsResult.rows.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    status: post.status,
    channels: post.channels,
    scheduledFor: toNullableNumber(post.scheduled_for),
    publishedAt: toNullableNumber(post.published_at),
    updatedAt: toNumber(post.updated_at),
    errorMessage: post.error_message,
    jobs: jobsResult.rows
      .filter((job) => job.social_post_id === post.id)
      .map((job) => ({
        providerKey: job.provider_key,
        status: job.status,
        scheduledFor: toNullableNumber(job.scheduled_for),
        publishedAt: toNullableNumber(job.published_at),
        errorMessage: job.error_message,
      })),
  }))
}

export async function listVoiceAssistantInstances(input: {
  organizationId: string
}) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<OrgVoiceAssistantInstanceRow>(
    `select id,
            assistant_template_key,
            provider_mode,
            external_assistant_id,
            phone_number,
            caller_id,
            provisioning_status,
            last_synced_at,
            updated_at
       from voice_assistant_instance
      where organization_id = $1
      order by updated_at desc`,
    [input.organizationId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    assistantTemplateKey: row.assistant_template_key,
    providerMode: row.provider_mode,
    externalAssistantId: row.external_assistant_id,
    phoneNumber: row.phone_number,
    callerId: row.caller_id,
    provisioningStatus: row.provisioning_status,
    lastSyncedAt: toNullableNumber(row.last_synced_at),
    updatedAt: toNumber(row.updated_at),
  }))
}

export async function listVoiceCampaigns(input: { organizationId: string }) {
  const pool = requireZeroUpstreamPool()
  const [campaignsResult, batchesResult, callLogsResult, summariesResult] =
    await Promise.all([
      pool.query<{
        id: string
        title: string
        status: string
        assistant_instance_id: string | null
        assistant_template_key: string
        provider_mode: Arch3rVoiceProviderMode
        external_assistant_id: string | null
        phone_number: string | null
        caller_id: string | null
        provisioning_status: string
        last_synced_at: string | number | null
        csv_file_name: string | null
        updated_at: string | number
      }>(
        `select id,
                title,
                status,
                assistant_instance_id,
                assistant_template_key,
                provider_mode,
                external_assistant_id,
                phone_number,
                caller_id,
                provisioning_status,
                last_synced_at,
                csv_file_name,
                updated_at
           from voice_campaign
          where organization_id = $1
          order by updated_at desc`,
        [input.organizationId],
      ),
      pool.query<{ campaign_id: string; row_count: string }>(
        `select campaign_id, sum(row_count)::text as row_count
           from voice_lead_batch
          where organization_id = $1
          group by campaign_id`,
        [input.organizationId],
      ),
      pool.query<{ campaign_id: string; status: string; count: string }>(
        `select campaign_id, status, count(*)::text as count
           from voice_call_log
          where organization_id = $1
          group by campaign_id, status`,
        [input.organizationId],
      ),
      pool.query<{ campaign_id: string; count: string }>(
        `select vcl.campaign_id, count(vts.id)::text as count
           from voice_call_log vcl
           left join voice_transcript_summary vts on vts.call_log_id = vcl.id
          where vcl.organization_id = $1
          group by vcl.campaign_id`,
        [input.organizationId],
      ),
    ])

  return campaignsResult.rows.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    status: campaign.status,
    assistantInstanceId: campaign.assistant_instance_id,
    assistantTemplateKey: campaign.assistant_template_key,
    providerMode: campaign.provider_mode,
    externalAssistantId: campaign.external_assistant_id,
    phoneNumber: campaign.phone_number,
    callerId: campaign.caller_id,
    provisioningStatus: campaign.provisioning_status,
    lastSyncedAt: toNullableNumber(campaign.last_synced_at),
    csvFileName: campaign.csv_file_name,
    updatedAt: toNumber(campaign.updated_at),
    rowCount:
      toNumber(
        batchesResult.rows.find((row) => row.campaign_id === campaign.id)?.row_count,
      ),
    callStatuses: callLogsResult.rows
      .filter((row) => row.campaign_id === campaign.id)
      .map((row) => ({
        status: row.status,
        count: toNumber(row.count),
      })),
    transcriptSummaryCount:
      toNumber(
        summariesResult.rows.find((row) => row.campaign_id === campaign.id)?.count,
      ),
  }))
}

export async function listSmsCampaigns(input: { organizationId: string }) {
  const pool = requireZeroUpstreamPool()
  const [campaignsResult, batchesResult, messageLogsResult] = await Promise.all([
    pool.query<{
      id: string
      title: string
      status: string
      message_template: string
      csv_file_name: string | null
      updated_at: string | number
    }>(
      `select id, title, status, message_template, csv_file_name, updated_at
         from sms_campaign
        where organization_id = $1
        order by updated_at desc`,
      [input.organizationId],
    ),
    pool.query<{ campaign_id: string; row_count: string }>(
      `select campaign_id, sum(row_count)::text as row_count
         from sms_batch
        where organization_id = $1
        group by campaign_id`,
      [input.organizationId],
    ),
    pool.query<{ campaign_id: string; status: string; count: string }>(
      `select campaign_id, status, count(*)::text as count
         from sms_message_log
        where organization_id = $1
        group by campaign_id, status`,
      [input.organizationId],
    ),
  ])

  return campaignsResult.rows.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    status: campaign.status,
    messageTemplate: campaign.message_template,
    csvFileName: campaign.csv_file_name,
    updatedAt: toNumber(campaign.updated_at),
    rowCount:
      toNumber(
        batchesResult.rows.find((row) => row.campaign_id === campaign.id)?.row_count,
      ),
    deliveryStatuses: messageLogsResult.rows
      .filter((row) => row.campaign_id === campaign.id)
      .map((row) => ({
        status: row.status,
        count: toNumber(row.count),
      })),
  }))
}

export async function upsertPluginActivation(input: {
  organizationId: string
  userId: string
  data: UpsertPluginActivationInput
}) {
  const pool = requireZeroUpstreamPool()
  const tooling = await getWorkspaceToolingSnapshot({
    organizationId: input.organizationId,
  })
  const plugin = tooling.plugins.find(
    (candidate) => candidate.definition.key === input.data.pluginKey,
  )
  if (!plugin) {
    throw new Error('Plugin definition not found.')
  }
  if (plugin.state.entitlementStatus !== 'entitled') {
    throw new Error('This plugin is not currently entitled for the workspace.')
  }
  if (
    input.data.activationStatus === 'active' &&
    plugin.state.readinessStatus === 'needs_configuration'
  ) {
    throw new Error('Finish the required integration setup before activation.')
  }

  const timestamp = now()
  await pool.query(
    `insert into org_plugin_installations (
        id,
        organization_id,
        plugin_key,
        activation_status,
        nav_visible,
        activated_at,
        activated_by_user_id,
        metadata,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, $8, $8)
      on conflict (organization_id, plugin_key) do update
        set activation_status = excluded.activation_status,
            nav_visible = excluded.nav_visible,
            activated_at = excluded.activated_at,
            activated_by_user_id = excluded.activated_by_user_id,
            updated_at = excluded.updated_at`,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.data.pluginKey,
      input.data.activationStatus,
      input.data.activationStatus === 'active',
      input.data.activationStatus === 'active' ? timestamp : null,
      input.userId,
      timestamp,
    ],
  )

  return getWorkspaceToolingSnapshot({ organizationId: input.organizationId })
}

export async function upsertIntegrationConfig(input: {
  organizationId: string
  userId: string
  data: UpsertIntegrationConfigInput
}) {
  const pool = requireZeroUpstreamPool()
  const definition = getArch3rIntegrationDefinition(input.data.providerKey)
  const missingEnv = resolveMissingEnv(definition.requiredEnv)
  const encryptedConfig =
    Object.keys(input.data.config).length > 0
      ? encryptBishSecretJson(input.data.config)
      : null

  const hasLinkedAccount = Boolean(
    input.data.linkedAccountName || input.data.linkedAccountExternalId,
  )
  const status =
    missingEnv.length > 0
      ? 'needs_configuration'
      : definition.linkedAccountLabel && !hasLinkedAccount
        ? 'needs_linked_account'
        : input.data.authMode === 'organization_override' && !encryptedConfig
          ? 'needs_configuration'
          : 'ready'

  const timestamp = now()
  await pool.query(
    `insert into org_integration_credentials (
        id,
        organization_id,
        provider_key,
        auth_mode,
        status,
        credential_label,
        linked_account_name,
        linked_account_external_id,
        encrypted_config,
        metadata,
        created_by_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, '{}'::jsonb, $10, $11, $11)
      on conflict (organization_id, provider_key) do update
        set auth_mode = excluded.auth_mode,
            status = excluded.status,
            credential_label = excluded.credential_label,
            linked_account_name = excluded.linked_account_name,
            linked_account_external_id = excluded.linked_account_external_id,
            encrypted_config = excluded.encrypted_config,
            created_by_user_id = excluded.created_by_user_id,
            updated_at = excluded.updated_at`,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.data.providerKey,
      input.data.authMode,
      status,
      input.data.credentialLabel ?? null,
      input.data.linkedAccountName ?? null,
      input.data.linkedAccountExternalId ?? null,
      encryptedConfig ? JSON.stringify(encryptedConfig) : null,
      input.userId,
      timestamp,
    ],
  )

  return getWorkspaceToolingSnapshot({ organizationId: input.organizationId })
}

export async function createProject(input: {
  organizationId: string
  userId: string
  data: CreateProjectInput
}) {
  const pool = requireZeroUpstreamPool()
  const projectId = crypto.randomUUID()
  const timestamp = now()
  const memberUserIds = [...new Set([input.userId, ...input.data.memberUserIds])]

  await pool.query('begin')
  try {
    await pool.query(
      `insert into project (
          id,
          organization_id,
          title,
          description,
          status,
          created_by_user_id,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, 'active', $5, $6, $6)`,
      [
        projectId,
        input.organizationId,
        input.data.title,
        input.data.description ?? null,
        input.userId,
        timestamp,
      ],
    )

    for (const [position, title] of ['Backlog', 'In Progress', 'Done'].entries()) {
      await pool.query(
        `insert into project_column (
            id,
            project_id,
            organization_id,
            title,
            position,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $6)`,
        [crypto.randomUUID(), projectId, input.organizationId, title, position, timestamp],
      )
    }

    for (const memberUserId of memberUserIds) {
      await pool.query(
        `insert into project_member (
            id,
            project_id,
            organization_id,
            user_id,
            access_role,
            added_by_user_id,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          crypto.randomUUID(),
          projectId,
          input.organizationId,
          memberUserId,
          memberUserId === input.userId ? 'owner' : 'member',
          input.userId,
          timestamp,
        ],
      )
    }

    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  return listProjectsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function upsertProjectNote(input: {
  organizationId: string
  userId: string
  data: UpsertProjectNoteInput
}) {
  await requireProjectOwner({
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.data.projectId,
  })
  const pool = requireZeroUpstreamPool()
  const noteId = input.data.noteId ?? crypto.randomUUID()
  const timestamp = now()
  await pool.query(
    `insert into project_note (
        id,
        project_id,
        organization_id,
        created_by_user_id,
        title,
        content,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $7)
      on conflict (id) do update
        set title = excluded.title,
            content = excluded.content,
            updated_at = excluded.updated_at`,
    [
      noteId,
      input.data.projectId,
      input.organizationId,
      input.userId,
      input.data.title,
      input.data.content,
      timestamp,
    ],
  )

  return listProjectsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function createProjectArtifact(input: {
  organizationId: string
  userId: string
  data: CreateProjectArtifactInput
}) {
  await requireProjectOwner({
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.data.projectId,
  })
  const pool = requireZeroUpstreamPool()
  const timestamp = now()
  await pool.query(
    `insert into project_artifact (
        id,
        project_id,
        organization_id,
        created_by_user_id,
        kind,
        label,
        url,
        storage_key,
        content_type,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
    [
      crypto.randomUUID(),
      input.data.projectId,
      input.organizationId,
      input.userId,
      input.data.kind,
      input.data.label,
      input.data.url,
      input.data.storageKey ?? null,
      input.data.contentType ?? null,
      timestamp,
    ],
  )

  return listProjectsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function createProjectCard(input: {
  organizationId: string
  userId: string
  data: CreateProjectCardInput
}) {
  await requireProjectOwner({
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.data.projectId,
  })
  const pool = requireZeroUpstreamPool()
  const positionResult = await pool.query<{ next_position: string | number }>(
    `select coalesce(max(position), -1) + 1 as next_position
       from project_card
      where project_id = $1
        and column_id = $2`,
    [input.data.projectId, input.data.columnId],
  )
  const timestamp = now()
  await pool.query(
    `insert into project_card (
        id,
        project_id,
        organization_id,
        column_id,
        title,
        description,
        position,
        created_by_user_id,
        assignee_user_id,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
    [
      crypto.randomUUID(),
      input.data.projectId,
      input.organizationId,
      input.data.columnId,
      input.data.title,
      input.data.description ?? null,
      toNumber(positionResult.rows[0]?.next_position),
      input.userId,
      input.data.assigneeUserId ?? null,
      timestamp,
    ],
  )

  return listProjectsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function updateProjectMembers(input: {
  organizationId: string
  userId: string
  data: UpdateProjectMembersInput
}) {
  await requireProjectOwner({
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.data.projectId,
  })
  const pool = requireZeroUpstreamPool()
  const timestamp = now()
  const memberUserIds = [...new Set([input.userId, ...input.data.memberUserIds])]
  await pool.query('begin')
  try {
    await pool.query(
      `delete from project_member
        where project_id = $1
          and organization_id = $2
          and user_id <> all($3::text[])`,
      [input.data.projectId, input.organizationId, memberUserIds],
    )
    for (const memberUserId of memberUserIds) {
      await pool.query(
        `insert into project_member (
            id,
            project_id,
            organization_id,
            user_id,
            access_role,
            added_by_user_id,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $7)
          on conflict (project_id, user_id) do update
            set access_role = excluded.access_role,
                updated_at = excluded.updated_at`,
        [
          crypto.randomUUID(),
          input.data.projectId,
          input.organizationId,
          memberUserId,
          memberUserId === input.userId ? 'owner' : 'member',
          input.userId,
          timestamp,
        ],
      )
    }
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  return listProjectsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function createTicket(input: {
  organizationId: string
  userId: string
  data: CreateTicketInput
}) {
  const pool = requireZeroUpstreamPool()
  const ticketId = crypto.randomUUID()
  const timestamp = now()
  const memberUserIds = [...new Set([input.userId, ...input.data.memberUserIds])]

  await pool.query('begin')
  try {
    await pool.query(
      `insert into ticket (
          id,
          organization_id,
          title,
          description,
          severity,
          status,
          created_by_user_id,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, 'submitted', $6, $7, $7)`,
      [
        ticketId,
        input.organizationId,
        input.data.title,
        input.data.description,
        input.data.severity,
        input.userId,
        timestamp,
      ],
    )

    for (const memberUserId of memberUserIds) {
      await pool.query(
        `insert into ticket_member (
            id,
            ticket_id,
            organization_id,
            user_id,
            access_role,
            added_by_user_id,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          crypto.randomUUID(),
          ticketId,
          input.organizationId,
          memberUserId,
          memberUserId === input.userId ? 'owner' : 'member',
          input.userId,
          timestamp,
        ],
      )
    }
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  return listTicketsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function decideTicket(input: {
  organizationId: string
  userId: string
  data: DecideTicketInput
}) {
  await requireTicketApprover({
    organizationId: input.organizationId,
    userId: input.userId,
  })
  const pool = requireZeroUpstreamPool()
  const timestamp = now()

  await pool.query('begin')
  try {
    let projectId: string | null = null
    if (input.data.decision === 'approved') {
      projectId = crypto.randomUUID()
      const membersResult = await pool.query<{ user_id: string }>(
        `select user_id from ticket_member where ticket_id = $1 and organization_id = $2`,
        [input.data.ticketId, input.organizationId],
      )
      const ticketResult = await pool.query<{ title: string }>(
        `select title from ticket where id = $1 and organization_id = $2 limit 1`,
        [input.data.ticketId, input.organizationId],
      )
      const title =
        input.data.projectTitle?.trim() ||
        ticketResult.rows[0]?.title ||
        'Approved Ticket Project'

      await pool.query(
        `insert into project (
            id,
            organization_id,
            title,
            description,
            status,
            created_by_user_id,
            linked_ticket_id,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, 'active', $5, $6, $7, $7)`,
        [
          projectId,
          input.organizationId,
          title,
          input.data.decisionNote ?? null,
          input.userId,
          input.data.ticketId,
          timestamp,
        ],
      )
      for (const [position, titleValue] of ['Backlog', 'In Progress', 'Done'].entries()) {
        await pool.query(
          `insert into project_column (
              id,
              project_id,
              organization_id,
              title,
              position,
              created_at,
              updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $6)`,
          [crypto.randomUUID(), projectId, input.organizationId, titleValue, position, timestamp],
        )
      }
      for (const row of membersResult.rows) {
        await pool.query(
          `insert into project_member (
              id,
              project_id,
              organization_id,
              user_id,
              access_role,
              added_by_user_id,
              created_at,
              updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $7)`,
          [
            crypto.randomUUID(),
            projectId,
            input.organizationId,
            row.user_id,
            row.user_id === input.userId ? 'owner' : 'member',
            input.userId,
            timestamp,
          ],
        )
      }
    }

    await pool.query(
      `update ticket
          set status = $3,
              approved_project_id = $4,
              updated_at = $5
        where id = $1
          and organization_id = $2`,
      [
        input.data.ticketId,
        input.organizationId,
        input.data.decision === 'approved' ? 'in_project' : 'denied',
        projectId,
        timestamp,
      ],
    )

    await pool.query(
      `insert into ticket_decision (
          id,
          ticket_id,
          organization_id,
          decision,
          decision_note,
          decided_by_user_id,
          project_id,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [
        crypto.randomUUID(),
        input.data.ticketId,
        input.organizationId,
        input.data.decision,
        input.data.decisionNote ?? null,
        input.userId,
        projectId,
        timestamp,
      ],
    )
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  return listTicketsForWorkspace({
    organizationId: input.organizationId,
    userId: input.userId,
  })
}

export async function upsertSocialPost(input: {
  organizationId: string
  userId: string
  data: UpsertSocialPostInput
}) {
  const pool = requireZeroUpstreamPool()
  const postId = crypto.randomUUID()
  const timestamp = now()
  const status = input.data.scheduledFor ? 'scheduled' : 'draft'

  await pool.query('begin')
  try {
    await pool.query(
      `insert into social_post (
          id,
          organization_id,
          title,
          content,
          channels,
          status,
          scheduled_for,
          created_by_user_id,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $9)`,
      [
        postId,
        input.organizationId,
        input.data.title,
        input.data.content,
        JSON.stringify(input.data.channels),
        status,
        input.data.scheduledFor ?? null,
        input.userId,
        timestamp,
      ],
    )
    for (const channel of input.data.channels) {
      await pool.query(
        `insert into social_publish_job (
            id,
            organization_id,
            social_post_id,
            provider_key,
            status,
            scheduled_for,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          crypto.randomUUID(),
          input.organizationId,
          postId,
          channel,
          status,
          input.data.scheduledFor ?? null,
          timestamp,
        ],
      )
    }
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  return listSocialPosts({ organizationId: input.organizationId })
}

async function ensureVoiceAssistantInstance(input: {
  organizationId: string
  userId: string
  assistantTemplateKey: string
}) {
  const pool = requireZeroUpstreamPool()
  const integrationResult = await pool.query<OrgIntegrationCredentialRow>(
    `select id,
            provider_key,
            auth_mode,
            status,
            credential_label,
            linked_account_name,
            linked_account_external_id,
            encrypted_config,
            updated_at
       from org_integration_credentials
      where organization_id = $1
        and provider_key = 'vapi'
      limit 1`,
    [input.organizationId],
  )
  const integrationRow = integrationResult.rows[0] ?? null
  const providerMode = resolveVoiceProviderMode(integrationRow)
  const config = integrationRow?.encrypted_config
  const phoneNumber =
    typeof config?.phoneNumber === 'string' && config.phoneNumber.trim()
      ? config.phoneNumber.trim()
      : typeof config?.defaultCallerId === 'string' &&
          config.defaultCallerId.trim()
        ? config.defaultCallerId.trim()
        : null
  const callerId =
    typeof config?.defaultCallerId === 'string' && config.defaultCallerId.trim()
      ? config.defaultCallerId.trim()
      : null
  const existingResult = await pool.query<OrgVoiceAssistantInstanceRow>(
    `select id,
            assistant_template_key,
            provider_mode,
            external_assistant_id,
            phone_number,
            caller_id,
            provisioning_status,
            last_synced_at,
            updated_at
       from voice_assistant_instance
      where organization_id = $1
        and assistant_template_key = $2
        and provider_mode = $3
      limit 1`,
    [input.organizationId, input.assistantTemplateKey, providerMode],
  )
  const timestamp = now()
  const existing = existingResult.rows[0] ?? null

  if (existing) {
    await pool.query(
      `update voice_assistant_instance
          set phone_number = $4,
              caller_id = $5,
              provisioning_status =
                case
                  when external_assistant_id is not null then 'ready'
                  else provisioning_status
                end,
              updated_at = $6
        where id = $1
          and organization_id = $2
          and assistant_template_key = $3`,
      [
        existing.id,
        input.organizationId,
        input.assistantTemplateKey,
        phoneNumber,
        callerId,
        timestamp,
      ],
    )

    return {
      id: existing.id,
      providerMode,
      externalAssistantId: existing.external_assistant_id,
      phoneNumber: phoneNumber ?? existing.phone_number,
      callerId: callerId ?? existing.caller_id,
      provisioningStatus:
        existing.external_assistant_id != null
          ? 'ready'
          : existing.provisioning_status,
      lastSyncedAt: toNullableNumber(existing.last_synced_at),
    }
  }

  const assistantInstanceId = crypto.randomUUID()
  await pool.query(
    `insert into voice_assistant_instance (
        id,
        organization_id,
        assistant_template_key,
        provider_mode,
        external_assistant_id,
        phone_number,
        caller_id,
        provisioning_status,
        last_synced_at,
        created_by_user_id,
        metadata,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, null, $5, $6, 'awaiting_provisioning', null, $7, '{}'::jsonb, $8, $8)`,
    [
      assistantInstanceId,
      input.organizationId,
      input.assistantTemplateKey,
      providerMode,
      phoneNumber,
      callerId,
      input.userId,
      timestamp,
    ],
  )

  return {
    id: assistantInstanceId,
    providerMode,
    externalAssistantId: null,
    phoneNumber,
    callerId,
    provisioningStatus: 'awaiting_provisioning',
    lastSyncedAt: null,
  }
}

export async function createVoiceCampaign(input: {
  organizationId: string
  userId: string
  data: CreateVoiceCampaignInput
}) {
  const rows = parseCsvRows(input.data.csvContent)
  const selectedRows =
    input.data.selectedRowIndexes?.length
      ? rows.filter((row) => input.data.selectedRowIndexes?.includes(row.rowIndex))
      : rows

  const pool = requireZeroUpstreamPool()
  const campaignId = crypto.randomUUID()
  const batchId = crypto.randomUUID()
  const timestamp = now()
  const assistantTemplateKey = DEFAULT_ARCH3R_VOICE_ASSISTANT_TEMPLATE.key
  const assistantInstance = await ensureVoiceAssistantInstance({
    organizationId: input.organizationId,
    userId: input.userId,
    assistantTemplateKey,
  })

  await pool.query('begin')
  try {
    await pool.query(
      `insert into voice_campaign (
          id,
          organization_id,
          title,
          status,
          assistant_instance_id,
          assistant_template_key,
          provider_mode,
          external_assistant_id,
          phone_number,
          caller_id,
          provisioning_status,
          last_synced_at,
          created_by_user_id,
          csv_file_name,
          created_at,
          updated_at
        )
        values ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)`,
      [
        campaignId,
        input.organizationId,
        input.data.campaignName,
        assistantInstance.id,
        assistantTemplateKey,
        assistantInstance.providerMode,
        assistantInstance.externalAssistantId,
        assistantInstance.phoneNumber,
        assistantInstance.callerId,
        assistantInstance.provisioningStatus,
        assistantInstance.lastSyncedAt,
        input.userId,
        input.data.csvFileName,
        timestamp,
      ],
    )
    await pool.query(
      `insert into voice_lead_batch (
          id,
          organization_id,
          campaign_id,
          title,
          row_count,
          field_mapping,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, '{}'::jsonb, $6, $6)`,
      [
        batchId,
        input.organizationId,
        campaignId,
        `${input.data.campaignName} Batch`,
        selectedRows.length,
        timestamp,
      ],
    )
    for (const row of selectedRows) {
      await pool.query(
        `insert into voice_lead (
            id,
            organization_id,
            batch_id,
            campaign_id,
            display_name,
            phone_number,
            email,
            company_name,
            payload,
            row_index,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $11)`,
        [
          crypto.randomUUID(),
          input.organizationId,
          batchId,
          campaignId,
          row.payload.name || row.payload.full_name || null,
          row.payload.phone || row.payload.phone_number || null,
          row.payload.email || null,
          row.payload.company || row.payload.company_name || null,
          JSON.stringify(row.payload),
          row.rowIndex,
          timestamp,
        ],
      )
    }
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  const [campaigns, assistants] = await Promise.all([
    listVoiceCampaigns({ organizationId: input.organizationId }),
    listVoiceAssistantInstances({ organizationId: input.organizationId }),
  ])

  return { campaigns, assistants }
}

export async function createSmsCampaign(input: {
  organizationId: string
  userId: string
  data: CreateSmsCampaignInput
}) {
  const rows = parseCsvRows(input.data.csvContent)
  const selectedRows =
    input.data.selectedRowIndexes?.length
      ? rows.filter((row) => input.data.selectedRowIndexes?.includes(row.rowIndex))
      : rows
  const pool = requireZeroUpstreamPool()
  const campaignId = crypto.randomUUID()
  const batchId = crypto.randomUUID()
  const timestamp = now()

  await pool.query('begin')
  try {
    await pool.query(
      `insert into sms_campaign (
          id,
          organization_id,
          title,
          status,
          message_template,
          created_by_user_id,
          csv_file_name,
          created_at,
          updated_at
        )
        values ($1, $2, $3, 'draft', $4, $5, $6, $7, $7)`,
      [
        campaignId,
        input.organizationId,
        input.data.campaignName,
        input.data.messageTemplate,
        input.userId,
        input.data.csvFileName,
        timestamp,
      ],
    )
    await pool.query(
      `insert into sms_batch (
          id,
          organization_id,
          campaign_id,
          title,
          row_count,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $6)`,
      [
        batchId,
        input.organizationId,
        campaignId,
        `${input.data.campaignName} Batch`,
        selectedRows.length,
        timestamp,
      ],
    )
    for (const row of selectedRows) {
      await pool.query(
        `insert into sms_message_log (
            id,
            organization_id,
            campaign_id,
            batch_id,
            phone_number,
            display_name,
            status,
            payload,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, 'draft', $7::jsonb, $8, $8)`,
        [
          crypto.randomUUID(),
          input.organizationId,
          campaignId,
          batchId,
          row.payload.phone || row.payload.phone_number || null,
          row.payload.name || row.payload.full_name || null,
          JSON.stringify(row.payload),
          timestamp,
        ],
      )
    }
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  }

  return listSmsCampaigns({ organizationId: input.organizationId })
}
