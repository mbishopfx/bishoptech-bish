import { createHash } from 'node:crypto'
import {
  buildDeterministicEmbedding,
  chunkText,
  createConnectorAdapter,
  getConnectorInstallReadiness,
  type BishConnectorProvider,
  type BishConnectorSyncRecord,
  toVectorLiteral,
} from '@bish/automation'
import { Pool } from 'pg'

function getConnectionString() {
  return (
    process.env.ZERO_UPSTREAM_DB
    || process.env.DATABASE_URL
    || process.env.DATABASE_PUBLIC_URL
    || process.env.POSTGRES_URL
  )
}

const connectionString = getConnectionString()
if (!connectionString) {
  throw new Error('Missing ZERO_UPSTREAM_DB or DATABASE_URL for bish-worker.')
}

const pool = new Pool({ connectionString, applicationName: 'bish-worker' })
const loopDelayMs = Number(process.env.BISH_WORKER_POLL_MS ?? 4_000)

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function scoreFromSeed(seed: string, min: number, max: number) {
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 8)
  const value = Number.parseInt(hash, 16) / 0xffffffff
  return Number((min + value * (max - min)).toFixed(4))
}

async function claimSyncJob() {
  const result = await pool.query<{
    id: string
    organization_id: string
    connector_account_id: string
    provider: BishConnectorProvider
    source_type: string | null
    source_ref: string | null
  }>(
    `
      WITH next_job AS (
        SELECT
          csj.id,
          csj.organization_id,
          csj.connector_account_id,
          csj.source_type,
          csj.source_ref,
          ca.provider
        FROM connector_sync_jobs csj
        JOIN connector_accounts ca
          ON ca.id = csj.connector_account_id
        WHERE csj.status = 'queued'
        ORDER BY csj.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE connector_sync_jobs csj
      SET status = 'running',
          started_at = $1,
          updated_at = $1
      FROM next_job
      WHERE csj.id = next_job.id
      RETURNING
        csj.id,
        csj.organization_id,
        csj.connector_account_id,
        next_job.provider,
        next_job.source_type,
        next_job.source_ref
    `,
    [Date.now()],
  )

  return result.rows[0] ?? null
}

async function readCursor(input: {
  organizationId: string
  connectorAccountId: string
  sourceType: string
  sourceRef: string
}) {
  const result = await pool.query<{ cursor_value: string | null }>(
    `
      SELECT cursor_value
      FROM connector_cursors
      WHERE organization_id = $1
        AND connector_account_id = $2
        AND source_type = $3
        AND source_ref = $4
      LIMIT 1
    `,
    [
      input.organizationId,
      input.connectorAccountId,
      input.sourceType,
      input.sourceRef,
    ],
  )

  return result.rows[0]?.cursor_value ?? null
}

async function upsertCursor(input: {
  organizationId: string
  connectorAccountId: string
  sourceType: string
  sourceRef: string
  cursorValue: string
  timestamp: number
}) {
  await pool.query(
    `
      INSERT INTO connector_cursors (
        id,
        organization_id,
        connector_account_id,
        source_ref,
        source_type,
        cursor_value,
        cursor_version,
        last_seen_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $7, $7)
      ON CONFLICT (connector_account_id, source_ref, source_type) DO UPDATE SET
        cursor_value = EXCLUDED.cursor_value,
        cursor_version = connector_cursors.cursor_version + 1,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.connectorAccountId,
      input.sourceRef,
      input.sourceType,
      input.cursorValue,
      input.timestamp,
    ],
  )
}

async function recordConnectorFailure(input: {
  organizationId: string
  connectorAccountId: string
  syncJobId: string
  code: string
  message: string
  details: Record<string, unknown>
}) {
  await pool.query(
    `
      INSERT INTO connector_failures (
        id,
        organization_id,
        connector_account_id,
        sync_job_id,
        code,
        message,
        details,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.connectorAccountId,
      input.syncJobId,
      input.code,
      input.message,
      JSON.stringify(input.details),
      Date.now(),
    ],
  )
}

async function ensureKnowledgeSource(input: {
  organizationId: string
  connectorAccountId: string
  sourceType: string
  sourceRef: string
}) {
  const existing = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM knowledge_sources
      WHERE organization_id = $1
        AND connector_account_id = $2
        AND source_type = $3
      LIMIT 1
    `,
    [input.organizationId, input.connectorAccountId, input.sourceType],
  )

  if (existing.rows[0]?.id) {
    return existing.rows[0].id
  }

  const id = crypto.randomUUID()
  const timestamp = Date.now()
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
        '{"mode":"scheduled_plus_manual"}'::jsonb,
        '{}'::jsonb,
        $7,
        $7
      )
    `,
    [
      id,
      input.organizationId,
      input.connectorAccountId,
      input.sourceType,
      input.sourceRef,
      input.sourceType.replaceAll('_', ' '),
      timestamp,
    ],
  )

  return id
}

async function upsertRawConnectorRecord(input: {
  organizationId: string
  connectorAccountId: string
  record: BishConnectorSyncRecord
}) {
  await pool.query(
    `
      INSERT INTO raw_connector_records (
        id,
        organization_id,
        connector_account_id,
        source_type,
        external_id,
        payload,
        source_updated_at,
        captured_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      ON CONFLICT (connector_account_id, source_type, external_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        source_updated_at = EXCLUDED.source_updated_at,
        captured_at = EXCLUDED.captured_at
    `,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.connectorAccountId,
      input.record.sourceType,
      input.record.externalId,
      JSON.stringify(input.record.payload),
      input.record.updatedAt,
      Date.now(),
    ],
  )
}

async function findCrmContactId(input: {
  organizationId: string
  connectorAccountId: string
  externalContactId: string
}) {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM crm_contacts
      WHERE organization_id = $1
        AND connector_account_id = $2
        AND external_contact_id = $3
      LIMIT 1
    `,
    [input.organizationId, input.connectorAccountId, input.externalContactId],
  )

  return result.rows[0]?.id ?? null
}

async function findCrmCompanyId(input: {
  organizationId: string
  connectorAccountId: string
  externalCompanyId: string
}) {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM crm_companies
      WHERE organization_id = $1
        AND connector_account_id = $2
        AND external_company_id = $3
      LIMIT 1
    `,
    [input.organizationId, input.connectorAccountId, input.externalCompanyId],
  )

  return result.rows[0]?.id ?? null
}

async function findCrmDealId(input: {
  organizationId: string
  connectorAccountId: string
  externalDealId: string
}) {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM crm_deals
      WHERE organization_id = $1
        AND connector_account_id = $2
        AND external_deal_id = $3
      LIMIT 1
    `,
    [input.organizationId, input.connectorAccountId, input.externalDealId],
  )

  return result.rows[0]?.id ?? null
}

async function upsertCrmProjection(input: {
  organizationId: string
  connectorAccountId: string
  record: BishConnectorSyncRecord
}) {
  const payload = input.record.payload
  const timestamp = Date.now()

  if (input.record.crmObjectType === 'contact') {
    await pool.query(
      `
        INSERT INTO crm_contacts (
          id,
          organization_id,
          connector_account_id,
          external_contact_id,
          full_name,
          email,
          phone,
          lifecycle_stage,
          metadata,
          source_updated_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $11)
        ON CONFLICT (organization_id, connector_account_id, external_contact_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          lifecycle_stage = EXCLUDED.lifecycle_stage,
          metadata = EXCLUDED.metadata,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        crypto.randomUUID(),
        input.organizationId,
        input.connectorAccountId,
        input.record.externalId,
        String(payload.fullName ?? input.record.title),
        typeof payload.email === 'string' ? payload.email : null,
        typeof payload.phone === 'string' ? payload.phone : null,
        typeof payload.lifecycleStage === 'string' ? payload.lifecycleStage : null,
        JSON.stringify(input.record.metadata),
        input.record.updatedAt,
        timestamp,
      ],
    )
    return
  }

  if (input.record.crmObjectType === 'company') {
    await pool.query(
      `
        INSERT INTO crm_companies (
          id,
          organization_id,
          connector_account_id,
          external_company_id,
          company_name,
          website,
          industry,
          metadata,
          source_updated_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $10)
        ON CONFLICT (organization_id, connector_account_id, external_company_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          website = EXCLUDED.website,
          industry = EXCLUDED.industry,
          metadata = EXCLUDED.metadata,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        crypto.randomUUID(),
        input.organizationId,
        input.connectorAccountId,
        input.record.externalId,
        String(payload.companyName ?? input.record.title),
        typeof payload.website === 'string' ? payload.website : null,
        typeof payload.industry === 'string' ? payload.industry : null,
        JSON.stringify(input.record.metadata),
        input.record.updatedAt,
        timestamp,
      ],
    )
    return
  }

  if (input.record.crmObjectType === 'deal') {
    const contactId =
      typeof payload.contactExternalId === 'string'
        ? await findCrmContactId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalContactId: payload.contactExternalId,
          })
        : null
    const companyId =
      typeof payload.companyExternalId === 'string'
        ? await findCrmCompanyId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalCompanyId: payload.companyExternalId,
          })
        : null

    await pool.query(
      `
        INSERT INTO crm_deals (
          id,
          organization_id,
          connector_account_id,
          external_deal_id,
          company_id,
          contact_id,
          deal_name,
          stage,
          amount,
          currency,
          metadata,
          source_updated_at,
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
          $11::jsonb,
          $12,
          $13,
          $13
        )
        ON CONFLICT (organization_id, connector_account_id, external_deal_id) DO UPDATE SET
          company_id = EXCLUDED.company_id,
          contact_id = EXCLUDED.contact_id,
          deal_name = EXCLUDED.deal_name,
          stage = EXCLUDED.stage,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          metadata = EXCLUDED.metadata,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        crypto.randomUUID(),
        input.organizationId,
        input.connectorAccountId,
        input.record.externalId,
        companyId,
        contactId,
        String(payload.dealName ?? input.record.title),
        typeof payload.stage === 'string' ? payload.stage : null,
        typeof payload.amount === 'number' ? payload.amount : null,
        typeof payload.currency === 'string' ? payload.currency : null,
        JSON.stringify(input.record.metadata),
        input.record.updatedAt,
        timestamp,
      ],
    )
    return
  }

  if (input.record.crmObjectType === 'activity') {
    const contactId =
      typeof payload.contactExternalId === 'string'
        ? await findCrmContactId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalContactId: payload.contactExternalId,
          })
        : null
    const dealId =
      typeof payload.dealExternalId === 'string'
        ? await findCrmDealId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalDealId: payload.dealExternalId,
          })
        : null

    await pool.query(
      `
        INSERT INTO crm_activities (
          id,
          organization_id,
          connector_account_id,
          external_activity_id,
          contact_id,
          deal_id,
          activity_type,
          summary,
          occurred_at,
          metadata,
          source_updated_at,
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
          $10::jsonb,
          $11,
          $12,
          $12
        )
        ON CONFLICT (organization_id, connector_account_id, external_activity_id) DO UPDATE SET
          contact_id = EXCLUDED.contact_id,
          deal_id = EXCLUDED.deal_id,
          activity_type = EXCLUDED.activity_type,
          summary = EXCLUDED.summary,
          occurred_at = EXCLUDED.occurred_at,
          metadata = EXCLUDED.metadata,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        crypto.randomUUID(),
        input.organizationId,
        input.connectorAccountId,
        input.record.externalId,
        contactId,
        dealId,
        typeof payload.activityType === 'string' ? payload.activityType : 'activity',
        typeof payload.summary === 'string' ? payload.summary : input.record.title,
        input.record.updatedAt,
        JSON.stringify(input.record.metadata),
        input.record.updatedAt,
        timestamp,
      ],
    )
  }
}

async function resolveDocumentId(input: {
  organizationId: string
  knowledgeSourceId: string
  record: BishConnectorSyncRecord
  timestamp: number
}) {
  const existing = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM knowledge_documents
      WHERE organization_id = $1
        AND knowledge_source_id = $2
        AND external_document_id = $3
      LIMIT 1
    `,
    [input.organizationId, input.knowledgeSourceId, input.record.externalId],
  )

  if (existing.rows[0]?.id) {
    await pool.query(
      `
        UPDATE knowledge_documents
        SET
          title = $1,
          source_url = $2,
          source_updated_at = $3,
          fingerprint = $4,
          metadata = $5::jsonb,
          updated_at = $6
        WHERE id = $7
      `,
      [
        input.record.title,
        input.record.sourceUrl,
        input.record.updatedAt,
        input.record.fingerprint,
        JSON.stringify(input.record.metadata),
        input.timestamp,
        existing.rows[0].id,
      ],
    )
    return existing.rows[0].id
  }

  const id = crypto.randomUUID()
  await pool.query(
    `
      INSERT INTO knowledge_documents (
        id,
        organization_id,
        knowledge_source_id,
        external_document_id,
        document_type,
        title,
        source_url,
        access_scope,
        source_updated_at,
        latest_version_id,
        fingerprint,
        redaction_status,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'connector_record',
        $5,
        $6,
        'org',
        $7,
        NULL,
        $8,
        'clean',
        $9::jsonb,
        $10,
        $10
      )
    `,
    [
      id,
      input.organizationId,
      input.knowledgeSourceId,
      input.record.externalId,
      input.record.title,
      input.record.sourceUrl,
      input.record.updatedAt,
      input.record.fingerprint,
      JSON.stringify(input.record.metadata),
      input.timestamp,
    ],
  )

  return id
}

async function ingestKnowledgeRecord(input: {
  organizationId: string
  connectorAccountId: string
  knowledgeSourceId: string
  record: BishConnectorSyncRecord
  syncCursor: string
  timestamp: number
}) {
  const documentId = await resolveDocumentId({
    organizationId: input.organizationId,
    knowledgeSourceId: input.knowledgeSourceId,
    record: input.record,
    timestamp: input.timestamp,
  })

  const versionId = crypto.randomUUID()
  const insertVersion = await pool.query<{ id: string }>(
    `
      INSERT INTO knowledge_document_versions (
        id,
        organization_id,
        document_id,
        version_label,
        source_version,
        content_markdown,
        content_text,
        fingerprint,
        sync_cursor,
        source_updated_at,
        ingest_status,
        ingested_at,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'sync',
        $4,
        $5,
        $5,
        $6,
        $7,
        $8,
        'indexed',
        $8,
        $9::jsonb,
        $8,
        $8
      )
      ON CONFLICT (document_id, fingerprint) DO NOTHING
      RETURNING id
    `,
    [
      versionId,
      input.organizationId,
      documentId,
      input.syncCursor,
      input.record.content,
      input.record.fingerprint,
      input.syncCursor,
      input.timestamp,
      JSON.stringify({
        sourceType: input.record.sourceType,
        proposedActionCount: input.record.proposedActions.length,
      }),
    ],
  )

  if (!insertVersion.rows[0]?.id) {
    return 0
  }

  const versionIdentifier = insertVersion.rows[0].id
  await pool.query(
    `
      UPDATE knowledge_documents
      SET latest_version_id = $1,
          fingerprint = $2,
          updated_at = $3
      WHERE id = $4
    `,
    [versionIdentifier, input.record.fingerprint, input.timestamp, documentId],
  )

  for (const chunk of chunkText(input.record.content)) {
    const chunkId = crypto.randomUUID()
    await pool.query(
      `
        INSERT INTO knowledge_chunks (
          id,
          organization_id,
          document_version_id,
          chunk_index,
          content,
          token_count,
          metadata,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, $7)
      `,
      [
        chunkId,
        input.organizationId,
        versionIdentifier,
        chunk.index,
        chunk.content,
        Math.max(1, Math.round(chunk.content.length / 4)),
        input.timestamp,
      ],
    )

    await pool.query(
      `
        INSERT INTO knowledge_embeddings (
          id,
          organization_id,
          document_version_id,
          knowledge_chunk_id,
          attachment_id,
          scope_type,
          thread_id,
          message_id,
          user_id,
          owner_org_id,
          workspace_id,
          access_scope,
          access_group_ids,
          chunk_index,
          content,
          embedding_model,
          embedding,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          NULL,
          'org_knowledge',
          NULL,
          NULL,
          NULL,
          $2,
          NULL,
          'org',
          '[]'::jsonb,
          $5,
          $6,
          'seed-deterministic-8d',
          $7::vector,
          $8,
          $8
        )
      `,
      [
        crypto.randomUUID(),
        input.organizationId,
        versionIdentifier,
        chunkId,
        chunk.index,
        chunk.content,
        toVectorLiteral(buildDeterministicEmbedding(chunk.content)),
        input.timestamp,
      ],
    )
  }

  return 1
}

async function processSyncJob() {
  const job = await claimSyncJob()
  if (!job) return false

  const timestamp = Date.now()
  const readiness = getConnectorInstallReadiness(job.provider, process.env)

  if (!readiness.configured) {
    await recordConnectorFailure({
      organizationId: job.organization_id,
      connectorAccountId: job.connector_account_id,
      syncJobId: job.id,
      code: 'CONNECTOR_ENV_MISSING',
      message: `${readiness.label} is missing runtime credentials.`,
      details: {
        missingEnv: readiness.missingEnv,
      },
    })

    await pool.query(
      `
        UPDATE connector_accounts
        SET status = 'config_required',
            updated_at = $1
        WHERE id = $2
      `,
      [timestamp, job.connector_account_id],
    )

    await pool.query(
      `
        UPDATE connector_sync_jobs
        SET status = 'failed',
            error_message = $1,
            completed_at = $2,
            updated_at = $2
        WHERE id = $3
      `,
      [
        `Missing required env: ${readiness.missingEnv.join(', ')}`,
        timestamp,
        job.id,
      ],
    )

    console.log(`Skipped sync job ${job.id} because credentials are missing`)
    return true
  }

  const adapter = createConnectorAdapter(job.provider)
  const discoveredSources = await adapter.discoverSources(
    job.organization_id,
    job.connector_account_id,
  )
  const selectedSource =
    discoveredSources.find((source) => source.sourceType === job.source_type)
    ?? discoveredSources[0]

  if (!selectedSource) {
    await recordConnectorFailure({
      organizationId: job.organization_id,
      connectorAccountId: job.connector_account_id,
      syncJobId: job.id,
      code: 'CONNECTOR_SOURCE_MISSING',
      message: 'No sync source is configured for this connector.',
      details: {},
    })
    return true
  }

  const sourceType = selectedSource.sourceType
  const sourceRef = job.source_ref ?? `${job.provider}:${sourceType}`
  const cursor = await readCursor({
    organizationId: job.organization_id,
    connectorAccountId: job.connector_account_id,
    sourceType,
    sourceRef,
  })

  const syncResult = await adapter.syncSource(
    job.organization_id,
    {
      connectorAccountId: job.connector_account_id,
      sourceType,
      sourceRef,
    },
    cursor,
  )
  const records = await adapter.normalizeRecords(syncResult.records)
  const knowledgeSourceId = await ensureKnowledgeSource({
    organizationId: job.organization_id,
    connectorAccountId: job.connector_account_id,
    sourceType,
    sourceRef,
  })

  let documentsIndexed = 0
  for (const record of records) {
    await upsertRawConnectorRecord({
      organizationId: job.organization_id,
      connectorAccountId: job.connector_account_id,
      record,
    })
    await upsertCrmProjection({
      organizationId: job.organization_id,
      connectorAccountId: job.connector_account_id,
      record,
    })
    documentsIndexed += await ingestKnowledgeRecord({
      organizationId: job.organization_id,
      connectorAccountId: job.connector_account_id,
      knowledgeSourceId,
      record,
      syncCursor: syncResult.cursor,
      timestamp,
    })
  }

  const proposedActions = await adapter.proposeActions({
    sourceType,
    records,
  })

  await upsertCursor({
    organizationId: job.organization_id,
    connectorAccountId: job.connector_account_id,
    sourceType,
    sourceRef,
    cursorValue: syncResult.cursor,
    timestamp,
  })

  await pool.query(
    `
      UPDATE connector_scopes
      SET granted = true,
          updated_at = $1
      WHERE connector_account_id = $2
    `,
    [timestamp, job.connector_account_id],
  )

  await pool.query(
    `
      UPDATE connector_accounts
      SET status = 'connected',
          last_synced_at = $1,
          scope_status = $2::jsonb,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{lastCursor}',
            to_jsonb($3::text),
            true
          ),
          updated_at = $1
      WHERE id = $4
    `,
    [
      timestamp,
      JSON.stringify({
        granted: true,
        missingEnv: [],
      }),
      syncResult.cursor,
      job.connector_account_id,
    ],
  )

  await pool.query(
    `
      UPDATE connector_sync_jobs
      SET status = 'completed',
          completed_at = $1,
          records_read = $2,
          records_written = $3,
          documents_indexed = $4,
          metadata = $5::jsonb,
          updated_at = $1
      WHERE id = $6
    `,
    [
      timestamp,
      records.length,
      records.length,
      documentsIndexed,
      JSON.stringify({
        cursor: syncResult.cursor,
        proposedActionCount: proposedActions.length,
        sourceType,
      }),
      job.id,
    ],
  )

  console.log(`Processed sync job ${job.id} with ${records.length} records`)
  return true
}

async function processEvaluationRun() {
  const timestamp = Date.now()
  const result = await pool.query<{
    id: string
    candidate_variant_id: string
    variant_label: string
  }>(
    `
      WITH next_eval AS (
        SELECT er.id, er.candidate_variant_id, cv.variant_label
        FROM evaluation_runs er
        JOIN candidate_variants cv
          ON cv.id = er.candidate_variant_id
        WHERE er.status = 'queued'
        ORDER BY er.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE evaluation_runs er
      SET status = 'running',
          updated_at = $1
      FROM next_eval
      WHERE er.id = next_eval.id
      RETURNING er.id, er.candidate_variant_id, next_eval.variant_label
    `,
    [timestamp],
  )

  const evaluation = result.rows[0]
  if (!evaluation) return false

  const quality = scoreFromSeed(`${evaluation.variant_label}:quality`, 0.78, 0.96)
  const safety = scoreFromSeed(`${evaluation.variant_label}:safety`, 0.88, 0.99)
  const latency = scoreFromSeed(`${evaluation.variant_label}:latency`, 0.63, 0.91)
  const approval = scoreFromSeed(`${evaluation.variant_label}:approval`, 0.72, 0.95)

  await pool.query(
    `
      UPDATE candidate_variants
      SET status = 'evaluated',
          score_quality = $1,
          score_safety = $2,
          score_latency = $3,
          score_approval_acceptance = $4,
          updated_at = $5
      WHERE id = $6
    `,
    [quality, safety, latency, approval, timestamp, evaluation.candidate_variant_id],
  )

  await pool.query(
    `
      UPDATE evaluation_runs
      SET status = 'completed',
          score_quality = $1,
          score_safety = $2,
          score_latency = $3,
          score_approval_acceptance = $4,
          summary = $5::jsonb,
          completed_at = $6,
          updated_at = $6
      WHERE id = $7
    `,
    [
      quality,
      safety,
      latency,
      approval,
      JSON.stringify({ quality, safety, latency, approval }),
      timestamp,
      evaluation.id,
    ],
  )

  console.log(`Processed evaluation run ${evaluation.id}`)
  return true
}

async function processActionExecution() {
  const timestamp = Date.now()
  const result = await pool.query<{ id: string }>(
    `
      WITH next_action AS (
        SELECT id
        FROM action_executions
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE action_executions ae
      SET status = 'completed',
          response_payload = '{"result":"simulated_execution"}'::jsonb,
          updated_at = $1
      FROM next_action
      WHERE ae.id = next_action.id
      RETURNING ae.id
    `,
    [timestamp],
  )

  if (!result.rows[0]) return false
  console.log(`Processed action execution ${result.rows[0].id}`)
  return true
}

async function main() {
  console.log('bish-worker started')
  while (true) {
    const didWork =
      (await processSyncJob())
      || (await processEvaluationRun())
      || (await processActionExecution())

    if (!didWork) {
      await wait(loopDelayMs)
    }
  }
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
