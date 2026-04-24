import { createHash } from 'node:crypto'
import {
  buildDeterministicEmbedding,
  chunkText,
  ConnectorAdapterError,
  createConnectorAdapter,
  decryptBishSecretJson,
  decryptBishSecretValue,
  encryptBishSecretJson,
  encryptBishSecretValue,
  getConnectorInstallReadiness,
  getConnectorProviderDefinition,
  type EncryptedPayload,
  type BishConnectorProvider,
  type BishConnectorSourceDefinition,
  type BishConnectorSyncRecord,
  toVectorLiteral,
} from '@bish/automation'
import { Pool } from 'pg'

/**
 * Worker responsibilities
 * - Claim connector sync jobs and run connector adapter syncs
 * - Project raw records into CRM/knowledge tables
 * - Write deterministic embeddings (placeholder until model-backed embeddings ship)
 *
 * Production-hardening goals
 * - Never crash the worker loop for a single failing job
 * - Maintain multi-tenant safety by scoping jobs to the owning organization
 * - Keep connector status transitions consistent for operator UX (connected <-> syncing)
 */

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

/**
 * When we use `ON CONFLICT (...) DO UPDATE`, Postgres requires a matching UNIQUE
 * (or exclusion) constraint. During upgrades it is possible to deploy app code
 * before migrations are applied, so we keep a narrow fallback that preserves
 * legacy behavior until the migration lands.
 */
function isMissingOnConflictConstraintError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const message =
    'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? String((error as { message: string }).message)
      : ''
  return message.toLowerCase().includes('no unique or exclusion constraint matching the on conflict specification')
}

/**
 * In production (Railway), processes should exit cleanly on SIGTERM so the
 * platform can roll deployments without leaving Postgres connections open.
 */
function setupGracefulShutdown() {
  let shuttingDown = false

  async function shutdown(signal: string) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`bish-worker shutting down (${signal})`)
    try {
      await pool.end()
    } catch (error) {
      console.error('failed to close Postgres pool during shutdown', error)
    } finally {
      process.exit(0)
    }
  }

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })
}

function scoreFromSeed(seed: string, min: number, max: number) {
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 8)
  const value = Number.parseInt(hash, 16) / 0xffffffff
  return Number((min + value * (max - min)).toFixed(4))
}

type OAuthCredentialBundle = {
  readonly accessToken: string
  readonly refreshToken: string | null
  readonly tokenType: string
  readonly expiresAt: number | null
}

type ConnectorAccountAuthRow = {
  readonly id: string
  readonly provider: BishConnectorProvider
  readonly external_account_id: string | null
  readonly encrypted_access_token: string | null
  readonly encrypted_refresh_token: string | null
  readonly token_expires_at: number | null
  readonly metadata: Record<string, unknown> | null
}

function parseEncryptedPayload(value: string): EncryptedPayload {
  const parsed = JSON.parse(value) as Partial<EncryptedPayload>
  if (
    !parsed
    || typeof parsed.ciphertext !== 'string'
    || typeof parsed.iv !== 'string'
    || typeof parsed.authTag !== 'string'
    || typeof parsed.keyVersion !== 'number'
  ) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_API_BAD_RESPONSE',
      message: 'Stored connector token payload is invalid JSON.',
      details: { value: value.slice(0, 40) },
    })
  }
  return parsed as EncryptedPayload
}

async function refreshAsanaAccessToken(refreshToken: string): Promise<OAuthCredentialBundle> {
  const clientId = process.env.ASANA_CLIENT_ID?.trim()
  const clientSecret = process.env.ASANA_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_REFRESH_FAILED',
      message: 'Asana token refresh requires ASANA_CLIENT_ID and ASANA_CLIENT_SECRET.',
      details: {},
    })
  }

  const response = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_REFRESH_FAILED',
      message:
        (typeof payload.error_description === 'string' && payload.error_description)
        || (typeof payload.error === 'string' && payload.error)
        || 'Asana token refresh failed.',
      details: { status: response.status },
    })
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : null
  const nextRefreshToken =
    typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken
  const tokenType = typeof payload.token_type === 'string' ? payload.token_type : 'bearer'

  return {
    accessToken: payload.access_token,
    refreshToken: nextRefreshToken,
    tokenType,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  }
}

async function refreshHubSpotAccessToken(refreshToken: string): Promise<OAuthCredentialBundle> {
  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim()
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_REFRESH_FAILED',
      message: 'HubSpot token refresh requires HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET.',
      details: {},
    })
  }

  const response = await fetch('https://api.hubspot.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_REFRESH_FAILED',
      message:
        (typeof payload.message === 'string' && payload.message)
        || (typeof payload.error_description === 'string' && payload.error_description)
        || (typeof payload.error === 'string' && payload.error)
        || 'HubSpot token refresh failed.',
      details: { status: response.status },
    })
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : null
  const nextRefreshToken =
    typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken
  const tokenType = typeof payload.token_type === 'string' ? payload.token_type : 'bearer'

  return {
    accessToken: payload.access_token,
    refreshToken: nextRefreshToken,
    tokenType,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  }
}

async function readConnectorAccountAuth(connectorAccountId: string): Promise<ConnectorAccountAuthRow | null> {
  const result = await pool.query<ConnectorAccountAuthRow>(
    `
      SELECT
        id,
        provider,
        external_account_id,
        encrypted_access_token,
        encrypted_refresh_token,
        token_expires_at,
        metadata
      FROM connector_accounts
      WHERE id = $1
      LIMIT 1
    `,
    [connectorAccountId],
  )

  return result.rows[0] ?? null
}

function readMetadataOAuthBundle(metadata: Record<string, unknown> | null): unknown {
  if (!metadata) return null
  const oauth = metadata.oauth
  if (!oauth || typeof oauth !== 'object') return null
  // @ts-expect-error - runtime-narrowed
  return oauth.credentials ?? null
}

async function resolveOAuthCredentialBundle(row: ConnectorAccountAuthRow): Promise<OAuthCredentialBundle | null> {
  if (row.encrypted_access_token) {
    const accessToken = await decryptBishSecretValue(parseEncryptedPayload(row.encrypted_access_token))
    const refreshToken = row.encrypted_refresh_token
      ? await decryptBishSecretValue(parseEncryptedPayload(row.encrypted_refresh_token))
      : null
    return {
      accessToken,
      refreshToken,
      tokenType: 'bearer',
      expiresAt: row.token_expires_at,
    }
  }

  const metadataBundleEncrypted = readMetadataOAuthBundle(row.metadata)
  if (!metadataBundleEncrypted) return null

  return await decryptBishSecretJson<OAuthCredentialBundle>(metadataBundleEncrypted as EncryptedPayload)
}

async function persistOAuthCredentialBundle(input: {
  readonly connectorAccountId: string
  readonly bundle: OAuthCredentialBundle
  readonly provider: BishConnectorProvider
}) {
  const encryptedAccessToken = JSON.stringify(await encryptBishSecretValue(input.bundle.accessToken))
  const encryptedRefreshToken = input.bundle.refreshToken
    ? JSON.stringify(await encryptBishSecretValue(input.bundle.refreshToken))
    : null
  const encryptedBundle = await encryptBishSecretJson(input.bundle)
  const timestamp = Date.now()

  await pool.query(
    `
      UPDATE connector_accounts
      SET encrypted_access_token = $1,
          encrypted_refresh_token = $2,
          token_expires_at = $3,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{oauth,credentials}',
            $4::jsonb,
            true
          ),
          updated_at = $5
      WHERE id = $6
        AND provider = $7
    `,
    [
      encryptedAccessToken,
      encryptedRefreshToken,
      input.bundle.expiresAt,
      JSON.stringify(encryptedBundle),
      timestamp,
      input.connectorAccountId,
      input.provider,
    ],
  )
}

async function getOAuthAccessToken(input: {
  readonly provider: BishConnectorProvider
  readonly connectorAccountId: string
}): Promise<{ readonly accessToken: string; readonly externalAccountId: string | null }> {
  const row = await readConnectorAccountAuth(input.connectorAccountId)
  if (!row || row.provider !== input.provider) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_MISSING',
      message: 'Connector account auth record not found.',
      details: { connectorAccountId: input.connectorAccountId, provider: input.provider },
    })
  }

  const bundle = await resolveOAuthCredentialBundle(row)
  if (!bundle) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_MISSING',
      message: `${input.provider} OAuth credentials have not been stored for this connector.`,
      details: { connectorAccountId: input.connectorAccountId },
    })
  }

  const now = Date.now()
  const expiresAt = bundle.expiresAt
  const refreshSkewMs = 2 * 60_000
  const shouldRefresh = typeof expiresAt === 'number' && expiresAt - now < refreshSkewMs

  if (!shouldRefresh) {
    return { accessToken: bundle.accessToken, externalAccountId: row.external_account_id }
  }

  if (!bundle.refreshToken) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_EXPIRED',
      message: `${input.provider} access token expired and no refresh token is available.`,
      details: { connectorAccountId: input.connectorAccountId },
    })
  }

  const refreshed =
    input.provider === 'asana'
      ? await refreshAsanaAccessToken(bundle.refreshToken)
      : input.provider === 'hubspot'
        ? await refreshHubSpotAccessToken(bundle.refreshToken)
        : bundle

  await persistOAuthCredentialBundle({
    connectorAccountId: input.connectorAccountId,
    bundle: refreshed,
    provider: input.provider,
  })

  return { accessToken: refreshed.accessToken, externalAccountId: row.external_account_id }
}

async function claimSyncJob() {
  const timestamp = Date.now()
  const result = await pool.query<{
    id: string
    organization_id: string
    connector_account_id: string
    provider: BishConnectorProvider
    external_account_id: string | null
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
          ca.provider,
          ca.external_account_id
        FROM connector_sync_jobs csj
        JOIN connector_accounts ca
          ON ca.id = csj.connector_account_id
          AND ca.organization_id = csj.organization_id
        WHERE csj.status = 'queued'
          AND (csj.next_run_at IS NULL OR csj.next_run_at <= $1)
        ORDER BY
          COALESCE(csj.next_run_at, csj.created_at) ASC,
          csj.created_at ASC
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
        next_job.external_account_id,
        next_job.source_type,
        next_job.source_ref
    `,
    [timestamp],
  )

  return result.rows[0] ?? null
}

async function markConnectorStatus(input: {
  connectorAccountId: string
  expectedOrganizationId: string
  status: 'syncing' | 'connected' | 'config_required' | 'needs_auth'
  timestamp: number
  onlyIfCurrentStatus?: 'syncing' | 'connected' | 'needs_auth' | 'config_required'
}) {
  await pool.query(
    `
      UPDATE connector_accounts
      SET status = $1,
          updated_at = $2
      WHERE id = $3
        AND organization_id = $4
        AND ($5::text IS NULL OR status = $5)
    `,
    [
      input.status,
      input.timestamp,
      input.connectorAccountId,
      input.expectedOrganizationId,
      input.onlyIfCurrentStatus ?? null,
    ],
  )
}

async function failSyncJob(input: {
  syncJobId: string
  expectedOrganizationId: string
  errorMessage: string
  timestamp: number
}) {
  await pool.query(
    `
      UPDATE connector_sync_jobs
      SET status = 'failed',
          error_message = $1,
          completed_at = $2,
          updated_at = $2
      WHERE id = $3
        AND organization_id = $4
    `,
    [input.errorMessage, input.timestamp, input.syncJobId, input.expectedOrganizationId],
  )
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

function isPgUndefinedTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return (error as { code?: unknown }).code === '42P01'
}

async function readGrantedScopeKeys(connectorAccountId: string): Promise<Set<string> | null> {
  let result: { rows: Array<{ scope_key: string; granted: boolean }> }
  try {
    result = await pool.query<{ scope_key: string; granted: boolean }>(
      `
        SELECT scope_key, granted
        FROM connector_scopes
        WHERE connector_account_id = $1
      `,
      [connectorAccountId],
    )
  } catch (error) {
    /**
     * If the `connector_scopes` table does not exist yet, the worker should
     * fall back to adapter discovery instead of crashing the sync loop.
     */
    if (isPgUndefinedTableError(error)) {
      return null
    }
    throw error
  }

  /**
   * During early deployments it is possible for the worker to run before the
   * `connector_scopes` table exists or is backfilled. In that case we cannot
   * reliably gate sources by scope and should fall back to adapter discovery.
   */
  if (!result.rows.length) {
    return null
  }

  const granted = new Set<string>()
  for (const row of result.rows) {
    if (row.granted) {
      granted.add(row.scope_key)
    }
  }

  return granted
}

type ScopedSourceGate = {
  readonly eligible: readonly BishConnectorSourceDefinition[]
  readonly skippedOptional: ReadonlyArray<{
    readonly sourceType: string
    readonly displayName: string
    readonly missingScopeKeys: readonly string[]
  }>
  readonly missingRequiredScopes: readonly string[]
  readonly grantedScopeKeys: readonly string[] | null
}

async function gateSourcesByScopes(input: {
  readonly provider: BishConnectorProvider
  readonly connectorAccountId: string
  readonly discoveredSources: readonly BishConnectorSourceDefinition[]
}): Promise<ScopedSourceGate> {
  const grantedScopes = await readGrantedScopeKeys(input.connectorAccountId)
  if (!grantedScopes) {
    return {
      eligible: input.discoveredSources,
      skippedOptional: [],
      missingRequiredScopes: [],
      grantedScopeKeys: null,
    }
  }

  const scopeDefinitions = getConnectorProviderDefinition(input.provider).scopes
  const requiredByKey = new Map(
    scopeDefinitions.map((scope) => [scope.key, scope.required !== false]),
  )

  const skippedOptional: ScopedSourceGate['skippedOptional'] = []
  const missingRequiredScopes = new Set<string>()
  const eligible: BishConnectorSourceDefinition[] = []

  for (const source of input.discoveredSources) {
    const missing = source.defaultScopeKeys.filter((key) => !grantedScopes.has(key))
    if (missing.length === 0) {
      eligible.push(source)
      continue
    }

    const hasRequiredMissing = missing.some((key) => requiredByKey.get(key) !== false)
    if (hasRequiredMissing) {
      for (const key of missing) {
        if (requiredByKey.get(key) !== false) {
          missingRequiredScopes.add(key)
        }
      }
      eligible.push(source)
      continue
    }

    skippedOptional.push({
      sourceType: source.sourceType,
      displayName: source.displayName,
      missingScopeKeys: missing,
    })
  }

  return {
    eligible,
    skippedOptional,
    missingRequiredScopes: Array.from(missingRequiredScopes),
    grantedScopeKeys: Array.from(grantedScopes),
  }
}

async function ensureKnowledgeSource(input: {
  organizationId: string
  connectorAccountId: string
  sourceType: string
  sourceRef: string
  displayName: string
}) {
  const id = crypto.randomUUID()
  const timestamp = Date.now()

  try {
    const result = await pool.query<{ id: string }>(
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
        ON CONFLICT (organization_id, connector_account_id, source_type) DO UPDATE SET
          external_source_id = EXCLUDED.external_source_id,
          display_name = EXCLUDED.display_name,
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `,
      [
        id,
        input.organizationId,
        input.connectorAccountId,
        input.sourceType,
        input.sourceRef,
        input.displayName,
        timestamp,
      ],
    )

    return result.rows[0]?.id ?? id
  } catch (error) {
    if (!isMissingOnConflictConstraintError(error)) {
      throw error
    }

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
        input.displayName,
        timestamp,
      ],
    )

    return id
  }
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

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asRequiredString(value: unknown, fallback: string): string {
  const candidate = asNullableString(value)
  return candidate ?? fallback
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asFirstExternalId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = asFirstExternalId(entry)
      if (resolved) return resolved
    }
  }
  return null
}

async function upsertCrmProjection(input: {
  organizationId: string
  connectorAccountId: string
  record: BishConnectorSyncRecord
}) {
  const payload = input.record.payload
  const timestamp = Date.now()
  const projectionMetadata = JSON.stringify({
    ...input.record.metadata,
    sourceUrl: input.record.sourceUrl,
    sourcePayload: payload,
  })

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
        asRequiredString(payload.fullName, input.record.title),
        asNullableString(payload.email),
        asNullableString(payload.phone),
        asNullableString(payload.lifecycleStage),
        projectionMetadata,
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
        asRequiredString(payload.companyName, input.record.title),
        asNullableString(payload.website),
        asNullableString(payload.industry),
        projectionMetadata,
        input.record.updatedAt,
        timestamp,
      ],
    )
    return
  }

  if (input.record.crmObjectType === 'deal') {
    const contactExternalId = asFirstExternalId(
      payload.contactExternalId ?? payload.contactExternalIds,
    )
    const companyExternalId = asFirstExternalId(
      payload.companyExternalId ?? payload.companyExternalIds,
    )
    const contactId =
      contactExternalId
        ? await findCrmContactId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalContactId: contactExternalId,
          })
        : null
    const companyId =
      companyExternalId
        ? await findCrmCompanyId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalCompanyId: companyExternalId,
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
        asRequiredString(payload.dealName, input.record.title),
        asNullableString(payload.stage),
        asNullableNumber(payload.amount),
        asNullableString(payload.currency),
        projectionMetadata,
        input.record.updatedAt,
        timestamp,
      ],
    )
    return
  }

  if (input.record.crmObjectType === 'activity') {
    const contactExternalId = asFirstExternalId(
      payload.contactExternalId ?? payload.contactExternalIds,
    )
    const dealExternalId = asFirstExternalId(
      payload.dealExternalId ?? payload.dealExternalIds,
    )
    const contactId =
      contactExternalId
        ? await findCrmContactId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalContactId: contactExternalId,
          })
        : null
    const dealId =
      dealExternalId
        ? await findCrmDealId({
            organizationId: input.organizationId,
            connectorAccountId: input.connectorAccountId,
            externalDealId: dealExternalId,
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
        asRequiredString(payload.activityType, 'activity'),
        asNullableString(payload.summary) ?? input.record.title,
        asNullableNumber(payload.occurredAt) ?? input.record.updatedAt,
        projectionMetadata,
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

function connectorStatusForFailure(input: {
  readonly provider: BishConnectorProvider
  readonly code: string
}): 'connected' | 'needs_auth' | 'config_required' {
  if (input.code === 'CONNECTOR_ENV_MISSING') {
    return 'config_required'
  }

  if (
    input.code === 'CONNECTOR_AUTH_MISSING'
    || input.code === 'CONNECTOR_AUTH_EXPIRED'
    || input.code === 'CONNECTOR_AUTH_REFRESH_FAILED'
    || input.code === 'CONNECTOR_API_UNAUTHORIZED'
  ) {
    return 'needs_auth'
  }

  if (input.code === 'CONNECTOR_API_FORBIDDEN') {
    return input.provider === 'google_workspace' ? 'config_required' : 'needs_auth'
  }

  /**
   * Missing scope is treated as a non-fatal, operator-actionable failure when it
   * only affects optional ingestion lanes.
   */
  if (input.code === 'CONNECTOR_SCOPE_MISSING') {
    return 'connected'
  }

  return 'connected'
}

async function processSyncJob() {
  const job = await claimSyncJob()
  if (!job) return false

  const timestamp = Date.now()
  await markConnectorStatus({
    connectorAccountId: job.connector_account_id,
    expectedOrganizationId: job.organization_id,
    status: 'syncing',
    timestamp,
    onlyIfCurrentStatus: 'connected',
  })

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

    await markConnectorStatus({
      connectorAccountId: job.connector_account_id,
      expectedOrganizationId: job.organization_id,
      status: 'config_required',
      timestamp,
    })

    await failSyncJob({
      syncJobId: job.id,
      expectedOrganizationId: job.organization_id,
      errorMessage: `Missing required env: ${readiness.missingEnv.join(', ')}`,
      timestamp,
    })

    console.log(`Skipped sync job ${job.id} because credentials are missing`)
    return true
  }

  try {
    let adapterOptions: Parameters<typeof createConnectorAdapter>[1] | undefined

    if (job.provider === 'asana' || job.provider === 'hubspot') {
      let cachedAuth:
        | { readonly accessToken: string; readonly externalAccountId: string | null }
        | null = null

      const resolveAuth = async () => {
        if (cachedAuth) return cachedAuth
        cachedAuth = await getOAuthAccessToken({
          provider: job.provider,
          connectorAccountId: job.connector_account_id,
        })
        return cachedAuth
      }

      // Preflight auth so we can fail fast with a connector-specific status.
      await resolveAuth()

      adapterOptions = {
        oauth: {
          externalAccountId: job.external_account_id,
          getAccessToken: async (connectorAccountId) => {
            if (connectorAccountId !== job.connector_account_id) {
              throw new ConnectorAdapterError({
                code: 'CONNECTOR_AUTH_MISSING',
                message: 'Connector account mismatch when resolving OAuth token.',
                details: { connectorAccountId, expected: job.connector_account_id },
              })
            }
            return (await resolveAuth()).accessToken
          },
        },
      }
    }

    const adapter = createConnectorAdapter(job.provider, adapterOptions)
    const discoveredSources = await adapter.discoverSources(
      job.organization_id,
      job.connector_account_id,
    )
    if (discoveredSources.length === 0) {
      await recordConnectorFailure({
        organizationId: job.organization_id,
        connectorAccountId: job.connector_account_id,
        syncJobId: job.id,
        code: 'CONNECTOR_SOURCE_MISSING',
        message: 'No sync source is configured for this connector.',
        details: {},
      })
      await failSyncJob({
        syncJobId: job.id,
        expectedOrganizationId: job.organization_id,
        errorMessage: 'No sync source is configured for this connector.',
        timestamp,
      })
      await markConnectorStatus({
        connectorAccountId: job.connector_account_id,
        expectedOrganizationId: job.organization_id,
        status: 'connected',
        timestamp,
        onlyIfCurrentStatus: 'syncing',
      })
      return true
    }

    const sourceGate = await gateSourcesByScopes({
      provider: job.provider,
      connectorAccountId: job.connector_account_id,
      discoveredSources,
    })

    if (sourceGate.missingRequiredScopes.length > 0) {
      await recordConnectorFailure({
        organizationId: job.organization_id,
        connectorAccountId: job.connector_account_id,
        syncJobId: job.id,
        code: 'CONNECTOR_AUTH_MISSING',
        message: `Connector is missing required granted scopes: ${sourceGate.missingRequiredScopes.join(', ')}`,
        details: {
          provider: job.provider,
          missingScopeKeys: sourceGate.missingRequiredScopes,
          grantedScopeKeys: sourceGate.grantedScopeKeys,
        },
      })

      await failSyncJob({
        syncJobId: job.id,
        expectedOrganizationId: job.organization_id,
        errorMessage: `Missing required scopes: ${sourceGate.missingRequiredScopes.join(', ')}`,
        timestamp,
      })

      await markConnectorStatus({
        connectorAccountId: job.connector_account_id,
        expectedOrganizationId: job.organization_id,
        status: 'needs_auth',
        timestamp,
        onlyIfCurrentStatus: 'syncing',
      })

      return true
    }

    /**
     * Connector sync jobs can target a single source (legacy `source_type`
     * scheduling) or request a full connector run (`source_type` null). The
     * scheduler now queues full runs so each connector hydrates all of its data
     * lanes without requiring one job per source type.
     */
    const requestedSourceType = job.source_type?.trim() || null
    const eligibleSources = sourceGate.eligible
    const explicitSource =
      requestedSourceType
        ? eligibleSources.find((source) => source.sourceType === requestedSourceType) ?? null
        : null

    const requestedSourceDefinition = requestedSourceType
      ? discoveredSources.find((source) => source.sourceType === requestedSourceType) ?? null
      : null
    const requestedSourceSkippedOptional = requestedSourceType
      ? sourceGate.skippedOptional.find((source) => source.sourceType === requestedSourceType) ?? null
      : null

    /**
     * When a sync job targets a single source type we treat it as an explicit
     * operator intent (manual run, legacy scheduler, etc). If the requested
     * source cannot run we fail the job with a typed connector error instead of
     * silently fanning out to other lanes.
     *
     * This keeps the worker predictable for ops: the job should either run the
     * requested lane or clearly report why it cannot.
     */
    if (requestedSourceType && !explicitSource) {
      if (!requestedSourceDefinition) {
        await recordConnectorFailure({
          organizationId: job.organization_id,
          connectorAccountId: job.connector_account_id,
          syncJobId: job.id,
          code: 'CONNECTOR_SOURCE_MISSING',
          message: `Unknown connector source type requested: ${requestedSourceType}`,
          details: {
            provider: job.provider,
            requestedSourceType,
          },
        })

        await failSyncJob({
          syncJobId: job.id,
          expectedOrganizationId: job.organization_id,
          errorMessage: `Unknown connector source type: ${requestedSourceType}`,
          timestamp,
        })

        await markConnectorStatus({
          connectorAccountId: job.connector_account_id,
          expectedOrganizationId: job.organization_id,
          status: 'connected',
          timestamp,
          onlyIfCurrentStatus: 'syncing',
        })

        return true
      }

      if (requestedSourceSkippedOptional) {
        const missingScopesLabel = requestedSourceSkippedOptional.missingScopeKeys.join(', ')
        await recordConnectorFailure({
          organizationId: job.organization_id,
          connectorAccountId: job.connector_account_id,
          syncJobId: job.id,
          code: 'CONNECTOR_SCOPE_MISSING',
          message: `Connector source ${requestedSourceType} is missing optional scopes: ${missingScopesLabel}`,
          details: {
            provider: job.provider,
            sourceType: requestedSourceType,
            missingScopeKeys: requestedSourceSkippedOptional.missingScopeKeys,
            grantedScopeKeys: sourceGate.grantedScopeKeys,
          },
        })

        await failSyncJob({
          syncJobId: job.id,
          expectedOrganizationId: job.organization_id,
          errorMessage: `Missing optional scopes for ${requestedSourceType}: ${missingScopesLabel}`,
          timestamp,
        })

        await markConnectorStatus({
          connectorAccountId: job.connector_account_id,
          expectedOrganizationId: job.organization_id,
          status: 'connected',
          timestamp,
          onlyIfCurrentStatus: 'syncing',
        })

        return true
      }
    }
    const syncSources =
      explicitSource ? [explicitSource] : eligibleSources

    type SourceSyncSummary = {
      readonly sourceType: string
      readonly sourceRef: string
      readonly recordsRead: number
      readonly documentsIndexed: number
      readonly cursor: string
      readonly proposedActionCount: number
    }

    const summaries: SourceSyncSummary[] = []
    const failures: Array<{
      readonly sourceType: string
      readonly sourceRef: string
      readonly code: string
      readonly message: string
    }> = []
    const lastCursorBySource: Record<string, string> = {}

    let totalRecordsRead = 0
    let totalDocumentsIndexed = 0
    let totalProposedActions = 0
    const skippedOptionalSources = sourceGate.skippedOptional

    for (const source of syncSources) {
      const sourceType = source.sourceType
      const sourceRef =
        explicitSource
          ? job.source_ref ?? `${job.provider}:${sourceType}`
          : `${job.provider}:${sourceType}`
      const cursor = await readCursor({
        organizationId: job.organization_id,
        connectorAccountId: job.connector_account_id,
        sourceType,
        sourceRef,
      })

      try {
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
          displayName: source.displayName,
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

        summaries.push({
          sourceType,
          sourceRef,
          recordsRead: records.length,
          documentsIndexed,
          cursor: syncResult.cursor,
          proposedActionCount: proposedActions.length,
        })
        lastCursorBySource[sourceType] = syncResult.cursor
        totalRecordsRead += records.length
        totalDocumentsIndexed += documentsIndexed
        totalProposedActions += proposedActions.length
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const adapterError = error instanceof ConnectorAdapterError ? error : null
        const failureCode = adapterError?.code ?? 'CONNECTOR_SYNC_RUNTIME_ERROR'

        failures.push({
          sourceType,
          sourceRef,
          code: failureCode,
          message,
        })

        await recordConnectorFailure({
          organizationId: job.organization_id,
          connectorAccountId: job.connector_account_id,
          syncJobId: job.id,
          code: failureCode,
          message,
          details: {
            ...(adapterError?.details ?? {}),
            provider: job.provider,
            sourceRef,
            sourceType,
          },
        })

        if (explicitSource) {
          throw error
        }
      }
    }

    if (summaries.length === 0) {
      const fallbackMessage =
        failures[0]?.message
        ?? `Connector sync failed for provider ${job.provider}.`
      const fallbackCode = failures[0]?.code ?? 'CONNECTOR_SYNC_RUNTIME_ERROR'

      await failSyncJob({
        syncJobId: job.id,
        expectedOrganizationId: job.organization_id,
        errorMessage: fallbackMessage,
        timestamp,
      })

      await markConnectorStatus({
        connectorAccountId: job.connector_account_id,
        expectedOrganizationId: job.organization_id,
        status:
          connectorStatusForFailure({ provider: job.provider, code: fallbackCode }),
        timestamp,
        onlyIfCurrentStatus: 'syncing',
      })

      return true
    }

    const postSyncStatus = failures.reduce<'connected' | 'needs_auth' | 'config_required'>(
      (status, failure) => {
        const next = connectorStatusForFailure({ provider: job.provider, code: failure.code })
        if (status === 'config_required' || next === 'config_required') return 'config_required'
        if (status === 'needs_auth' || next === 'needs_auth') return 'needs_auth'
        return 'connected'
      },
      'connected',
    )

    await pool.query(
      `
        UPDATE connector_accounts
        SET status = CASE WHEN status = 'syncing' THEN $2 ELSE status END,
            last_synced_at = $1,
            metadata = jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{lastCursor}',
                to_jsonb($3::text),
                true
              ),
              '{lastCursorBySource}',
              $4::jsonb,
              true
            ),
            updated_at = $1
        WHERE id = $5
          AND organization_id = $6
      `,
      [
        timestamp,
        postSyncStatus,
        explicitSource
          ? lastCursorBySource[explicitSource.sourceType] ?? String(timestamp)
          : JSON.stringify(lastCursorBySource),
        JSON.stringify(lastCursorBySource),
        job.connector_account_id,
        job.organization_id,
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
          AND organization_id = $7
      `,
      [
        timestamp,
        totalRecordsRead,
        totalRecordsRead,
        totalDocumentsIndexed,
        JSON.stringify({
          sources: summaries,
          cursorBySource: lastCursorBySource,
          proposedActionCount: totalProposedActions,
          partialFailures: failures.length > 0 ? failures : null,
          skippedOptionalSources:
            skippedOptionalSources.length > 0 ? skippedOptionalSources : null,
          sourceTypeMismatch:
            requestedSourceType && !explicitSource ? requestedSourceType : null,
        }),
        job.id,
        job.organization_id,
      ],
    )

    console.log(
      `Processed sync job ${job.id} with ${totalRecordsRead} records across ${summaries.length} sources`,
    )
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const adapterError = error instanceof ConnectorAdapterError ? error : null
    const failureCode = adapterError?.code ?? 'CONNECTOR_SYNC_RUNTIME_ERROR'
    console.error(`Failed sync job ${job.id}`, error)

    await recordConnectorFailure({
      organizationId: job.organization_id,
      connectorAccountId: job.connector_account_id,
      syncJobId: job.id,
      code: failureCode,
      message,
      details: {
        ...(adapterError?.details ?? {}),
        provider: job.provider,
        sourceRef: job.source_ref,
        sourceType: job.source_type,
      },
    })

    await failSyncJob({
      syncJobId: job.id,
      expectedOrganizationId: job.organization_id,
      errorMessage: message,
      timestamp,
    })

    await markConnectorStatus({
      connectorAccountId: job.connector_account_id,
      expectedOrganizationId: job.organization_id,
      status:
        connectorStatusForFailure({ provider: job.provider, code: failureCode }),
      timestamp,
      onlyIfCurrentStatus: 'syncing',
    })

    return true
  }
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

/**
 * Wrap background handlers so a single exception never terminates the worker.
 * Each handler should be responsible for persisting failure state; this wrapper
 * is the last-resort protection against a crash loop on Railway.
 */
async function safeLoopStep(name: string, handler: () => Promise<boolean>) {
  try {
    return await handler()
  } catch (error) {
    console.error(`bish-worker loop step failed (${name})`, error)
    return false
  }
}

async function main() {
  setupGracefulShutdown()
  console.log('bish-worker started')
  while (true) {
    const didWork =
      (await safeLoopStep('sync', processSyncJob))
      || (await safeLoopStep('eval', processEvaluationRun))
      || (await safeLoopStep('actions', processActionExecution))

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
