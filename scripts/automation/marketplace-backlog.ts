#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type {
  MarketplaceBacklogManifest,
  MarketplaceBacklogStatus,
} from '../../apps/start/src/lib/shared/automation/marketplace-ops'
import { selectMarketplaceBacklogItem } from '../../apps/start/src/lib/shared/automation/marketplace-ops'

const DEFAULT_MANIFEST_PATH = path.resolve(
  process.cwd(),
  'docs/arch3r/automation/marketplace-backlog.json',
)

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv
  const flags: Record<string, string> = {}
  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index]
    if (!current?.startsWith('--')) continue
    const key = current.slice(2)
    const value = rest[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    flags[key] = value
    index += 1
  }
  return { command, flags }
}

function readManifest(manifestPath: string): MarketplaceBacklogManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as MarketplaceBacklogManifest
}

function writeManifest(
  manifestPath: string,
  manifest: MarketplaceBacklogManifest,
) {
  mkdirSync(path.dirname(manifestPath), { recursive: true })
  writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )
}

const { command, flags } = parseArgs(process.argv.slice(2))
const manifestPath = path.resolve(flags.manifest ?? DEFAULT_MANIFEST_PATH)

if (command === 'select') {
  const manifest = readManifest(manifestPath)
  const selection = selectMarketplaceBacklogItem(manifest)
  console.log(JSON.stringify({ selection }, null, 2))
  process.exit(0)
}

if (command === 'set-status') {
  const pluginKey = flags['plugin-key']
  const status = flags.status as MarketplaceBacklogStatus | undefined
  if (!pluginKey || !status) {
    throw new Error('set-status requires --plugin-key and --status')
  }
  if (!['planned', 'in_progress', 'done'].includes(status)) {
    throw new Error(`Unsupported status: ${status}`)
  }

  const manifest = readManifest(manifestPath)
  const items = manifest.items.map((item) => {
    if (item.pluginKey === pluginKey) {
      return { ...item, status }
    }

    /**
     * The daily builder is intentionally single-threaded: only one marketplace
     * lane should remain `in_progress` at a time so the next cron run can
     * deterministically resume the same branch without asking which feature won.
     */
    if (status === 'in_progress' && item.status === 'in_progress') {
      return { ...item, status: 'planned' as const }
    }

    return item
  })
  writeManifest(manifestPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
    items,
  })
  console.log(
    JSON.stringify(
      {
        ok: true,
        pluginKey,
        status,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

throw new Error(`Unsupported command: ${command ?? '<missing>'}`)
