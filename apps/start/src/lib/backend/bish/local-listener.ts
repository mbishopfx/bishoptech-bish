import { createHash } from 'node:crypto'
import {
  buildLocalListenerSignature,
} from '@bish/automation/handoff'
import type {
  LocalListenerArtifactPayload,
  LocalListenerHandoffPayload,
  LocalListenerRegistrationPayload,
} from '@bish/automation/handoff'
import { Effect } from 'effect'
import { OrgKnowledgeRuntime } from '@/lib/backend/org-knowledge/runtime/org-knowledge-runtime'
import { OrgKnowledgeAdminService } from '@/lib/backend/org-knowledge/services/org-knowledge-admin.service'
import { normalizeThreadActiveChildMap } from '@/lib/backend/chat/services/message-store/helpers'
import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import type {
  CreateLocalListenerSecretInput,
  DispatchThreadHandoffInput,
  LocalListenerActivityEntry,
  LocalHandoffSummary,
  LocalListenerSummary,
  RegisterLocalListenerInput,
  ReportLocalListenerActivityInput,
  ReportLocalListenerArtifactsInput,
  SaveLocalListenerConfigInput,
} from '@/lib/shared/local-listener'
import {
  decryptBishSecretJson,
  encryptBishSecretJson,
} from './connector-secrets'

type ListenerRow = {
  id: string
  organization_id: string
  label: string
  status: string
  endpoint_url: string | null
  platform: string | null
  runtime_mode: string | null
  supported_targets: readonly string[] | null
  default_target: string | null
  system_prompt_template: string | null
  encrypted_listener_secret: ReturnType<typeof encryptBishSecretJson<string>>
  listener_secret_hash: string
  last_seen_at: number | null
}

type HandoffRow = {
  id: string
  thread_id: string | null
  title: string
  target: string
  status: string
  created_at: number | string
  delivered_at: number | string | null
  completed_at: number | string | null
  error_message: string | null
  metadata?: Record<string, unknown> | null
}

function hashListenerSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex')
}

/**
 * Postgres bigint columns come back from `pg` as strings by default. The
 * listener tables store unix-millisecond timestamps in bigint columns, so the
 * admin UI needs those values normalized back into finite numbers before it can
 * safely hand them to `Date`.
 */
function coerceTimestamp(
  value: number | string | null | undefined,
): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

function buildDefaultSystemPrompt() {
  return [
    'You are continuing a local handoff on the machine.',
    'Use the provided markdown handoff file as the source of truth for the conversation context, build intent, constraints, and expected outputs.',
    'Use the isolated handoff workspace for new files and experiments unless the handoff explicitly instructs you to patch an existing repository.',
    'Keep changes scoped, avoid modifying the local listener/system code by default, and summarize what you changed before you stop.',
  ].join(' ')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Local listener delivery happens over customer-managed tunnels, so brief TLS
 * or edge-proxy hiccups should not immediately fail the handoff. We only retry
 * transport-level failures and upstream gateway statuses; auth or validation
 * errors remain immediate failures because they require operator action.
 */
function isRetryableListenerDeliveryFailure(input: {
  readonly error?: unknown
  readonly status?: number
}) {
  if (typeof input.status === 'number') {
    return [408, 425, 429, 502, 503, 504].includes(input.status)
  }

  if (!(input.error instanceof Error)) return false
  const message = input.error.message.toLowerCase()
  return (
    message.includes('certificate') ||
    message.includes('tls') ||
    message.includes('ssl') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('socket hang up')
  )
}

function formatLocalListenerThreadUpdate(input: {
  readonly title: string
  readonly target: string
  readonly status: 'activity' | 'completed' | 'failed'
  readonly message: string
  readonly metadata?: Record<string, unknown>
}) {
  const lines = [
    `## Local Listener ${input.status === 'activity' ? 'Update' : input.status === 'completed' ? 'Completed' : 'Failed'}`,
    '',
    `Handoff: ${input.title}`,
    `Target: ${input.target}`,
    '',
    input.message,
  ]

  if (input.metadata?.['repoBranch'] || input.metadata?.['repoCommitSha']) {
    lines.push(
      '',
      `Repo branch: ${String(input.metadata['repoBranch'] ?? 'unknown')}`,
      `Commit: ${String(input.metadata['repoCommitSha'] ?? 'unknown')}`,
    )
  }

  if (Array.isArray(input.metadata?.['artifactNames'])) {
    const artifactNames = (input.metadata?.['artifactNames'] as unknown[])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    if (artifactNames.length > 0) {
      lines.push('', `Artifacts: ${artifactNames.join(', ')}`)
    }
  }

  return lines.join('\n')
}

function normalizeLocalListenerActivityLog(
  value: unknown,
): readonly LocalListenerActivityEntry[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    const id =
      typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id
        : undefined
    const kind =
      record.kind === 'info' ||
      record.kind === 'warning' ||
      record.kind === 'input_required' ||
      record.kind === 'resolved'
        ? record.kind
        : undefined
    const message =
      typeof record.message === 'string' && record.message.trim().length > 0
        ? record.message
        : undefined
    const createdAt =
      coerceTimestamp(
        typeof record.createdAt === 'number' || typeof record.createdAt === 'string'
          ? record.createdAt
          : undefined,
      ) ?? undefined

    if (!id || !kind || !message || createdAt === undefined) return []

    return [{
      id,
      kind,
      message,
      createdAt,
      metadata:
        record.metadata && typeof record.metadata === 'object'
          ? (record.metadata as Record<string, unknown>)
          : undefined,
    }]
  })
}

/**
 * Handoff metadata already exists as JSONB, so we append operational activity
 * there instead of introducing another table during the v1 listener rollout.
 * That keeps the Railway upgrade path small while still giving operators a
 * durable progress log for HITL moments.
 */
async function appendLocalHandoffActivity(input: {
  readonly handoffId: string
  readonly activity: LocalListenerActivityEntry
  readonly nextStatus?: string
}) {
  const pool = requireZeroUpstreamPool()
  const current = await pool.query<{ metadata: Record<string, unknown> | null }>(
    `
      SELECT metadata
      FROM local_handoffs
      WHERE id = $1
      LIMIT 1
    `,
    [input.handoffId],
  )

  const existingMetadata: Record<string, unknown> = current.rows[0]?.metadata ?? {}
  const existingActivity = normalizeLocalListenerActivityLog(
    existingMetadata['activityLog'],
  )
  const now = Date.now()

  await pool.query(
    `
      UPDATE local_handoffs
      SET metadata = $1::jsonb,
          status = COALESCE($2, status),
          updated_at = $3
      WHERE id = $4
    `,
    [
      JSON.stringify({
        ...existingMetadata,
        activityLog: [...existingActivity, input.activity].slice(-40),
      }),
      input.nextStatus ?? null,
      now,
      input.handoffId,
    ],
  )
}

/**
 * Listener activity should be visible in the same chat thread that spawned the
 * handoff so operators do not need to split attention between the approvals
 * page and the conversation timeline. These messages are inserted directly into
 * upstream Postgres because they originate outside the normal streaming path.
 */
async function appendLocalListenerThreadMessage(input: {
  readonly organizationId: string
  readonly threadId: string | null
  readonly userId: string
  readonly title: string
  readonly target: string
  readonly status: 'activity' | 'completed' | 'failed'
  readonly summary: string
  readonly activityKind?: 'info' | 'warning' | 'input_required' | 'resolved'
  readonly content: string
  readonly metadata?: Record<string, unknown>
}) {
  if (!input.threadId) return

  const pool = requireZeroUpstreamPool()
  const threadResult = await pool.query<{
    id: string
    thread_id: string
    user_id: string
    model: string
    active_child_by_parent: unknown
    branch_version: number
  }>(
    `
      SELECT
        id,
        thread_id,
        user_id,
        model,
        active_child_by_parent,
        branch_version
      FROM threads
      WHERE thread_id = $1
        AND owner_org_id = $2
      LIMIT 1
    `,
    [input.threadId, input.organizationId],
  )
  const thread = threadResult.rows[0]
  if (!thread) return

  const parentResult = await pool.query<{ message_id: string | null }>(
    `
      SELECT message_id
      FROM messages
      WHERE thread_id = $1
        AND status <> 'deleted'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [input.threadId],
  )
  const parentMessageId = parentResult.rows[0]?.message_id ?? null
  const branchResult = await pool.query<{ next_branch_index: number }>(
    `
      SELECT COALESCE(MAX(branch_index), 0) + 1 AS next_branch_index
      FROM messages
      WHERE thread_id = $1
        AND parent_message_id IS NOT DISTINCT FROM $2
    `,
    [input.threadId, parentMessageId],
  )

  const messageId = crypto.randomUUID()
  const now = Date.now()
  const activeChildByParent = normalizeThreadActiveChildMap(
    thread.active_child_by_parent,
  )
  if (parentMessageId) {
    activeChildByParent[parentMessageId] = messageId
  }

  await pool.query(
    `
      INSERT INTO messages (
        id,
        message_id,
        thread_id,
        user_id,
        reasoning,
        content,
        status,
        updated_at,
        parent_message_id,
        branch_index,
        branch_anchor_message_id,
        regen_source_message_id,
        role,
        created_at,
        server_error,
        model,
        attachments_ids,
        sources,
        model_params,
        provider_metadata,
        generation_metadata
      ) VALUES (
        $1,
        $1,
        $2,
        $3,
        NULL,
        $4,
        'done',
        $5,
        $6,
        $7,
        NULL,
        NULL,
        'assistant',
        $5,
        NULL,
        $8,
        '[]'::jsonb,
        NULL,
        NULL,
        NULL,
        $9::jsonb
      )
    `,
    [
      messageId,
      input.threadId,
      thread.user_id || input.userId,
      input.content,
      now,
      parentMessageId,
      branchResult.rows[0]?.next_branch_index ?? 1,
      thread.model,
      JSON.stringify({
        source: 'local_listener',
        title: input.title,
        target: input.target,
        status: input.status,
        summary: input.summary,
        ...(input.activityKind ? { activityKind: input.activityKind } : {}),
        ...(input.metadata ?? {}),
      }),
    ],
  )

  await pool.query(
    `
      UPDATE threads
      SET active_child_by_parent = $1::jsonb,
          branch_version = branch_version + 1,
          generation_status = 'completed',
          updated_at = $2,
          last_message_at = $2
      WHERE id = $3
    `,
    [
      JSON.stringify(activeChildByParent),
      now,
      thread.id,
    ],
  )
}

async function readPrimaryListenerForOrganization(organizationId: string) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<ListenerRow>(
    `
      SELECT
        id,
        organization_id,
        label,
        status,
        endpoint_url,
        platform,
        runtime_mode,
        supported_targets,
        default_target,
        system_prompt_template,
        encrypted_listener_secret,
        listener_secret_hash,
        last_seen_at
      FROM local_listener_registrations
      WHERE organization_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [organizationId],
  )
  return result.rows[0] ?? null
}

async function readListenerBySecret(secret: string) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<ListenerRow>(
    `
      SELECT
        id,
        organization_id,
        label,
        status,
        endpoint_url,
        platform,
        runtime_mode,
        supported_targets,
        default_target,
        system_prompt_template,
        encrypted_listener_secret,
        listener_secret_hash,
        last_seen_at
      FROM local_listener_registrations
      WHERE listener_secret_hash = $1
      LIMIT 1
    `,
    [hashListenerSecret(secret)],
  )
  return result.rows[0] ?? null
}

function toListenerSummary(row: ListenerRow): LocalListenerSummary {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    endpointUrl: row.endpoint_url,
    platform: row.platform,
    runtimeMode: row.runtime_mode,
    supportedTargets: Array.isArray(row.supported_targets)
      ? row.supported_targets
      : [],
    defaultTarget: row.default_target,
    lastSeenAt: coerceTimestamp(row.last_seen_at),
    systemPromptTemplate: row.system_prompt_template,
  }
}

export async function listLocalListenersForOrganization(
  organizationId: string,
): Promise<readonly LocalListenerSummary[]> {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<ListenerRow>(
    `
      SELECT
        id,
        organization_id,
        label,
        status,
        endpoint_url,
        platform,
        runtime_mode,
        supported_targets,
        default_target,
        system_prompt_template,
        encrypted_listener_secret,
        listener_secret_hash,
        last_seen_at
      FROM local_listener_registrations
      WHERE organization_id = $1
      ORDER BY updated_at DESC
      LIMIT 6
    `,
    [organizationId],
  )
  return result.rows.map(toListenerSummary)
}

export async function listRecentLocalHandoffsForOrganization(
  organizationId: string,
): Promise<readonly LocalHandoffSummary[]> {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<HandoffRow>(
    `
      SELECT
        id,
        thread_id,
        title,
        target,
        status,
        created_at,
        delivered_at,
        completed_at,
        error_message,
        metadata
      FROM local_handoffs
      WHERE organization_id = $1
      ORDER BY updated_at DESC
      LIMIT 12
    `,
    [organizationId],
  )
  return result.rows.map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    title: row.title,
    target: row.target,
    status: row.status,
    createdAt: coerceTimestamp(row.created_at) ?? Date.now(),
    deliveredAt: coerceTimestamp(row.delivered_at),
    completedAt: coerceTimestamp(row.completed_at),
    errorMessage: row.error_message,
    activityLog: normalizeLocalListenerActivityLog(row.metadata?.activityLog),
  }))
}

export async function createOrRotateLocalListenerSecret(input: {
  readonly organizationId: string
  readonly data: CreateLocalListenerSecretInput
}) {
  const pool = requireZeroUpstreamPool()
  const existing = await readPrimaryListenerForOrganization(input.organizationId)
  const id = existing?.id ?? crypto.randomUUID()
  const secret = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID()
  const now = Date.now()

  await pool.query(
    `
      INSERT INTO local_listener_registrations (
        id,
        organization_id,
        label,
        status,
        endpoint_url,
        platform,
        runtime_mode,
        tunnel_provider,
        supported_targets,
        default_target,
        system_prompt_template,
        listener_secret_hash,
        encrypted_listener_secret,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'awaiting_registration',
        NULL,
        NULL,
        NULL,
        NULL,
        '["gemini","codex"]'::jsonb,
        'gemini',
        $4,
        $5,
        $6::jsonb,
        '{}'::jsonb,
        $7,
        $7
      )
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        status = 'awaiting_registration',
        listener_secret_hash = EXCLUDED.listener_secret_hash,
        encrypted_listener_secret = EXCLUDED.encrypted_listener_secret,
        updated_at = EXCLUDED.updated_at
    `,
    [
      id,
      input.organizationId,
      input.data.label,
      existing?.system_prompt_template ?? buildDefaultSystemPrompt(),
      hashListenerSecret(secret),
      JSON.stringify(encryptBishSecretJson(secret)),
      now,
    ],
  )

  return {
    secret,
    listenerId: id,
    listeners: await listLocalListenersForOrganization(input.organizationId),
    handoffs: await listRecentLocalHandoffsForOrganization(input.organizationId),
  }
}

export async function saveLocalListenerConfiguration(input: {
  readonly organizationId: string
  readonly data: SaveLocalListenerConfigInput
}) {
  const pool = requireZeroUpstreamPool()
  const existing = await readPrimaryListenerForOrganization(input.organizationId)
  if (!existing) {
    throw new Error('Create a listener secret before saving listener settings.')
  }

  await pool.query(
    `
      UPDATE local_listener_registrations
      SET label = $1,
          system_prompt_template = $2,
          default_target = $3,
          updated_at = $4
      WHERE id = $5
    `,
    [
      input.data.label,
      input.data.systemPromptTemplate,
      input.data.defaultTarget,
      Date.now(),
      existing.id,
    ],
  )
}

async function buildThreadHandoffMarkdown(input: {
  readonly organizationId: string
  readonly threadId: string
}) {
  const pool = requireZeroUpstreamPool()
  const [threadResult, messagesResult] = await Promise.all([
    pool.query<{ title: string | null }>(
      `
        SELECT title
        FROM threads
        WHERE thread_id = $1
          AND owner_org_id = $2
        LIMIT 1
      `,
      [input.threadId, input.organizationId],
    ),
    pool.query<{
      role: string
      content: string
      created_at: number | string
    }>(
      `
        SELECT role, content, created_at
        FROM messages
        WHERE thread_id = $1
          AND status <> 'deleted'
        ORDER BY created_at ASC
      `,
      [input.threadId],
    ),
  ])

  if (messagesResult.rows.length === 0) {
    throw new Error('This chat thread has no messages to hand off yet.')
  }

  const title = threadResult.rows[0]?.title?.trim() || 'Untitled Local Handoff'
  const transcript = messagesResult.rows
    .map(
      (message) => {
        const createdAt = coerceTimestamp(message.created_at)
        const createdAtLabel = createdAt
          ? new Date(createdAt).toISOString()
          : 'unknown-time'

        return `## ${message.role.toUpperCase()} (${createdAtLabel})\n\n${message.content}`
      },
    )
    .join('\n\n')

  return {
    title,
    markdown: [
      `# ${title}`,
      '',
      `Thread ID: ${input.threadId}`,
      '',
      transcript,
    ].join('\n'),
  }
}

/**
 * Command-center requests do not originate from an existing chat thread, so we
 * synthesize the same markdown handoff contract from the approved execution
 * request. Keeping the output in markdown means the local listener continues to
 * hand one consistent artifact shape to Gemini/Codex regardless of origin.
 */
function buildAdHocExecutionHandoffMarkdown(input: {
  readonly title: string
  readonly commandText: string
  readonly requestSource: 'manual' | 'voice' | 'chat'
  readonly transcript?: string | null
}) {
  const transcriptBlock =
    input.transcript && input.transcript.trim().length > 0
      ? [
          '## Voice Transcript',
          '',
          input.transcript.trim(),
          '',
        ]
      : []

  return {
    title: input.title.trim(),
    markdown: [
      `# ${input.title.trim()}`,
      '',
      `Request source: ${input.requestSource}`,
      '',
      ...transcriptBlock,
      '## Execution Brief',
      '',
      input.commandText.trim(),
    ].join('\n'),
  }
}

async function updateListenerLastSeen(listenerId: string) {
  const pool = requireZeroUpstreamPool()
  const now = Date.now()
  await pool.query(
    `
      UPDATE local_listener_registrations
      SET last_seen_at = $1,
          updated_at = $1
      WHERE id = $2
    `,
    [now, listenerId],
  )
}

async function queueAndDeliverLocalHandoff(input: {
  readonly organizationId: string
  readonly requestedByUserId: string
  readonly listener: ListenerRow
  readonly target: 'gemini' | 'codex'
  readonly title: string
  readonly handoffMarkdown: string
  readonly threadId?: string | null
  readonly metadata?: Record<string, unknown>
}) {
  const pool = requireZeroUpstreamPool()
  const handoffId = crypto.randomUUID()
  const now = Date.now()

  await pool.query(
    `
      INSERT INTO local_handoffs (
        id,
        organization_id,
        listener_registration_id,
        thread_id,
        requested_by_user_id,
        target,
        status,
        title,
        handoff_markdown,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'queued',
        $7,
        $8,
        $9::jsonb,
        $10,
        $10
      )
    `,
    [
      handoffId,
      input.organizationId,
      input.listener.id,
      input.threadId ?? null,
      input.requestedByUserId,
      input.target,
      input.title,
      input.handoffMarkdown,
      JSON.stringify(input.metadata ?? {}),
      now,
    ],
  )

  const secret = decryptBishSecretJson<string>(
    input.listener.encrypted_listener_secret,
  )
  const payload: LocalListenerHandoffPayload = {
    handoffId,
    organizationId: input.organizationId,
    threadId: input.threadId ?? null,
    title: input.title,
    target: input.target,
    systemPrompt:
      input.listener.system_prompt_template?.trim() || buildDefaultSystemPrompt(),
    handoffMarkdown: input.handoffMarkdown,
    createdAt: now,
  }
  const body = JSON.stringify(payload)
  const timestamp = String(now)
  const signature = buildLocalListenerSignature({
    secret,
    timestamp,
    body,
  })

  try {
    let delivered = false
    let lastError: Error | null = null
    const retryDelaysMs = [0, 1_500, 4_000]

    for (const [attemptIndex, delayMs] of retryDelaysMs.entries()) {
      if (delayMs > 0) {
        await sleep(delayMs)
      }

      try {
        const response = await fetch(input.listener.endpoint_url!, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-bish-timestamp': timestamp,
            'x-bish-signature': signature,
          },
          body,
        })

        if (!response.ok) {
          const message = await response.text()
          const responseError = new Error(
            message || 'Listener endpoint rejected the handoff.',
          )

          if (
            !isRetryableListenerDeliveryFailure({
              status: response.status,
            }) ||
            attemptIndex === retryDelaysMs.length - 1
          ) {
            throw responseError
          }

          lastError = responseError
          continue
        }

        delivered = true
        break
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error(String(error))

        if (
          !isRetryableListenerDeliveryFailure({
            error: normalizedError,
          }) ||
          attemptIndex === retryDelaysMs.length - 1
        ) {
          throw normalizedError
        }

        lastError = normalizedError
      }
    }

    if (!delivered) {
      throw lastError ?? new Error('Listener endpoint rejected the handoff.')
    }

    await pool.query(
      `
        UPDATE local_handoffs
        SET status = 'delivered',
            delivered_at = $1,
            updated_at = $1
        WHERE id = $2
      `,
      [Date.now(), handoffId],
    )
    await updateListenerLastSeen(input.listener.id)
    return { handoffId }
  } catch (error) {
    await pool.query(
      `
        UPDATE local_handoffs
        SET status = 'failed',
            error_message = $1,
            updated_at = $2
        WHERE id = $3
      `,
      [
        error instanceof Error ? error.message : String(error),
        Date.now(),
        handoffId,
      ],
    )
    throw error
  }
}

export async function registerLocalListenerFromSecret(input: {
  readonly secret: string
  readonly data: RegisterLocalListenerInput
}) {
  const listener = await readListenerBySecret(input.secret)
  if (!listener) {
    throw new Error('Listener secret is not recognized.')
  }

  const pool = requireZeroUpstreamPool()
  const now = Date.now()
  await pool.query(
    `
      UPDATE local_listener_registrations
      SET endpoint_url = $1,
          platform = $2,
          runtime_mode = $3,
          tunnel_provider = $4,
          supported_targets = $5::jsonb,
          status = 'connected',
          last_seen_at = $6,
          updated_at = $6
      WHERE id = $7
    `,
    [
      input.data.endpointUrl,
      input.data.platform,
      input.data.runtimeMode,
      input.data.tunnelProvider ?? null,
      JSON.stringify(input.data.supportedTargets),
      now,
      listener.id,
    ],
  )

  return toListenerSummary({
    ...listener,
    endpoint_url: input.data.endpointUrl,
    platform: input.data.platform,
    runtime_mode: input.data.runtimeMode,
    supported_targets: input.data.supportedTargets,
    status: 'connected',
    last_seen_at: now,
  })
}

export async function dispatchThreadToLocalListener(input: {
  readonly organizationId: string
  readonly requestedByUserId: string
  readonly data: DispatchThreadHandoffInput
}) {
  const listener = await readPrimaryListenerForOrganization(input.organizationId)
  if (!listener || !listener.endpoint_url) {
    throw new Error('Register a local listener endpoint before sending handoffs.')
  }

  const supportedTargets = Array.isArray(listener.supported_targets)
    ? listener.supported_targets
    : []
  if (!supportedTargets.includes(input.data.target)) {
    throw new Error(`The registered listener does not support ${input.data.target}.`)
  }

  const pool = requireZeroUpstreamPool()
  const threadOwnerResult = await pool.query<{ user_id: string }>(
    `
      SELECT user_id
      FROM threads
      WHERE thread_id = $1
        AND owner_org_id = $2
      LIMIT 1
    `,
    [input.data.threadId, input.organizationId],
  )
  const threadOwnerUserId = threadOwnerResult.rows[0]?.user_id?.trim()
  if (!threadOwnerUserId) {
    throw new Error('Thread not found in the active organization.')
  }
  if (threadOwnerUserId !== input.requestedByUserId) {
    throw new Error('Only the chat owner can send this thread to a local listener.')
  }

  const handoff = await buildThreadHandoffMarkdown({
    organizationId: input.organizationId,
    threadId: input.data.threadId,
  })
  await queueAndDeliverLocalHandoff({
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    listener,
    target: input.data.target,
    title: handoff.title,
    handoffMarkdown: handoff.markdown,
    threadId: input.data.threadId,
  })
}

export async function dispatchAdHocExecutionToLocalListener(input: {
  readonly organizationId: string
  readonly requestedByUserId: string
  readonly data: {
    readonly title: string
    readonly target: 'gemini' | 'codex'
    readonly commandText: string
    readonly requestSource: 'manual' | 'voice' | 'chat'
    readonly transcript?: string | null
    readonly approvalRequestId?: string | null
  }
}) {
  const listener = await readPrimaryListenerForOrganization(input.organizationId)
  if (!listener || !listener.endpoint_url) {
    throw new Error('Register a local listener endpoint before sending handoffs.')
  }

  const supportedTargets = Array.isArray(listener.supported_targets)
    ? listener.supported_targets
    : []
  if (!supportedTargets.includes(input.data.target)) {
    throw new Error(`The registered listener does not support ${input.data.target}.`)
  }

  const handoff = buildAdHocExecutionHandoffMarkdown({
    title: input.data.title,
    commandText: input.data.commandText,
    requestSource: input.data.requestSource,
    transcript: input.data.transcript,
  })

  return queueAndDeliverLocalHandoff({
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    listener,
    target: input.data.target,
    title: handoff.title,
    handoffMarkdown: handoff.markdown,
    metadata: {
      source: 'command_center',
      requestSource: input.data.requestSource,
      approvalRequestId: input.data.approvalRequestId ?? null,
      transcriptIncluded:
        typeof input.data.transcript === 'string' &&
        input.data.transcript.trim().length > 0,
    },
  })
}

export async function reportLocalListenerArtifactsFromSecret(input: {
  readonly secret: string
  readonly data: ReportLocalListenerArtifactsInput
}) {
  const listener = await readListenerBySecret(input.secret)
  if (!listener) {
    throw new Error('Listener secret is not recognized.')
  }

  const pool = requireZeroUpstreamPool()
  const handoffResult = await pool.query<{
    id: string
    organization_id: string
    thread_id: string | null
    title: string
    target: string
    requested_by_user_id: string
    metadata: Record<string, unknown> | null
  }>(
    `
      SELECT id, organization_id, thread_id, title, target, requested_by_user_id, metadata
      FROM local_handoffs
      WHERE id = $1
        AND listener_registration_id = $2
      LIMIT 1
    `,
    [input.data.handoffId, listener.id],
  )
  const handoff = handoffResult.rows[0]
  if (!handoff) {
    throw new Error('The referenced handoff does not exist.')
  }

  const now = Date.now()
  await pool.query(
    `
      UPDATE local_handoffs
      SET status = $1,
          completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN $2 ELSE completed_at END,
          error_message = $3,
          metadata = $4::jsonb,
          updated_at = $2
      WHERE id = $5
    `,
    [
      input.data.status,
      now,
      input.data.errorMessage ?? null,
      JSON.stringify({
        ...(handoff.metadata ?? {}),
        repoUrl: input.data.repoUrl ?? null,
        repoBranch: input.data.repoBranch ?? null,
        repoCommitSha: input.data.repoCommitSha ?? null,
        ...(input.data.metadata ?? {}),
      }),
      input.data.handoffId,
    ],
  )

  if (input.data.status === 'completed' || input.data.status === 'failed') {
    await appendLocalListenerThreadMessage({
      organizationId: handoff.organization_id,
      threadId: handoff.thread_id,
      userId: handoff.requested_by_user_id,
      title: handoff.title,
      target: handoff.target,
      status: input.data.status,
      summary:
        input.data.status === 'completed'
          ? 'The local listener run finished and posted its latest artifact metadata back to the workspace.'
          : input.data.errorMessage?.trim() || 'The local listener run exited with a failure status.',
      content: formatLocalListenerThreadUpdate({
        title: handoff.title,
        target: handoff.target,
        status: input.data.status,
        message:
          input.data.status === 'completed'
            ? 'The local listener run finished and posted its latest artifact metadata back to the workspace.'
            : input.data.errorMessage?.trim() || 'The local listener run exited with a failure status.',
        metadata: {
          repoBranch: input.data.repoBranch ?? null,
          repoCommitSha: input.data.repoCommitSha ?? null,
          artifactNames: (input.data.artifacts ?? []).map((artifact) => artifact.displayName),
        },
      }),
    metadata: {
      handoffId: input.data.handoffId,
      status: input.data.status,
      repoBranch: input.data.repoBranch ?? null,
      repoCommitSha: input.data.repoCommitSha ?? null,
      artifactNames: (input.data.artifacts ?? []).map((artifact) => artifact.displayName),
    },
  })
  }

  for (const artifact of input.data.artifacts ?? []) {
    /**
     * Local-listener callbacks should remain durable even when object storage
     * is not configured yet. We still persist the returned markdown artifact so
     * operators have a record of the run, and attach the ingestion error to
     * metadata until storage is wired and backfill can be added later.
     */
    let attachmentId: string | null = null
    let ingestError: string | null = null

    try {
      const ingested = await OrgKnowledgeRuntime.run(
        Effect.gen(function* () {
          const service = yield* OrgKnowledgeAdminService
          return yield* service.ingestKnowledgeTextDocument({
            organizationId: handoff.organization_id,
            userId: handoff.requested_by_user_id,
            fileName: `${artifact.displayName}.md`,
            mimeType: 'text/markdown',
            content: artifact.contentMarkdown,
            sourceLane: 'local_listener_artifact',
            sourceLabel: 'Local Listener Artifact',
            sourceRef: `handoff:${input.data.handoffId}:${artifact.displayName}`,
            sourceMetadata: {
              repoUrl: input.data.repoUrl,
              repoBranch: input.data.repoBranch,
              repoCommitSha: input.data.repoCommitSha,
              artifactType: artifact.artifactType,
              ...(artifact.metadata ?? {}),
            },
            activateOnIngest: true,
          })
        }),
      )
      attachmentId = ingested.attachmentId
    } catch (error) {
      ingestError = error instanceof Error ? error.message : String(error)
    }

    await pool.query(
      `
        INSERT INTO handoff_artifacts (
          id,
          organization_id,
          local_handoff_id,
          attachment_id,
          artifact_type,
          display_name,
          repo_url,
          repo_branch,
          repo_commit_sha,
          content_markdown,
          source_url,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12::jsonb,
          $13,
          $13
        )
      `,
      [
        crypto.randomUUID(),
        handoff.organization_id,
        input.data.handoffId,
        attachmentId,
        artifact.artifactType,
        artifact.displayName,
        input.data.repoUrl ?? null,
        input.data.repoBranch ?? null,
        input.data.repoCommitSha ?? null,
        artifact.contentMarkdown,
        artifact.sourceUrl ?? null,
        JSON.stringify({
          ...(artifact.metadata ?? {}),
          ...(ingestError ? { ingestError } : {}),
        }),
        now,
      ],
    )
  }

  await updateListenerLastSeen(listener.id)
}

export async function reportLocalListenerActivityFromSecret(input: {
  readonly secret: string
  readonly data: ReportLocalListenerActivityInput
}) {
  const listener = await readListenerBySecret(input.secret)
  if (!listener) {
    throw new Error('Listener secret is not recognized.')
  }

  const pool = requireZeroUpstreamPool()
  const handoffResult = await pool.query<{
    id: string
    listener_registration_id: string
    organization_id: string
    thread_id: string | null
    requested_by_user_id: string
    title: string
    target: string
  }>(
    `
      SELECT
        id,
        listener_registration_id,
        organization_id,
        thread_id,
        requested_by_user_id,
        title,
        target
      FROM local_handoffs
      WHERE id = $1
      LIMIT 1
    `,
    [input.data.handoffId],
  )
  const handoff = handoffResult.rows[0]
  if (!handoff) {
    throw new Error('The referenced handoff does not exist.')
  }
  if (handoff.listener_registration_id !== listener.id) {
    throw new Error('The handoff does not belong to this listener.')
  }

  await appendLocalHandoffActivity({
    handoffId: input.data.handoffId,
    nextStatus:
      input.data.kind === 'input_required'
        ? 'waiting_input'
        : input.data.kind === 'resolved'
          ? 'running'
          : undefined,
    activity: {
      id: crypto.randomUUID(),
      kind: input.data.kind,
      message: input.data.message,
      createdAt: Date.now(),
      metadata: input.data.metadata,
    },
  })

  await appendLocalListenerThreadMessage({
    organizationId: handoff.organization_id,
    threadId: handoff.thread_id,
    userId: handoff.requested_by_user_id,
    title: handoff.title,
    target: handoff.target,
    status: 'activity',
    summary: input.data.message,
    activityKind: input.data.kind,
    content: formatLocalListenerThreadUpdate({
      title: handoff.title,
      target: handoff.target,
      status: 'activity',
      message: input.data.message,
    }),
    metadata: {
      handoffId: input.data.handoffId,
      activityKind: input.data.kind,
      ...(input.data.metadata ?? {}),
    },
  })

  await updateListenerLastSeen(listener.id)
}
