import { Pool } from 'pg'
import { listConnectorInstallReadiness } from '@bish/automation'

/**
 * Scheduler responsibilities
 * - Periodically enqueue connector sync jobs for connectors that are stale
 * - Avoid generating job spam for connectors that are not yet configured/authorized
 *
 * Production-hardening goals
 * - Enforce organization scoping in joins to protect multi-tenant boundaries
 * - Only enqueue for connectors that are actually eligible to sync
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
  throw new Error('Missing ZERO_UPSTREAM_DB or DATABASE_URL for bish-scheduler.')
}

const pool = new Pool({ connectionString, applicationName: 'bish-scheduler' })
const intervalMs = Number(process.env.BISH_SCHEDULER_INTERVAL_MS ?? 60_000)

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ensure Railway can terminate the scheduler without leaving connections open.
 */
function setupGracefulShutdown() {
  let shuttingDown = false

  async function shutdown(signal: string) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`bish-scheduler shutting down (${signal})`)
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

/**
 * If the worker crashes mid-sync, jobs can remain `running` forever and block
 * future scheduling. This sweeps "stuck" jobs based on a conservative timeout
 * and returns connector status back to `connected` when there is no active
 * running job.
 */
async function rescueStaleSyncJobs() {
  const timestamp = Date.now()
  const timeoutMs = Number(process.env.BISH_SYNC_JOB_TIMEOUT_MS ?? 30 * 60_000)
  const cutoff = timestamp - timeoutMs

  /**
   * Schema integrity guard:
   * `connector_sync_jobs.connector_account_id` is an FK, but nothing enforces
   * that `connector_sync_jobs.organization_id` matches the owning org of the
   * connector account. The worker refuses to claim mismatched jobs, so these
   * can otherwise remain queued forever and skew operator metrics.
   */
  const mismatched = await pool.query(
    `
      UPDATE connector_sync_jobs csj
      SET status = 'failed',
          error_message = COALESCE(error_message, 'Sync job organization mismatch'),
          completed_at = $1,
          updated_at = $1
      WHERE csj.status IN ('queued', 'running')
        AND NOT EXISTS (
          SELECT 1
          FROM connector_accounts ca
          WHERE ca.id = csj.connector_account_id
            AND ca.organization_id = csj.organization_id
        )
    `,
    [timestamp],
  )

  if (mismatched.rowCount) {
    console.log(`Marked ${mismatched.rowCount} sync jobs as failed (org mismatch)`)
  }

  const expired = await pool.query(
    `
      UPDATE connector_sync_jobs
      SET status = 'failed',
          error_message = COALESCE(error_message, 'Sync job timed out'),
          completed_at = $1,
          updated_at = $1
      WHERE status = 'running'
        AND started_at IS NOT NULL
        AND started_at < $2
    `,
    [timestamp, cutoff],
  )

  if (expired.rowCount) {
    console.log(`Marked ${expired.rowCount} stale running sync jobs as failed`)
  }

  await pool.query(
    `
      UPDATE connector_accounts ca
      SET status = 'connected',
          updated_at = $1
      WHERE ca.status = 'syncing'
        AND NOT EXISTS (
          SELECT 1
          FROM connector_sync_jobs csj
          WHERE csj.connector_account_id = ca.id
            AND csj.status = 'running'
        )
    `,
    [timestamp],
  )

  /**
   * Keep connector account statuses consistent with runtime env contracts.
   *
   * If the deployment is missing required env for a provider, do not leave
   * connectors in a `connected` state (the worker will fail jobs immediately).
   * This provides a faster operator signal and avoids queueing churn when the
   * scheduler and worker are sharing the same environment.
   */
  const providerReadiness = listConnectorInstallReadiness(process.env)
  const providersMissingEnv = providerReadiness
    .filter((provider) => !provider.configured)
    .map((provider) => provider.provider)
  const providersConfigured = providerReadiness
    .filter((provider) => provider.configured)
    .map((provider) => provider.provider)
  if (providersMissingEnv.length > 0) {
    await pool.query(
      `
        UPDATE connector_accounts
        SET status = 'config_required',
            updated_at = $1
        WHERE status = 'connected'
          AND provider = ANY($2::text[])
      `,
      [timestamp, providersMissingEnv],
    )
  }

  /**
   * If env becomes configured after a connector was marked `config_required`,
   * transition it back into an actionable auth state without waiting for a
   * manual DB edit.
   *
   * - OAuth connectors: move back to `connected` when credentials exist;
   *   otherwise move to `needs_auth` so the operator can reconnect.
   * - Google Workspace: move to `connected` if previously activated; otherwise
   *   move to `needs_auth` so the operator can activate.
   */
  if (providersConfigured.length > 0) {
    await pool.query(
      `
        UPDATE connector_accounts
        SET status = CASE
          WHEN provider = 'google_workspace'
            THEN CASE WHEN (metadata -> 'activation') IS NOT NULL THEN 'connected' ELSE 'needs_auth' END
          WHEN provider IN ('asana', 'hubspot')
            THEN CASE
              WHEN encrypted_access_token IS NOT NULL OR (metadata -> 'oauth' -> 'credentials') IS NOT NULL THEN 'connected'
              ELSE 'needs_auth'
            END
          ELSE status
        END,
        updated_at = $1
        WHERE status = 'config_required'
          AND provider = ANY($2::text[])
      `,
      [timestamp, providersConfigured],
    )
  }

  await pool.query(
    `
      UPDATE connector_accounts
      SET status = 'needs_auth',
          updated_at = $1
      WHERE provider IN ('asana', 'hubspot')
        AND status = 'connected'
        AND encrypted_access_token IS NULL
        AND (metadata -> 'oauth' -> 'credentials') IS NULL
    `,
    [timestamp],
  )
}

async function queueScheduledSyncs() {
  const timestamp = Date.now()
  const staleBefore = timestamp - Number(process.env.BISH_SYNC_STALE_MS ?? 15 * 60_000)

  const result = await pool.query<{
    organization_id: string
    connector_account_id: string
  }>(
    `
      SELECT
        ca.organization_id,
        ca.id AS connector_account_id
      FROM connector_accounts ca
      WHERE (
          ca.last_synced_at IS NULL
          OR ca.last_synced_at < $1
        )
        AND ca.status = 'connected'
        AND (
          ca.provider = 'google_workspace'
          OR ca.encrypted_access_token IS NOT NULL
          OR (ca.metadata -> 'oauth' -> 'credentials') IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM connector_sync_jobs csj
          WHERE csj.connector_account_id = ca.id
            AND csj.status IN ('queued', 'running')
        )
    `,
    [staleBefore],
  )

  let insertedCount = 0
  for (const row of result.rows) {
    const insertResult = await pool.query(
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
          NULL,
          NULL,
          'scheduled',
          'queued',
          $4,
          '{"queuedBy":"scheduler"}'::jsonb,
          $4,
          $4
        )
        -- Prevent duplicate active jobs if multiple schedulers/manual triggers race.
        -- This matches the partial unique index on (connector_account_id) for queued/running jobs.
        ON CONFLICT (connector_account_id) WHERE status IN ('queued', 'running') DO NOTHING
      `,
      [
        crypto.randomUUID(),
        row.organization_id,
        row.connector_account_id,
        timestamp,
      ],
    )

    insertedCount += insertResult.rowCount ?? 0
  }

  if (insertedCount) {
    console.log(`Queued ${insertedCount} scheduled sync jobs`)
  }
}

async function main() {
  setupGracefulShutdown()
  console.log('bish-scheduler started')
  while (true) {
    await rescueStaleSyncJobs().catch((error) => {
      console.error('failed to rescue stale sync jobs', error)
    })
    await queueScheduledSyncs().catch((error) => {
      console.error('failed to queue scheduled syncs', error)
    })
    await wait(intervalMs)
  }
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
