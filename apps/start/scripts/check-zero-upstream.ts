/**
 * Zero upstream preflight for self-hosted / Railway releases.
 *
 * Why this exists:
 * - The web app can stream chat turns even when Zero replication is broken.
 * - Chat history, org-scoped read models, and realtime settings surfaces depend
 *   on Zero's logical replication path being healthy.
 * - Railway "redeploy" only recycles the current image; operators need a quick
 *   source-release preflight that catches the current database mismatch before
 *   they think a code deploy fixed history or settings issues.
 *
 * What this script checks:
 * 1. Loads ZERO_UPSTREAM_DB from env files or process env.
 * 2. Connects to upstream Postgres.
 * 3. Verifies `SHOW wal_level` resolves to `logical`.
 * 4. Prints a concise operator-facing result and exits non-zero on mismatch.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'

const appDir = join(import.meta.dir, '..')

async function loadEnv(): Promise<void> {
  for (const path of [join(appDir, '.env.local'), join(appDir, '.env')]) {
    try {
      const text = await readFile(path, 'utf8')
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const separatorIndex = trimmed.indexOf('=')
        if (separatorIndex <= 0) continue
        const key = trimmed.slice(0, separatorIndex).trim()
        const value = trimmed.slice(separatorIndex + 1).trim()
        if (!process.env[key]) process.env[key] = value
      }
    } catch {
      // Missing local env files are fine in CI and Railway shells.
    }
  }
}

function resolveConnectionString(): string | null {
  return [
    process.env.ZERO_UPSTREAM_DB,
    process.env.DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    process.env.PGURL,
  ]
    .map((value) => value?.trim())
    .find((value) => Boolean(value)) ?? null
}

async function main(): Promise<void> {
  await loadEnv()

  const connectionString = resolveConnectionString()
  if (!connectionString) {
    console.error(
      'No Postgres connection string found. Set ZERO_UPSTREAM_DB, DATABASE_URL, or DATABASE_PUBLIC_URL.',
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString })

  try {
    const walLevelResult = await pool.query<{ wal_level: string }>(
      `select current_setting('wal_level') as wal_level`,
    )
    const walLevel = walLevelResult.rows[0]?.wal_level?.trim().toLowerCase() ?? ''

    if (walLevel !== 'logical') {
      console.error(
        `ZERO upstream is not compatible: wal_level=${walLevel || 'unknown'}. Zero requires wal_level=logical.`,
      )
      process.exit(1)
    }

    console.log('ZERO upstream is compatible: wal_level=logical')
  } finally {
    await pool.end().catch(() => undefined)
  }
}

void main()
