import { Pool } from 'pg'

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

  for (const row of result.rows) {
    await pool.query(
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
      `,
      [
        crypto.randomUUID(),
        row.organization_id,
        row.connector_account_id,
        timestamp,
      ],
    )
  }

  if (result.rowCount) {
    console.log(`Queued ${result.rowCount} scheduled sync jobs`)
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
