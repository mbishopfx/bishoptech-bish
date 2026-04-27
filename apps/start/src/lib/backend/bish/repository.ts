import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import {
  dispatchAdHocExecutionToLocalListener,
  listLocalListenersForOrganization,
  listRecentLocalHandoffsForOrganization,
} from '@/lib/backend/bish/local-listener'
import {
  discoverConnectorSources,
  getConnectorProviderDefinition,
  listConnectorInstallReadiness,
} from '@bish/automation'
import {
  BISH_PROVIDER_LABELS,
  BISH_PROVIDER_SCOPES
} from '@/lib/shared/bish'
import type {
  BishApprovalRequestSummary,
  BishCandidateVariantSummary,
  BishConnectorAccountSummary,
  BishConnectorProvider,
  BishOrgDashboardSnapshot,
  BishOperatorDashboardSnapshot,
  BishSyncJobSummary,
  CreateApprovalRequestInput,
  CreateCandidateVariantInput,
  CreateConnectorAccountInput,
  PromoteCandidateVariantInput,
  ResolveApprovalRequestInput,
  ScheduleConnectorSyncInput,
} from '@/lib/shared/bish'

type ConnectorRow = {
  id: string
  provider: BishConnectorProvider
  display_name: string
  auth_method: string
  status: string
  last_synced_at: number | null
  granted_scope_count: string | number
  scope_count: string | number
  queued_jobs: string | number
}

type SyncJobRow = {
  id: string
  provider: BishConnectorProvider
  display_name: string
  trigger_mode: string
  status: string
  source_type: string | null
  source_ref: string | null
  records_read: string | number
  records_written: string | number
  documents_indexed: string | number
  updated_at: number
  error_message: string | null
}

type ApprovalRow = {
  id: string
  title: string
  approval_type: string
  status: string
  agent_name: string | null
  connector_label: string | null
  request_summary: string | null
  requested_target: string | null
  requested_source: string | null
  transcript_excerpt: string | null
  created_at: number
}

type AgentRow = {
  id: string
  display_name: string
  status: string
  active_version_label: string | null
  approval_mode: string | null
  autonomy_mode: string | null
  connector_write_policy: string | null
  active_candidate_count: string | number
}

type CandidateRow = {
  id: string
  agent_instance_id: string
  agent_name: string
  variant_label: string
  status: string
  score_quality: string | number | null
  score_safety: string | number | null
  score_latency: string | number | null
  score_approval_acceptance: string | number | null
  updated_at: number
}

function now(): number {
  return Date.now()
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function ensureOrgBootstrap(organizationId: string) {
  const pool = requireZeroUpstreamPool()
  const client = await pool.connect()
  const timestamp = now()

  try {
    await client.query('BEGIN')

    const templateResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM agent_templates
        WHERE organization_id = $1
          AND template_key = 'bish-primary'
        LIMIT 1
      `,
      [organizationId],
    )

    let templateId = templateResult.rows[0]?.id ?? null
    if (!templateId) {
      templateId = crypto.randomUUID()
      await client.query(
        `
          INSERT INTO agent_templates (
            id,
            organization_id,
            template_key,
            display_name,
            description,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'bish-primary', 'Primary Template', $3, $4, $4)
        `,
        [
          templateId,
          organizationId,
          'Read-first autonomous assistant tuned for SMB operations, CRM context, and approval-gated actions.',
          timestamp,
        ],
      )
    }

    const instanceResult = await client.query<{ id: string, active_version_id: string | null }>(
      `
        SELECT id, active_version_id
        FROM agent_instances
        WHERE organization_id = $1
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [organizationId],
    )

    let agentInstanceId = instanceResult.rows[0]?.id ?? null
    let activeVersionId = instanceResult.rows[0]?.active_version_id ?? null

    if (!agentInstanceId) {
      agentInstanceId = crypto.randomUUID()
      activeVersionId = crypto.randomUUID()

      await client.query(
        `
          INSERT INTO agent_instances (
            id,
            organization_id,
            agent_template_id,
            display_name,
            status,
            active_version_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 'Front Desk', 'active', $4, $5, $5)
        `,
        [agentInstanceId, organizationId, templateId, activeVersionId, timestamp],
      )

      await client.query(
        `
          INSERT INTO agent_versions (
            id,
            organization_id,
            agent_instance_id,
            version_label,
            system_prompt,
            retrieval_settings,
            escalation_rules,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            'baseline',
            $4,
            '{"maxSources": 12, "freshnessBias": "recent"}'::jsonb,
            '{"handoff": "approval_required"}'::jsonb,
            'active',
            $5,
            $5
          )
        `,
        [
          activeVersionId,
          organizationId,
          agentInstanceId,
          'You are an operations-first assistant for a small business. Read broadly from connected systems, draft high-quality actions, and require approval before any external write.',
          timestamp,
        ],
      )

      await client.query(
        `
          INSERT INTO agent_policies (
            id,
            organization_id,
            agent_instance_id,
            approval_mode,
            autonomy_mode,
            connector_write_policy,
            metadata,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            'approval_required',
            'read_first',
            'approval_required',
            '{"default": true}'::jsonb,
            $4,
            $4
          )
        `,
        [crypto.randomUUID(), organizationId, agentInstanceId, timestamp],
      )

      for (const toolKey of [
        'google_workspace',
        'asana',
        'hubspot',
        'gmail.send',
        'calendar.write',
        'crm.update',
      ]) {
        await client.query(
          `
            INSERT INTO tool_policies (
              id,
              organization_id,
              agent_instance_id,
              tool_key,
              access_mode,
              metadata,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, 'approval_required', '{}'::jsonb, $5, $5)
          `,
          [crypto.randomUUID(), organizationId, agentInstanceId, toolKey, timestamp],
        )
      }

      await client.query(
        `
          INSERT INTO evaluation_datasets (
            id,
            organization_id,
            display_name,
            description,
            sample_count,
            metadata,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            'Starter SMB Eval Set',
            'Seed evaluation set for support, scheduling, CRM, and knowledge lookups.',
            12,
            '{"seeded": true}'::jsonb,
            $3,
            $3
          )
          ON CONFLICT DO NOTHING
        `,
        [crypto.randomUUID(), organizationId, timestamp],
      )

      await client.query(
        `
          INSERT INTO champion_variants (
            id,
            organization_id,
            agent_instance_id,
            candidate_variant_id,
            status,
            promoted_at,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, NULL, 'baseline', $4, $4, $4)
        `,
        [crypto.randomUUID(), organizationId, agentInstanceId, timestamp],
      )
    }

    await client.query('COMMIT')
    return { agentInstanceId, activeVersionId }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function seedConnectorSources(input: {
  organizationId: string
  connectorAccountId: string
  provider: BishConnectorProvider
}) {
  const pool = requireZeroUpstreamPool()
  const timestamp = now()

  for (const source of discoverConnectorSources(input.provider)) {
    await pool.query(
      `
        INSERT INTO knowledge_sources (
          id,
          organization_id,
          connector_account_id,
          source_type,
          external_source_id,
          display_name,
          status,
          sync_policy,
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
          'configured',
          '{"mode": "scheduled_plus_manual"}'::jsonb,
          '{}'::jsonb,
          $7,
          $7
        )
        ON CONFLICT (organization_id, connector_account_id, source_type) DO UPDATE SET
          external_source_id = EXCLUDED.external_source_id,
          display_name = EXCLUDED.display_name,
          updated_at = EXCLUDED.updated_at
      `,
      [
        crypto.randomUUID(),
        input.organizationId,
        input.connectorAccountId,
        source.sourceType,
        `${input.provider}:${source.sourceType}`,
        source.displayName,
        timestamp,
      ],
    )
  }
}

export async function createConnectorAccountForOrganization(
  organizationId: string,
  input: CreateConnectorAccountInput,
) {
  await ensureOrgBootstrap(organizationId)
  const pool = requireZeroUpstreamPool()
  const accountId = crypto.randomUUID()
  const timestamp = now()
  const providerLabel = BISH_PROVIDER_LABELS[input.provider]
  const displayName = input.displayName?.trim() || `${providerLabel} Connector`
  const providerDefinition = getConnectorProviderDefinition(input.provider)
  const readiness = listConnectorInstallReadiness(process.env).find(
    (entry) => entry.provider === input.provider,
  )
  const authMethod = providerDefinition.authMethod

  await pool.query(
    `
      INSERT INTO connector_accounts (
        id,
        organization_id,
        provider,
        auth_method,
        status,
        external_account_id,
        display_name,
        scope_status,
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
        NULL,
        $6,
        '{"granted": false}'::jsonb,
        $7::jsonb,
        $8,
        $8
      )
    `,
    [
      accountId,
      organizationId,
      input.provider,
      authMethod,
      readiness?.configured ? 'needs_auth' : 'config_required',
      displayName,
      JSON.stringify({
        seeded: true,
        missingEnv: readiness?.missingEnv ?? [],
        requiredEnv: readiness?.requiredEnv ?? [],
        supportedSources: providerDefinition.supportedSources.map((source) => source.sourceType),
      }),
      timestamp,
    ],
  )

  for (const scope of BISH_PROVIDER_SCOPES[input.provider]) {
    await pool.query(
      `
        INSERT INTO connector_scopes (
          id,
          connector_account_id,
          scope_key,
          scope_label,
          granted,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, false, $5, $5)
      `,
      [crypto.randomUUID(), accountId, scope.key, scope.label, timestamp],
    )
  }

  await seedConnectorSources({
    organizationId,
    connectorAccountId: accountId,
    provider: input.provider,
  })

  return accountId
}

export async function scheduleConnectorSyncForOrganization(
  organizationId: string,
  input: ScheduleConnectorSyncInput,
) {
  const pool = requireZeroUpstreamPool()
  const timestamp = now()

  /**
   * Multi-tenant + integrity guard:
   * Connector sync jobs reference `connector_accounts(id)` via FK but the schema
   * does not enforce that `connector_sync_jobs.organization_id` matches the
   * connector's owning org. Without this check, a malicious/buggy client could
   * enqueue a job that no worker will ever claim (worker requires org match),
   * leaving a queued job stuck forever and polluting operator metrics.
   */
  const connectorResult = await pool.query<{ status: string }>(
    `
      SELECT status
      FROM connector_accounts
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [input.connectorAccountId, organizationId],
  )
  const connector = connectorResult.rows[0] ?? null
  if (!connector) {
    throw new Error('Connector account not found.')
  }

  if (connector.status !== 'connected') {
    throw new Error(
      `Connector account must be connected before scheduling a sync (current status: ${connector.status}).`,
    )
  }

  const insertResult = await pool.query<{ id: string }>(
    `
      INSERT INTO connector_sync_jobs (
        id,
        organization_id,
        connector_account_id,
        source_ref,
        source_type,
        trigger_mode,
        status,
        next_run_at,
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
        '{}'::jsonb,
        $7,
        $7
      )
      -- Safety: prevent duplicate active jobs if a manual trigger races with the scheduler
      -- or with another manual trigger. The conflict target matches the partial unique
      -- index on (connector_account_id) for queued/running jobs.
      ON CONFLICT (connector_account_id) WHERE status IN ('queued', 'running') DO NOTHING
      RETURNING id
    `,
    [
      crypto.randomUUID(),
      organizationId,
      input.connectorAccountId,
      input.sourceRef ?? null,
      input.sourceType ?? null,
      input.triggerMode,
      timestamp,
    ],
  )

  const insertedId = insertResult.rows[0]?.id ?? null
  if (insertedId) return insertedId

  const existingResult = await pool.query<{ id: string }>(
    `
      SELECT csj.id
      FROM connector_sync_jobs csj
      WHERE csj.organization_id = $1
        AND csj.connector_account_id = $2
        AND csj.status IN ('queued', 'running')
      ORDER BY
        CASE WHEN csj.status = 'running' THEN 0 ELSE 1 END,
        csj.created_at ASC
      LIMIT 1
    `,
    [organizationId, input.connectorAccountId],
  )

  return existingResult.rows[0]?.id ?? null
}

export async function createApprovalRequestForOrganization(
  organizationId: string,
  requestedByUserId: string,
  input: CreateApprovalRequestInput,
) {
  const { agentInstanceId } = await ensureOrgBootstrap(organizationId)
  const pool = requireZeroUpstreamPool()
  const timestamp = now()
  const targetAgentId = input.agentInstanceId ?? agentInstanceId

  const proposedAction = {
    connectorAccountId: input.connectorAccountId ?? null,
    summary: input.requestSummary?.trim() || input.title,
    requestSource: input.requestSource ?? null,
    target: input.executionTarget ?? null,
    commandText: input.commandText?.trim() ?? null,
    transcript: input.transcript?.trim() ?? null,
  }

  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO approval_requests (
        id,
        organization_id,
        agent_instance_id,
        requested_by_user_id,
        approval_type,
        title,
        proposed_action,
        status,
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
        $7::jsonb,
        'pending',
        $8,
        $8
      )
      RETURNING id
    `,
    [
      crypto.randomUUID(),
      organizationId,
      targetAgentId,
      requestedByUserId,
      input.approvalType,
      input.title,
      JSON.stringify(proposedAction),
      timestamp,
    ],
  )

  return result.rows[0]?.id ?? null
}

export async function resolveApprovalRequestForOrganization(
  organizationId: string,
  decidedByUserId: string,
  input: ResolveApprovalRequestInput,
) {
  const pool = requireZeroUpstreamPool()
  const timestamp = now()
  const status = input.decision

  const approvalResult = await pool.query<{
    id: string
    title: string
    approval_type: string
    requested_by_user_id: string
    proposed_action: Record<string, unknown>
  }>(
    `
      UPDATE approval_requests
      SET status = $1,
          decided_by_user_id = $2,
          decision_reason = $3,
          decided_at = $4,
          updated_at = $4
      WHERE id = $5
        AND organization_id = $6
      RETURNING id, title, approval_type, requested_by_user_id, proposed_action
    `,
    [
      status,
      decidedByUserId,
      input.reason ?? null,
      timestamp,
      input.approvalRequestId,
      organizationId,
    ],
  )

  if (status === 'approved' && approvalResult.rows[0]) {
    const approval = approvalResult.rows[0]
    let executionType = 'approved_action'
    let executionStatus = 'queued'
    let responsePayload: Record<string, unknown> = {}

    if (approval.approval_type === 'local_execution') {
      executionType = 'local_listener_handoff'

      try {
        const target =
          approval.proposed_action?.target === 'gemini' ||
          approval.proposed_action?.target === 'codex'
            ? approval.proposed_action.target
            : null
        const requestSource =
          approval.proposed_action?.requestSource === 'manual' ||
          approval.proposed_action?.requestSource === 'voice' ||
          approval.proposed_action?.requestSource === 'chat'
            ? approval.proposed_action.requestSource
            : null
        const commandText =
          typeof approval.proposed_action?.commandText === 'string'
            ? approval.proposed_action.commandText.trim()
            : ''
        const transcript =
          typeof approval.proposed_action?.transcript === 'string'
            ? approval.proposed_action.transcript.trim()
            : null

        if (!target || !requestSource || commandText.length === 0) {
          throw new Error(
            'The approved execution request is missing target, source, or command text.',
          )
        }

        const dispatchResult = await dispatchAdHocExecutionToLocalListener({
          organizationId,
          requestedByUserId: approval.requested_by_user_id,
          data: {
            title: approval.title,
            target,
            commandText,
            requestSource,
            transcript,
            approvalRequestId: approval.id,
          },
        })

        responsePayload = {
          handoffId: dispatchResult.handoffId,
          dispatch: 'queued_to_listener',
        }
      } catch (error) {
        executionStatus = 'failed'
        responsePayload = {
          dispatch: 'listener_failed',
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    await pool.query(
      `
        INSERT INTO action_executions (
          id,
          organization_id,
          approval_request_id,
          agent_run_id,
          connector_account_id,
          execution_type,
          status,
          request_payload,
          response_payload,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          NULL,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8::jsonb,
          $9,
          $9
        )
      `,
      [
        crypto.randomUUID(),
        organizationId,
        input.approvalRequestId,
        typeof approval.proposed_action?.connectorAccountId === 'string'
          ? approval.proposed_action.connectorAccountId
          : null,
        executionType,
        executionStatus,
        JSON.stringify(approval.proposed_action ?? {}),
        JSON.stringify(responsePayload),
        timestamp,
      ],
    )
  }
}

export async function createCandidateVariantForOrganization(
  organizationId: string,
  input: CreateCandidateVariantInput,
) {
  const pool = requireZeroUpstreamPool()
  const timestamp = now()

  const versionResult = await pool.query<{
    id: string
    system_prompt: string
    retrieval_settings: Record<string, unknown>
    escalation_rules: Record<string, unknown>
  }>(
    `
      SELECT
        av.id,
        av.system_prompt,
        av.retrieval_settings,
        av.escalation_rules
      FROM agent_instances ai
      JOIN agent_versions av
        ON av.id = ai.active_version_id
      WHERE ai.id = $1
        AND ai.organization_id = $2
      LIMIT 1
    `,
    [input.agentInstanceId, organizationId],
  )

  const activeVersion = versionResult.rows[0]
  if (!activeVersion) {
    throw new Error('Active agent version not found for candidate creation.')
  }

  const candidateId = crypto.randomUUID()
  await pool.query(
    `
      INSERT INTO candidate_variants (
        id,
        organization_id,
        agent_instance_id,
        parent_version_id,
        variant_label,
        system_prompt,
        retrieval_settings,
        tool_permissions,
        escalation_rules,
        approval_policy,
        status,
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
        $7::jsonb,
        '{"google_workspace":"approval_required","asana":"approval_required","hubspot":"approval_required"}'::jsonb,
        $8::jsonb,
        '{"mode":"approval_required"}'::jsonb,
        'candidate',
        $9,
        $9
      )
    `,
    [
      candidateId,
      organizationId,
      input.agentInstanceId,
      activeVersion.id,
      input.variantLabel,
      `${activeVersion.system_prompt}\n\nEvolution note: test a more proactive retrieval and summarization strategy while preserving approval gating.`,
      JSON.stringify(activeVersion.retrieval_settings ?? {}),
      JSON.stringify(activeVersion.escalation_rules ?? {}),
      timestamp,
    ],
  )

  await pool.query(
    `
      INSERT INTO evaluation_runs (
        id,
        organization_id,
        agent_instance_id,
        candidate_variant_id,
        evaluation_dataset_id,
        status,
        summary,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        (
          SELECT id
          FROM evaluation_datasets
          WHERE organization_id = $2
          ORDER BY created_at ASC
          LIMIT 1
        ),
        'queued',
        '{"origin":"candidate_variant_create"}'::jsonb,
        $5,
        $5
      )
    `,
    [crypto.randomUUID(), organizationId, input.agentInstanceId, candidateId, timestamp],
  )

  return candidateId
}

export async function promoteCandidateVariantForOrganization(
  organizationId: string,
  promotedByUserId: string,
  input: PromoteCandidateVariantInput,
) {
  const pool = requireZeroUpstreamPool()
  const timestamp = now()
  const candidateResult = await pool.query<{
    id: string
    agent_instance_id: string
  }>(
    `
      UPDATE candidate_variants
      SET status = 'candidate_champion',
          updated_at = $1
      WHERE id = $2
        AND organization_id = $3
      RETURNING id, agent_instance_id
    `,
    [timestamp, input.candidateVariantId, organizationId],
  )

  const candidate = candidateResult.rows[0]
  if (!candidate) {
    throw new Error('Candidate variant not found.')
  }

  await pool.query(
    `
      INSERT INTO champion_variants (
        id,
        organization_id,
        agent_instance_id,
        candidate_variant_id,
        status,
        promoted_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'candidate_champion', $5, $5, $5)
      ON CONFLICT (agent_instance_id) DO UPDATE SET
        candidate_variant_id = EXCLUDED.candidate_variant_id,
        status = EXCLUDED.status,
        promoted_at = EXCLUDED.promoted_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      crypto.randomUUID(),
      organizationId,
      candidate.agent_instance_id,
      candidate.id,
      timestamp,
    ],
  )

  await pool.query(
    `
      INSERT INTO promotion_events (
        id,
        organization_id,
        agent_instance_id,
        candidate_variant_id,
        promoted_by_user_id,
        event_type,
        summary,
        metadata,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'staged_candidate_champion',
        'Candidate promoted to staged champion pending production approval.',
        '{}'::jsonb,
        $6
      )
    `,
    [
      crypto.randomUUID(),
      organizationId,
      candidate.agent_instance_id,
      candidate.id,
      promotedByUserId,
      timestamp,
    ],
  )
}

export async function getOrganizationControlPlaneSnapshot(
  organizationId: string,
): Promise<BishOrgDashboardSnapshot> {
  await ensureOrgBootstrap(organizationId)
  const pool = requireZeroUpstreamPool()

  const [connectorsResult, jobsResult, approvalsResult, agentsResult, candidatesResult, statsResult, listeners, handoffs] =
    await Promise.all([
      pool.query<ConnectorRow>(
        `
          SELECT
            ca.id,
            ca.provider,
            ca.display_name,
            ca.auth_method,
            ca.status,
            ca.last_synced_at,
            COALESCE(SUM(CASE WHEN cs.granted THEN 1 ELSE 0 END), 0) AS granted_scope_count,
            COUNT(cs.id) AS scope_count,
            COALESCE((
              SELECT COUNT(*)
              FROM connector_sync_jobs csj
              WHERE csj.connector_account_id = ca.id
                AND csj.status IN ('queued', 'running')
            ), 0) AS queued_jobs
          FROM connector_accounts ca
          LEFT JOIN connector_scopes cs
            ON cs.connector_account_id = ca.id
          WHERE ca.organization_id = $1
          GROUP BY ca.id
          ORDER BY ca.updated_at DESC
        `,
        [organizationId],
      ),
      pool.query<SyncJobRow>(
        `
          SELECT
            csj.id,
            ca.provider,
            ca.display_name,
            csj.trigger_mode,
            csj.status,
            csj.source_type,
            csj.source_ref,
            csj.records_read,
            csj.records_written,
            csj.documents_indexed,
            csj.updated_at,
            csj.error_message
          FROM connector_sync_jobs csj
          JOIN connector_accounts ca
            ON ca.id = csj.connector_account_id
          WHERE csj.organization_id = $1
          ORDER BY csj.updated_at DESC
          LIMIT 12
        `,
        [organizationId],
      ),
      pool.query<ApprovalRow>(
        `
          SELECT
            ar.id,
            ar.title,
            ar.approval_type,
            ar.status,
            ai.display_name AS agent_name,
            ca.display_name AS connector_label,
            ar.proposed_action->>'summary' AS request_summary,
            ar.proposed_action->>'target' AS requested_target,
            ar.proposed_action->>'requestSource' AS requested_source,
            LEFT(COALESCE(ar.proposed_action->>'transcript', ar.proposed_action->>'commandText', ''), 220) AS transcript_excerpt,
            ar.created_at
          FROM approval_requests ar
          LEFT JOIN agent_instances ai
            ON ai.id = ar.agent_instance_id
          LEFT JOIN connector_accounts ca
            ON ca.id = (ar.proposed_action->>'connectorAccountId')
          WHERE ar.organization_id = $1
          ORDER BY ar.updated_at DESC
          LIMIT 12
        `,
        [organizationId],
      ),
      pool.query<AgentRow>(
        `
          SELECT
            ai.id,
            ai.display_name,
            ai.status,
            av.version_label AS active_version_label,
            ap.approval_mode,
            ap.autonomy_mode,
            ap.connector_write_policy,
            COALESCE((
              SELECT COUNT(*)
              FROM candidate_variants cv
              WHERE cv.agent_instance_id = ai.id
                AND cv.status IN ('candidate', 'candidate_champion')
            ), 0) AS active_candidate_count
          FROM agent_instances ai
          LEFT JOIN agent_versions av
            ON av.id = ai.active_version_id
          LEFT JOIN agent_policies ap
            ON ap.agent_instance_id = ai.id
          WHERE ai.organization_id = $1
          ORDER BY ai.updated_at DESC
        `,
        [organizationId],
      ),
      pool.query<CandidateRow>(
        `
          SELECT
            cv.id,
            cv.agent_instance_id,
            ai.display_name AS agent_name,
            cv.variant_label,
            cv.status,
            cv.score_quality,
            cv.score_safety,
            cv.score_latency,
            cv.score_approval_acceptance,
            cv.updated_at
          FROM candidate_variants cv
          JOIN agent_instances ai
            ON ai.id = cv.agent_instance_id
          WHERE cv.organization_id = $1
          ORDER BY cv.updated_at DESC
          LIMIT 12
        `,
        [organizationId],
      ),
      pool.query<{
        connector_count: string | number
        pending_approval_count: string | number
        queued_sync_count: string | number
        agent_count: string | number
        candidate_count: string | number
        indexed_document_count: string | number
      }>(
        `
          SELECT
            (SELECT COUNT(*) FROM connector_accounts WHERE organization_id = $1) AS connector_count,
            (SELECT COUNT(*) FROM approval_requests WHERE organization_id = $1 AND status = 'pending') AS pending_approval_count,
            (SELECT COUNT(*) FROM connector_sync_jobs WHERE organization_id = $1 AND status IN ('queued', 'running')) AS queued_sync_count,
            (SELECT COUNT(*) FROM agent_instances WHERE organization_id = $1) AS agent_count,
            (SELECT COUNT(*) FROM candidate_variants WHERE organization_id = $1) AS candidate_count,
            (SELECT COUNT(*) FROM knowledge_document_versions WHERE organization_id = $1 AND ingest_status = 'indexed') AS indexed_document_count
        `,
        [organizationId],
      ),
      listLocalListenersForOrganization(organizationId),
      listRecentLocalHandoffsForOrganization(organizationId),
    ])

  const stats = statsResult.rows[0]

  return {
    organizationId,
    providerSetup: listConnectorInstallReadiness(process.env),
    stats: {
      connectorCount: toNumber(stats?.connector_count),
      pendingApprovalCount: toNumber(stats?.pending_approval_count),
      queuedSyncCount: toNumber(stats?.queued_sync_count),
      agentCount: toNumber(stats?.agent_count),
      candidateCount: toNumber(stats?.candidate_count),
      indexedDocumentCount: toNumber(stats?.indexed_document_count),
    },
    connectors: connectorsResult.rows.map(
      (row): BishConnectorAccountSummary => ({
        id: row.id,
        provider: row.provider,
        displayName: row.display_name,
        authMethod: row.auth_method,
        status: row.status,
        lastSyncedAt: row.last_synced_at,
        grantedScopeCount: toNumber(row.granted_scope_count),
        scopeCount: toNumber(row.scope_count),
        queuedJobs: toNumber(row.queued_jobs),
      }),
    ),
    jobs: jobsResult.rows.map(
      (row): BishSyncJobSummary => ({
        id: row.id,
        provider: row.provider,
        displayName: row.display_name,
        triggerMode: row.trigger_mode,
        status: row.status,
        sourceType: row.source_type,
        sourceRef: row.source_ref,
        recordsRead: toNumber(row.records_read),
        recordsWritten: toNumber(row.records_written),
        documentsIndexed: toNumber(row.documents_indexed),
        updatedAt: row.updated_at,
        errorMessage: row.error_message,
      }),
    ),
    approvals: approvalsResult.rows.map(
      (row): BishApprovalRequestSummary => ({
        id: row.id,
        title: row.title,
        approvalType: row.approval_type,
        status: row.status,
        agentName: row.agent_name,
        connectorLabel: row.connector_label,
        requestSummary: row.request_summary,
        requestedTarget: row.requested_target,
        requestedSource: row.requested_source,
        transcriptExcerpt: row.transcript_excerpt,
        createdAt: row.created_at,
      }),
    ),
    agents: agentsResult.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      status: row.status,
      activeVersionLabel: row.active_version_label,
      approvalMode: row.approval_mode,
      autonomyMode: row.autonomy_mode,
      connectorWritePolicy: row.connector_write_policy,
      activeCandidateCount: toNumber(row.active_candidate_count),
    })),
    candidates: candidatesResult.rows.map(
      (row): BishCandidateVariantSummary => ({
        id: row.id,
        agentInstanceId: row.agent_instance_id,
        agentName: row.agent_name,
        variantLabel: row.variant_label,
        status: row.status,
        scoreQuality: toNullableNumber(row.score_quality),
        scoreSafety: toNullableNumber(row.score_safety),
        scoreLatency: toNullableNumber(row.score_latency),
        scoreApprovalAcceptance: toNullableNumber(row.score_approval_acceptance),
        updatedAt: row.updated_at,
      }),
    ),
    listeners,
    handoffs,
  }
}

export async function getOperatorControlPlaneSnapshot(): Promise<BishOperatorDashboardSnapshot> {
  const pool = requireZeroUpstreamPool()
  const [organizationsResult, failuresResult] = await Promise.all([
    pool.query<{
      organization_id: string
      organization_name: string
      connector_count: string | number
      pending_approval_count: string | number
      queued_sync_count: string | number
      active_agent_count: string | number
      indexed_document_count: string | number
    }>(
      `
        SELECT
          o.id AS organization_id,
          o.name AS organization_name,
          COALESCE((SELECT COUNT(*) FROM connector_accounts ca WHERE ca.organization_id = o.id), 0) AS connector_count,
          COALESCE((SELECT COUNT(*) FROM approval_requests ar WHERE ar.organization_id = o.id AND ar.status = 'pending'), 0) AS pending_approval_count,
          COALESCE((SELECT COUNT(*) FROM connector_sync_jobs csj WHERE csj.organization_id = o.id AND csj.status IN ('queued', 'running')), 0) AS queued_sync_count,
          COALESCE((SELECT COUNT(*) FROM agent_instances ai WHERE ai.organization_id = o.id AND ai.status = 'active'), 0) AS active_agent_count,
          COALESCE((SELECT COUNT(*) FROM knowledge_document_versions kdv WHERE kdv.organization_id = o.id AND kdv.ingest_status = 'indexed'), 0) AS indexed_document_count
        FROM organization o
        ORDER BY o.name ASC
      `,
    ),
    pool.query<{
      id: string
      organization_name: string
      provider: string | null
      code: string
      message: string
      created_at: number
    }>(
      `
        SELECT
          cf.id,
          o.name AS organization_name,
          ca.provider,
          cf.code,
          cf.message,
          cf.created_at
        FROM connector_failures cf
        LEFT JOIN organization o
          ON o.id = cf.organization_id
        LEFT JOIN connector_accounts ca
          ON ca.id = cf.connector_account_id
        ORDER BY cf.created_at DESC
        LIMIT 12
      `,
    ),
  ])

  return {
    organizations: organizationsResult.rows.map((row) => ({
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      connectorCount: toNumber(row.connector_count),
      pendingApprovalCount: toNumber(row.pending_approval_count),
      queuedSyncCount: toNumber(row.queued_sync_count),
      activeAgentCount: toNumber(row.active_agent_count),
      indexedDocumentCount: toNumber(row.indexed_document_count),
    })),
    recentFailures: failuresResult.rows.map((row) => ({
      id: row.id,
      organizationName: row.organization_name,
      provider: row.provider,
      code: row.code,
      message: row.message,
      createdAt: row.created_at,
    })),
  }
}
