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
  throw new Error('Missing ZERO_UPSTREAM_DB or DATABASE_URL for bish-scheduler.')
}

const pool = new Pool({ connectionString, applicationName: 'bish-scheduler' })
const intervalMs = Number(process.env.BISH_SCHEDULER_INTERVAL_MS ?? 60_000)

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function queueScheduledSyncs() {
  const timestamp = Date.now()
  const staleBefore = timestamp - Number(process.env.BISH_SYNC_STALE_MS ?? 15 * 60_000)

  const result = await pool.query<{
    organization_id: string
    connector_account_id: string
    source_type: string | null
  }>(
    `
      SELECT
        ca.organization_id,
        ca.id AS connector_account_id,
        MIN(ks.source_type) AS source_type
      FROM connector_accounts ca
      LEFT JOIN knowledge_sources ks
        ON ks.connector_account_id = ca.id
      WHERE (
          ca.last_synced_at IS NULL
          OR ca.last_synced_at < $1
        )
        AND NOT EXISTS (
          SELECT 1
          FROM connector_sync_jobs csj
          WHERE csj.connector_account_id = ca.id
            AND csj.status IN ('queued', 'running')
        )
      GROUP BY ca.organization_id, ca.id
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
          $4,
          'scheduled',
          'queued',
          $5,
          '{"queuedBy":"scheduler"}'::jsonb,
          $5,
          $5
        )
      `,
      [
        crypto.randomUUID(),
        row.organization_id,
        row.connector_account_id,
        row.source_type,
        timestamp,
      ],
    )
  }

  if (result.rowCount) {
    console.log(`Queued ${result.rowCount} scheduled sync jobs`)
  }
}

async function main() {
  console.log('bish-scheduler started')
  while (true) {
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
